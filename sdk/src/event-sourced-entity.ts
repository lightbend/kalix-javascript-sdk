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
import EventSourcedEntityServices from './event-sourced-entity-support';
import { Entity, EntityOptions, PreStartSettings, ServiceMap } from './kalix';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { Serializable } from './serializable';
import { EntityCommandContext, CommandReply } from './command';

const eventSourcedEntityServices = new EventSourcedEntityServices();

/** @public */
export namespace EventSourcedEntity {
  // re-export under old name
  /**
   * Context for an event sourced command.
   *
   * @typeParam Event - the type of {@link Serializable} events
   */
  export type EventSourcedEntityCommandContext<
    Event extends Serializable = any,
  > = CommandContext<Event>;

  /**
   * Context for an event sourced command.
   *
   * @typeParam Events - the type of all {@link Serializable} events
   */
  export interface CommandContext<Events extends Serializable = any>
    extends EntityCommandContext {
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
    emit(event: Events): void;
  }

  /**
   * An event sourced entity command handler.
   *
   * @typeParam State - the type of {@link Serializable} state
   * @typeParam Events - the type of all {@link Serializable} events
   * @param command - The command message, this will be of the type of the gRPC service call input type
   * @param state - The entity state
   * @param context - The command context
   * @returns The message to reply with, it must match the gRPC service call output type for this
   *          command, or if a Reply is returned, contain an object that matches the output type
   */
  export type CommandHandler<
    State extends Serializable = any,
    Events extends Serializable = any,
  > = (
    command: any,
    state: State,
    context: CommandContext<Events>,
  ) => Promise<CommandReply> | CommandReply;

  /**
   * Event sourced entity command handlers.
   *
   * @remarks
   * The names of the properties must match the names of the service calls specified in the gRPC
   * descriptor for this event sourced entity's service.
   *
   * @typeParam State - the type of {@link Serializable} state
   * @typeParam Events - the type of all {@link Serializable} events
   */
  export type CommandHandlers<
    State extends Serializable = any,
    Events extends Serializable = any,
  > = {
    [commandName: string]: CommandHandler<State, Events>;
  };

  /**
   * An event sourced entity event handler.
   *
   * @typeParam State - the type of {@link Serializable} state
   * @typeParam Events - the type of all {@link Serializable} events
   * @param event - The event
   * @param state - The entity state
   * @returns The new entity state
   */
  export type EventHandler<
    State extends Serializable = any,
    Events extends Serializable = any,
  > =
    // use distributive conditional to convert (possible) union of event types into union of event handlers
    Events extends any ? (event: Events, state: State) => State : never;

  /**
   * Event sourced entity event handlers.
   *
   * @remarks
   * The names of the properties must match the short names of the events.
   *
   * @typeParam State - the type of {@link Serializable} state
   * @typeParam Events - the type of all {@link Serializable} events
   */
  export type EventHandlers<
    State extends Serializable = any,
    Events extends Serializable = any,
  > = {
    [eventName: string]: EventHandler<State, Events>;
  };

  /**
   * An event sourced entity behavior.
   *
   * @typeParam State - the type of {@link Serializable} state
   * @typeParam Events - the type of all {@link Serializable} events
   * @typeParam CommandHandlers - optional type of {@link CommandHandlers}
   * @typeParam EventHandlers - optional type of {@link EventHandlers}
   */
  export type Behavior<
    State extends Serializable = any,
    Events extends Serializable = any,
    CommandHandlers extends EventSourcedEntity.CommandHandlers<
      State,
      Events
    > = EventSourcedEntity.CommandHandlers<State, Events>,
    EventHandlers extends EventSourcedEntity.EventHandlers<
      State,
      Events
    > = EventSourcedEntity.EventHandlers<State, Events>,
  > = {
    /**
     * The command handlers.
     *
     * The names of the properties must match the names of the service calls specified in the gRPC
     * descriptor for this event sourced entity's service.
     */
    commandHandlers: CommandHandlers;

    /**
     * The event handlers.
     *
     * The names of the properties must match the short names of the events.
     */
    eventHandlers: EventHandlers;
  };

  /**
   * An event sourced entity behavior callback.
   *
   * This callback takes the current entity state, and returns a set of handlers to handle commands
   * and events for it.
   *
   * @typeParam State - the type of {@link Serializable} state
   * @typeParam Events - the type of all {@link Serializable} events
   * @typeParam CommandHandlers - optional type of {@link CommandHandlers}
   * @typeParam EventHandlers - optional type of {@link EventHandlers}
   * @param state - The entity state
   * @returns The new entity state
   */
  export type BehaviorCallback<
    State extends Serializable = any,
    Events extends Serializable = any,
    CommandHandlers extends EventSourcedEntity.CommandHandlers<
      State,
      Events
    > = EventSourcedEntity.CommandHandlers<State, Events>,
    EventHandlers extends EventSourcedEntity.EventHandlers<
      State,
      Events
    > = EventSourcedEntity.EventHandlers<State, Events>,
  > = (state: State) => Behavior<State, Events, CommandHandlers, EventHandlers>;

  /**
   * Initial state callback.
   *
   * This is invoked if the entity is started with no snapshot.
   *
   * @typeParam State - the type of {@link Serializable} state
   * @param entityId - The entity id
   * @returns The entity state
   */
  export type InitialCallback<State extends Serializable = any> = (
    entityId: string,
  ) => State;

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
 * @typeParam State - the type of {@link Serializable} state
 * @typeParam Events - the type of all {@link Serializable} events
 * @typeParam CommandHandlers - optional type of CommandHandlers
 * @typeParam EventHandlers - optional type of EventHandlers
 *
 * @public
 */
export class EventSourcedEntity<
  State extends Serializable = any,
  Events extends Serializable = any,
  CommandHandlers extends EventSourcedEntity.CommandHandlers<
    State,
    Events
  > = EventSourcedEntity.CommandHandlers<State, Events>,
  EventHandlers extends EventSourcedEntity.EventHandlers<
    State,
    Events
  > = EventSourcedEntity.EventHandlers<State, Events>,
> implements Entity
{
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly options: Required<EventSourcedEntity.Options>;
  clients?: GrpcClientLookup;

  /** @internal */ readonly root: protobuf.Root;
  /** @internal */ readonly grpc: grpc.GrpcObject;

  /**
   * The initial state callback.
   */
  initial?: EventSourcedEntity.InitialCallback<State>;

  /**
   * The behavior callback.
   */
  behavior?: EventSourcedEntity.BehaviorCallback<
    State,
    Events,
    CommandHandlers,
    EventHandlers
  >;

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

    this.clients = undefined;
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
  setInitial(
    callback: EventSourcedEntity.InitialCallback<State>,
  ): EventSourcedEntity<State, Events, CommandHandlers, EventHandlers> {
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
    callback: EventSourcedEntity.BehaviorCallback<
      State,
      Events,
      CommandHandlers,
      EventHandlers
    >,
  ): EventSourcedEntity<State, Events, CommandHandlers, EventHandlers> {
    this.behavior = callback;
    return this;
  }

  /** @internal */
  register(allComponents: ServiceMap): EventSourcedEntityServices {
    eventSourcedEntityServices.addService(this, allComponents);
    return eventSourcedEntityServices;
  }
}
