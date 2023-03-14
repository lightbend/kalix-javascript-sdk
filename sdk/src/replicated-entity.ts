/*
 * Copyright 2021-2023 Lightbend Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as protobufHelper from './protobuf-helper';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ReplicatedData } from './replicated-data';
import { ReplicatedEntityServices } from './replicated-entity-support';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import {
  Entity,
  EntityOptions,
  PreStartSettings,
  ReplicatedWriteConsistency,
  ServiceMap,
} from './kalix';
import { EntityCommandContext, CommandReply } from './command';

export { ReplicatedData };

export {
  ReplicatedCounter,
  ReplicatedSet,
  ReplicatedRegister,
  ReplicatedMap,
  ReplicatedCounterMap,
  ReplicatedRegisterMap,
  ReplicatedMultiMap,
  Vote,
  Clock,
  Clocks,
} from './replicated-data';

const replicatedEntityServices = new ReplicatedEntityServices();

// re-export under old name
/**
 * Context for a Replicated Entity command handler.
 *
 * @typeParam State - the type of {@link ReplicatedData} state
 *
 * @public
 */
export type ReplicatedEntityCommandContext<
  State extends ReplicatedData = ReplicatedData,
> = ReplicatedEntity.CommandContext<State>;

// re-export under old name
/**
 * Context that allows managing a Replicated Entity's state.
 *
 * @typeParam State - the type of {@link ReplicatedData} state
 *
 * @public
 */
export type StateManagementContext<
  State extends ReplicatedData = ReplicatedData,
> = ReplicatedEntity.StateContext<State>;

/** @public */
export namespace ReplicatedEntity {
  /**
   * Context for a Replicated Entity command handler.
   *
   * @typeParam State - the type of {@link ReplicatedData} state
   */
  export interface CommandContext<State extends ReplicatedData = ReplicatedData>
    extends StateContext<State>,
      EntityCommandContext {}

  /**
   * Context that allows managing a Replicated Entity's state.
   *
   * @typeParam State - the type of {@link ReplicatedData} state
   */
  export interface StateContext<State extends ReplicatedData = ReplicatedData> {
    /**
     * The Replicated Data state for a Replicated Entity.
     *
     * @remarks
     * It may only be set once, if it's already set, an error will be thrown.
     */
    state: State;

    /**
     * Delete this Replicated Entity.
     */
    delete(): void;
  }

  /**
   * A command handler callback.
   *
   * @typeParam State - the type of {@link ReplicatedData} state
   * @param command - The command message, this will be of the type of the gRPC service call input type
   * @param context - The command context
   * @returns The message to reply with, which must match the gRPC service call output type for this command.
   */
  export type CommandHandler<State extends ReplicatedData = ReplicatedData> = (
    command: any,
    context: CommandContext<State>,
  ) => Promise<CommandReply> | CommandReply;

  /**
   * Replicated entity command handlers.
   *
   * @typeParam State - the type of {@link ReplicatedData} state
   */
  export type CommandHandlers<State extends ReplicatedData = ReplicatedData> = {
    [commandName: string]: CommandHandler<State>;
  };

  /**
   * A state set handler callback.
   *
   * @remarks
   *
   * This is invoked whenever a new state is set on the Replicated Entity, to allow the state to be
   * enriched with domain specific properties and methods. This may be due to the state being set
   * explicitly from a command handler on the command context, or implicitly as the default value,
   * or implicitly when a new state is received from the proxy.
   *
   * @typeParam State - the type of {@link ReplicatedData} state
   * @param state - The Replicated Data state that was set
   * @param entityId - The id of the entity
   */
  export type OnStateSetCallback<
    State extends ReplicatedData = ReplicatedData,
  > = (state: State, entityId: string) => void;

  /**
   * A callback that is invoked to create a default value if the Kalix proxy doesn't send an existing one.
   *
   * @typeParam State - the type of {@link ReplicatedData} state
   * @param entityId - The id of the entity
   * @returns The default value to use for this entity
   */
  export type DefaultValueCallback<
    State extends ReplicatedData = ReplicatedData,
  > = (entityId: string) => State | null;

  /**
   * Options for creating a Replicated Entity.
   */
  export interface Options extends EntityOptions {}
}

const defaultOptions = {
  includeDirs: ['.'],
  forwardHeaders: [],
  entityPassivationStrategy: {},
  replicatedWriteConsistency: ReplicatedWriteConsistency.LOCAL,
};

/**
 * Replicated Entity.
 *
 * @typeParam State - the type of {@link ReplicatedData} state
 *
 * @public
 */
export class ReplicatedEntity<State extends ReplicatedData = ReplicatedData>
  implements Entity
{
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly options: Required<ReplicatedEntity.Options>;
  clients?: GrpcClientLookup;

  /** @internal */ readonly root: protobuf.Root;
  /** @internal */ readonly grpc: grpc.GrpcObject;

  /**
   * The command handlers.
   *
   * @remarks
   * The names of the properties must match the names of the service calls specified in the gRPC descriptor for this
   * Replicated Entity service.
   */
  commandHandlers: ReplicatedEntity.CommandHandlers<State>;

  /**
   * A callback that is invoked whenever the Replicated Data state is set for this Replicated Entity.
   *
   * @remarks
   *
   * This is invoked whenever a new Replicated Data state is set on the Replicated Entity, to allow the state to be
   * enriched with domain specific properties and methods. This may be due to the state being set explicitly from a
   * command handler on the command context, or implicitly as the default value, or implicitly when a new state is
   * received from the proxy.
   */
  onStateSet: ReplicatedEntity.OnStateSetCallback<State>;

  /**
   * A callback that is invoked to create a default value if the Kalix proxy doesn't send an existing one.
   */
  defaultValue: ReplicatedEntity.DefaultValueCallback<State>;

  /**
   * Create a Replicated Entity.
   *
   * @param desc - The file name of a protobuf descriptor or set of descriptors containing the Replicated Entity service
   * @param serviceName - The fully qualified name of the gRPC service that this Replicated Entity implements
   * @param entityType - The entity type name, used to namespace entities of different Replicated Data types in the same service
   * @param options - The options for this entity
   */
  constructor(
    desc: string | string[],
    serviceName: string,
    entityType: string,
    options?: ReplicatedEntity.Options,
  ) {
    this.options = {
      ...defaultOptions,
      ...{ entityType: entityType },
      ...options,
    };

    if (!entityType) throw Error('EntityType must contain a name');

    const allIncludeDirs = protobufHelper.moduleIncludeDirs.concat(
      this.options.includeDirs,
    );

    this.root = protobufHelper.loadSync(desc, allIncludeDirs);

    this.serviceName = serviceName;

    // Eagerly lookup the service to fail early
    this.service = this.root.lookupService(serviceName);

    const packageDefinition = protoLoader.loadSync(desc, {
      includeDirs: allIncludeDirs,
    });

    this.grpc = grpc.loadPackageDefinition(packageDefinition);

    this.clients = undefined;

    this.commandHandlers = {};

    this.onStateSet = (_state, _entityId) => undefined;

    this.defaultValue = (_entityId) => null;
  }

  preStart(settings: PreStartSettings): void {
    this.clients = GrpcUtil.clientCreators(
      this.root,
      this.grpc,
      settings.proxyHostname,
      settings.proxyPort,
      settings.identificationInfo,
    );
  }

  /** @internal */
  componentType(): string {
    return replicatedEntityServices.componentType();
  }

  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  /** @internal */
  register(allComponents: ServiceMap) {
    replicatedEntityServices.addService(this, allComponents);
    return replicatedEntityServices;
  }
}
