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
  CommandContext,
  EffectMethod,
  EventSourcedEntity,
  Message,
  Metadata,
  Reply,
  Serializable
} from "@kalix-io/kalix-javascript-sdk";

export namespace MockEventSourcedEntity {
  type InferTypes<Entity> = Entity extends EventSourcedEntity<
    infer State,
    infer Events,
    infer CommandHandlers,
    infer EventHandlers
  >
    ? [State, Events, CommandHandlers, EventHandlers]
    : never;

  export type StateType<Entity> = InferTypes<Entity>[0];
  export type EventsType<Entity> = InferTypes<Entity>[1];
  export type CommandHandlersType<Entity> = InferTypes<Entity>[2];
  export type EventHandlersType<Entity> = InferTypes<Entity>[3];

  export type CommandNames<Entity> = keyof CommandHandlersType<Entity>;
  export type EventNames<Entity> = keyof EventHandlersType<Entity>;
}

/**
 * Mocks the behaviour of a single Kalix EventSourcedEntity.
 *
 * Handles any commands and events, internally tracking the state and maintaining an event log.
 *
 * NOTE: Entity IDs are not handled, so all commands are assumed to refer to a single entity.
 */
export class MockEventSourcedEntity<Entity extends EventSourcedEntity> {
  entity: Entity;
  entityId: string;

  state: MockEventSourcedEntity.StateType<Entity>;
  events: Array<MockEventSourcedEntity.EventsType<Entity>> = [];
  error?: string = undefined;

  private grpcService: any;

  constructor(entity: Entity, entityId: string) {
    this.entity = entity;
    this.entityId = entityId;
    this.state = entity.initial(entityId);
    this.grpcService = entity.serviceName
      .split(".")
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
    ctx = new MockEventSourcedCommandContext<
      MockEventSourcedEntity.EventsType<Entity>
    >()
  ): any {
    const behaviors = this.entity.behavior(this.state);
    const handler = (
      behaviors.commandHandlers as MockEventSourcedEntity.CommandHandlersType<Entity>
    )[commandName];
    const grpcMethod = this.grpcService[commandName];

    const request = grpcMethod.requestDeserialize(
      grpcMethod.requestSerialize(command)
    );

    const reply = handler(request, this.state, ctx);
    const result = reply instanceof Reply ? reply.getMessage() : reply;

    ctx.events.forEach(event => this.handleEvent(event));

    if (reply instanceof Reply && reply.getFailure())
      this.error = reply.getFailure().getDescription();
    else this.error = ctx.error;

    return grpcMethod.responseDeserialize(grpcMethod.responseSerialize(result));
  }

  /**
   * Handle the provided event, and add it to the event log.
   * @param event - the event payload
   */
  handleEvent(event: MockEventSourcedEntity.EventsType<Entity>): void {
    const behaviors = this.entity.behavior(this.state);
    const handler =
      behaviors.eventHandlers[event.type || event.constructor.name];

    this.state = handler(event, this.state);
    this.events.push(event);
  }
}

export namespace MockCommandContext {
  export interface Effect {
    method: EffectMethod;
    message: object;
    synchronous?: boolean;
    metadata?: Metadata;
  }

  export type ForwardHandler = (
    method: EffectMethod,
    message: Message,
    metadata: Metadata
  ) => void;
}

/**
 * Generic mock CommandContext for any Kalix entity.
 */
export class MockCommandContext implements CommandContext {
  metadata: Metadata;

  effects: Array<MockCommandContext.Effect> = [];

  forward: MockCommandContext.ForwardHandler = () => {};

  thenForward: MockCommandContext.ForwardHandler = (
    method,
    message,
    metadata
  ) => this.forward(method, message, metadata);

  error: string;

  /**
   * Set the `forward` callback for this context.
   * This allows tests handling both failure and success cases for forwarded commands.
   * @param handler - the forward callback to set
   */
  onForward(handler: MockCommandContext.ForwardHandler): void {
    this.forward = handler;
  }

  fail(error: string): void {
    this.error = error;
  }

  effect(
    method: EffectMethod,
    message: object,
    synchronous?: boolean,
    metadata?: Metadata
  ): void {
    this.effects.push({
      method,
      message,
      synchronous,
      metadata
    });
  }
}

/**
 * Mocks the behaviour of the command context object within Kalix.
 *
 * By default, calls to {@link MockEventSourcedEntity.handleCommand} will
 * construct their own instance of this class, however for making assertions on
 * forwarding or emmitted effects you may provide your own.
 */
export class MockEventSourcedCommandContext<Events extends Serializable = any>
  extends MockCommandContext
  implements EventSourcedEntity.CommandContext<Events>
{
  entityId: string;
  commandId: Long;
  replyMetadata: Metadata;

  events: Array<Events> = [];

  emit(event: Events) {
    this.events.push(event);
  }
}
