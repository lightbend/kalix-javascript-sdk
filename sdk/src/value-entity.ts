/*
 * Copyright 2021 Lightbend Inc.
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
import ValueEntityServices from './value-entity-support';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { Entity, EntityOptions, ServiceMap } from './kalix';
import { Serializable } from './serializable';
import { CommandContext, EntityContext, UserReply } from './command';

const valueEntityServices = new ValueEntityServices();

/** @public */
export namespace ValueEntity {
  /**
   * Context for a value entity command.
   */
  export interface ValueEntityCommandContext
    extends CommandContext,
      EntityContext {
    /**
     * Persist the updated state.
     *
     * @remarks
     *
     * The state won't be persisted until the reply is sent to the proxy. Then, the state will be persisted
     * before the reply is sent back to the client.
     *
     * @param newState - The state to store
     */
    updateState(newState: Serializable): void;

    /**
     * Delete this entity.
     */
    deleteState(): void;
  }

  /**
   * A command handler for one service call to the value entity.
   *
   * @param command - The command message, this will be of the type of the gRPC service call input type
   * @param state - The entity state
   * @param context - The command context
   * @returns The message to reply with, it must match the gRPC service call output type for this
   *          command, or if a Reply is returned, contain an object that matches the output type.
   */
  export type CommandHandler = (
    command: any,
    state: any,
    context: ValueEntityCommandContext,
  ) => Promise<UserReply> | UserReply;

  /**
   * Value entity command handlers.
   *
   * @remarks
   * The names of the properties must match the names of the service calls specified in the gRPC
   * descriptor for this value entities service.
   */
  export type CommandHandlers = {
    [commandName: string]: CommandHandler;
  };

  /**
   * Initial state callback.
   *
   * @remarks
   * This is invoked if the entity is started with no snapshot.
   *
   * @param entityId - The entity id
   * @returns The entity state
   */
  export type InitialCallback = (entityId: string) => Serializable;

  /**
   * Options for a value entity.
   */
  export interface Options
    extends Omit<EntityOptions, 'replicatedWriteConsistency'> {
    /**
     * Whether serialization of primitives should be supported when serializing the state.
     *
     * @defaultValue `false`
     */
    serializeAllowPrimitives?: boolean;

    /**
     * Whether serialization should fallback to using JSON if the state can't be serialized as a protobuf.
     *
     * @defaultValue `false`
     */
    serializeFallbackToJson?: boolean;
  }
}

const defaultOptions = {
  includeDirs: ['.'],
  serializeAllowPrimitives: false,
  serializeFallbackToJson: false,
  forwardHeaders: [],
  entityPassivationStrategy: {},
};

/**
 * Value Entity.
 *
 * @public
 */
export class ValueEntity implements Entity {
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly options: Required<ValueEntity.Options>;
  readonly clients: GrpcClientLookup;

  /** @internal */ readonly root: protobuf.Root;
  /** @internal */ readonly grpc: grpc.GrpcObject;

  /**
   * The initial state callback.
   */
  initial?: ValueEntity.InitialCallback;

  /**
   * The command handlers.
   */
  commandHandlers: ValueEntity.CommandHandlers;

  /**
   * Create a new value entity.
   *
   * @remarks
   * Never change the entityType after deploying a service that stored data of this type.
   *
   * @param desc - A descriptor or list of descriptors to parse, containing the service to serve
   * @param serviceName - The fully qualified name of the service that provides this entities interface
   * @param entityType - The entity type name for all value entities of this type
   * @param options - The options for this entity
   */
  constructor(
    desc: string | string[],
    serviceName: string,
    entityType: string,
    options?: ValueEntity.Options,
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

    this.clients = GrpcUtil.clientCreators(this.root, this.grpc);

    this.commandHandlers = {};
  }

  /** @internal */
  componentType(): string {
    return valueEntityServices.componentType();
  }

  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  /**
   * Set the initial state callback.
   *
   * @param callback - The initial state callback
   * @returns This entity
   */
  setInitial(callback: ValueEntity.InitialCallback): ValueEntity {
    this.initial = callback;
    return this;
  }

  /**
   * Set the command handlers of the entity.
   *
   * @param commandHandlers - The command handler callbacks
   * @returns This entity
   */
  setCommandHandlers(
    commandHandlers: ValueEntity.CommandHandlers,
  ): ValueEntity {
    this.commandHandlers = commandHandlers;
    return this;
  }

  /** @internal */
  register(allComponents: ServiceMap): ValueEntityServices {
    valueEntityServices.addService(this, allComponents);
    return valueEntityServices;
  }
}
