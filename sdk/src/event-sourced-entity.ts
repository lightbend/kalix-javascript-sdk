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
import EventSourcedEntityServices from './event-sourced-entity-support';
import { Entity, EntityOptions, ServiceMap } from './kalix';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { Serializable } from './serializable';
import { CommandContext, EntityContext, UserReply } from './command';

const eventSourcedEntityServices = new EventSourcedEntityServices();

/** @public */
export namespace EventSourcedEntity {
  /**
   * Context for an event sourced command.
   */
  export interface EventSourcedEntityCommandContext
    extends CommandContext,
      EntityContext {
    /**
     * Persist an event.
     *
     * @remarks
     *
     * The event won't be persisted until the reply is sent to the proxy, but will be persisted
     * before the reply is sent back to the client.
     *
     * @param event - The event to emit
     */
    emit(event: Serializable): void;
  }

  /**
   * An event sourced entity command handler.
   *
   * @param command - The command message, this will be of the type of the gRPC service call input type
   * @param state - The entity state
   * @param context - The command context
   * @returns The message to reply with, it must match the gRPC service call output type for this
   *          command, or if a Reply is returned, contain an object that matches the output type
   */
  export type CommandHandler = (
    command: any,
    state: any,
    context: EventSourcedEntityCommandContext,
  ) => Promise<UserReply> | UserReply;

  /**
   * An event sourced entity event handler.
   *
   * @param event - The event
   * @param state - The entity state
   * @returns The new entity state
   */
  export type EventHandler = (event: any, state: any) => Serializable;

  /**
   * An event sourced entity behavior.
   */
  export type Behavior = {
    /**
     * The command handlers.
     *
     * The names of the properties must match the names of the service calls specified in the gRPC
     * descriptor for this event sourced entities service.
     */
    commandHandlers: { [commandName: string]: CommandHandler };

    /**
     * The event handlers.
     *
     * The names of the properties must match the short names of the events.
     */
    eventHandlers: { [eventName: string]: EventHandler };
  };

  /**
   * An event sourced entity behavior callback.
   *
   * This callback takes the current entity state, and returns a set of handlers to handle commands
   * and events for it.
   *
   * @param state - The entity state
   * @returns The new entity state
   */
  export type BehaviorCallback = (state: Serializable) => Behavior;

  /**
   * Initial state callback.
   *
   * This is invoked if the entity is started with no snapshot.
   *
   * @param entityId - The entity id
   * @returns The entity state
   */
  export type InitialCallback = (entityId: string) => Serializable;

  /**
   * Options for an event sourced entity.
   */
  export interface Options
    extends Omit<EntityOptions, 'replicatedWriteConsistency'> {
    /**
     * A snapshot will be persisted every time this many events are emitted.
     *
     * @remarks
     *
     * It is strongly recommended to not disable snapshotting unless it is known that event sourced
     * entities will never have more than 100 events (in which case the default will anyway not
     * trigger any snapshots).
     *
     * @defaultValue `100`
     */
    snapshotEvery?: number;

    /**
     * Whether serialization of primitives should be supported when serializing events and
     * snapshots.
     *
     * @defaultValue `false`
     */
    serializeAllowPrimitives?: boolean;

    /**
     * Whether serialization should fallback to using JSON if an event or snapshot can't be
     * serialized as a protobuf.
     *
     * @defaultValue `false`
     */
    serializeFallbackToJson?: boolean;
  }
}

const defaultOptions = {
  snapshotEvery: 100,
  includeDirs: ['.'],
  serializeAllowPrimitives: false,
  serializeFallbackToJson: false,
  forwardHeaders: [],
  entityPassivationStrategy: {},
};

/**
 * Event Sourced Entity.
 *
 * @public
 */
export class EventSourcedEntity implements Entity {
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly options: Required<EventSourcedEntity.Options>;
  readonly clients: GrpcClientLookup;

  /** @internal */ readonly root: protobuf.Root;
  /** @internal */ readonly grpc: grpc.GrpcObject;

  /**
   * The initial state callback.
   */
  initial?: EventSourcedEntity.InitialCallback;

  /**
   * The behavior callback.
   */
  behavior?: EventSourcedEntity.BehaviorCallback;

  /**
   * Create a new event sourced entity.
   *
   * @remarks
   *
   * Note that the `entityType` will be prefixed onto the `entityId` when storing the events for
   * this entity. Be aware that the chosen name must be stable through the entity lifecycle.  Never
   * change it after deploying a service that stored data of this type.
   *
   * @param desc - A descriptor or list of descriptors to parse, containing the service to serve
   * @param serviceName - The fully qualified name of the service that provides this entities interface
   * @param entityType - The entity type name for all event source entities of this type
   * @param options - The options for this event sourced entity
   */
  constructor(
    desc: string | string[],
    serviceName: string,
    entityType: string,
    options?: EventSourcedEntity.Options,
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
  }

  /** @internal */
  componentType(): string {
    return eventSourcedEntityServices.componentType();
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
  setInitial(callback: EventSourcedEntity.InitialCallback): EventSourcedEntity {
    this.initial = callback;
    return this;
  }

  /**
   * Set the behavior callback.
   *
   * @param callback - The behavior callback
   * @returns This entity
   */
  setBehavior(
    callback: EventSourcedEntity.BehaviorCallback,
  ): EventSourcedEntity {
    this.behavior = callback;
    return this;
  }

  /** @internal */
  register(allComponents: ServiceMap): EventSourcedEntityServices {
    eventSourcedEntityServices.addService(this, allComponents);
    return eventSourcedEntityServices;
  }
}
