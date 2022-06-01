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

import {
  EventSourcedEntity,
  Metadata,
  Reply,
  Serializable,
} from '@kalix-io/kalix-javascript-sdk';
import { MockCommandContext } from './mock-command';
import * as Long from 'long';

/**
 * Mocks the behaviour of a single Kalix EventSourcedEntity.
 *
 * Handles any commands and events, internally tracking the state and maintaining an event log.
 *
 * @remarks
 * NOTE: Entity IDs are not handled, so all commands are assumed to refer to a single entity.
 *
 * @public
 */
export class MockEventSourcedEntity<Entity extends EventSourcedEntity> {
  entity: Entity;
  entityId: string;

  state?: MockEventSourcedEntity.StateType<Entity>;
  events: Array<MockEventSourcedEntity.EventsType<Entity>> = [];
  error?: string = undefined;

  private grpcService: any;

  constructor(entity: Entity, entityId: string) {
    this.entity = entity;
    this.entityId = entityId;
    this.state = entity.initial ? entity.initial(entityId) : undefined;
    this.grpcService = entity.serviceName
      .split('.')
      .reduce((obj, part) => obj[part], (entity as any).grpc).service;
  }

  /**
   * Handle the provided command, and return the result. Any emitted events are also handled.
   *
   * @param commandName - the command method name (as per the entity proto definition)
   * @param command - the command message
   * @param ctx - override the context object for this handler for advanced behaviour
   * @returns the result of the command
   */
  handleCommand(
    commandName: MockEventSourcedEntity.CommandNames<Entity>,
    command: any,
    ctx = new MockEventSourcedEntity.CommandContext<
      MockEventSourcedEntity.EventsType<Entity>
    >(this.entityId),
  ): any {
    const behavior = this.entity.behavior
      ? this.entity.behavior(this.state)
      : { commandHandlers: {} };
    const handler = (
      behavior.commandHandlers as MockEventSourcedEntity.CommandHandlersType<Entity>
    )[commandName];
    const grpcMethod = this.grpcService[commandName];

    const request = grpcMethod.requestDeserialize(
      grpcMethod.requestSerialize(command),
    );

    const reply = handler(request, this.state, ctx);
    const message = reply instanceof Reply ? reply.getMessage() : reply;

    ctx.events.forEach((event) => this.handleEvent(event));

    if (reply instanceof Reply && reply.getFailure())
      this.error = reply.getFailure()?.getDescription();
    else this.error = ctx.error;

    return message
      ? grpcMethod.responseDeserialize(grpcMethod.responseSerialize(message))
      : undefined;
  }

  /**
   * Handle the provided event, and add it to the event log.
   * @param event - the event payload
   */
  handleEvent(event: MockEventSourcedEntity.EventsType<Entity>): void {
    const behavior = this.entity.behavior
      ? this.entity.behavior(this.state)
      : { eventHandlers: {} };
    const eventName = event.type || event.constructor.name;
    const handler = (
      behavior.eventHandlers as MockEventSourcedEntity.EventHandlersType<Entity>
    )[eventName];
    this.state = handler(event, this.state);
    this.events.push(event);
  }
}

/** @public */
export namespace MockEventSourcedEntity {
  type Infer<Entity> = Entity extends EventSourcedEntity<
    infer State,
    infer Events,
    infer CommandHandlers,
    infer EventHandlers
  >
    ? {
        State: State;
        Events: Events;
        CommandHandlers: CommandHandlers;
        EventHandlers: EventHandlers;
      }
    : never;

  export type StateType<Entity> = Infer<Entity>['State'];
  export type EventsType<Entity> = Infer<Entity>['Events'];
  export type CommandHandlersType<Entity> = Infer<Entity>['CommandHandlers'];
  export type EventHandlersType<Entity> = Infer<Entity>['EventHandlers'];

  export type CommandNames<Entity> = keyof CommandHandlersType<Entity>;
  export type EventNames<Entity> = keyof EventHandlersType<Entity>;

  /**
   * Mocks the behaviour of the command context object within Kalix.
   *
   * By default, calls to {@link MockEventSourcedEntity.handleCommand} will
   * construct their own instance of this class, however for making assertions on
   * forwarding or emitted effects you may provide your own.
   */
  export class CommandContext<Events extends Serializable = any>
    extends MockCommandContext
    implements EventSourcedEntity.CommandContext<Events>
  {
    entityId: string;
    commandId: Long = Long.ZERO;
    replyMetadata: Metadata = new Metadata();

    events: Array<Events> = [];

    constructor(entityId: string) {
      super();
      this.entityId = entityId;
    }

    emit(event: Events) {
      this.events.push(event);
    }
  }
}
