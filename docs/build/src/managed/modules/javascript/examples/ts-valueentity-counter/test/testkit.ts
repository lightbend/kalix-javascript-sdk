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
  Message,
  Metadata,
  Reply,
  Serializable,
  ValueEntity
} from "@kalix-io/kalix-javascript-sdk";

export namespace MockValueEntity {
  type Infer<Entity> = Entity extends ValueEntity<infer State, infer CommandHandlers>
    ? { State: State; CommandHandlers: CommandHandlers }
    : never;

  export type StateType<Entity> = Infer<Entity>["State"];
  export type CommandHandlersType<Entity> = Infer<Entity>["CommandHandlers"];

  export type CommandNames<Entity> = keyof CommandHandlersType<Entity>;
}

/**
 * Mocks the behaviour of a single Kalix Value entity.
 *
 * Handles any commands, internally maintaining the state.
 *
 * NOTE: Entity IDs are not handled, so all commands are assumed to refer to a single entity.
 */
export class MockValueEntity<Entity extends ValueEntity> {
  entity: Entity;
  entityId: string;

  state: MockValueEntity.StateType<Entity>;
  error?: string = undefined;

  private grpcService: any;

  constructor(entity: Entity, entityId: string) {
    this.entity = entity;
    this.entityId = entityId;
    this.state = entity.initial(entityId);
    this.grpcService = entity.serviceName
      .split(".")
      .reduce((obj: any, part: any) => obj[part], (entity as any).grpc).service;
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
    commandName: MockValueEntity.CommandNames<Entity>,
    command: any,
    ctx = new MockValueEntityCommandContext<MockValueEntity.StateType<Entity>>()
  ) {
    const handler = (this.entity.commandHandlers as MockValueEntity.CommandHandlersType<Entity>)[
      commandName
    ];
    const grpcMethod = this.grpcService[commandName];

    const request = grpcMethod.requestDeserialize(grpcMethod.requestSerialize(command));

    const reply = handler(request, this.state, ctx);
    const message = reply instanceof Reply ? reply.getMessage() : reply;

    if (ctx.delete) {
      this.state = this.entity.initial(this.entityId);
    } else if (ctx.updatedState) {
      this.state = ctx.updatedState;
    }

    if (reply instanceof Reply && reply.getFailure())
      this.error = reply.getFailure().getDescription();
    else this.error = ctx.error;

    return grpcMethod.responseDeserialize(grpcMethod.responseSerialize(message));
  }
}

export namespace MockCommandContext {
  export interface Effect {
    method: EffectMethod;
    message: object;
    synchronous?: boolean;
    metadata?: Metadata;
  }

  export type ForwardHandler = (method: EffectMethod, message: Message, metadata: Metadata) => void;
}

/**
 * Generic mock CommandContext for any Kalix entity.
 */
export class MockCommandContext implements CommandContext {
  metadata: Metadata;

  effects: Array<MockCommandContext.Effect> = [];

  forward: MockCommandContext.ForwardHandler = () => {};

  thenForward: MockCommandContext.ForwardHandler = (method, message, metadata) =>
    this.forward(method, message, metadata);

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

  effect(method: EffectMethod, message: object, synchronous?: boolean, metadata?: Metadata): void {
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
 * By default, calls to {@link MockValueEntity.handleCommand} will
 * construct their own instance of this class, however for making assertions on
 * forwarding or emmitted effects you may provide your own.
 */
export class MockValueEntityCommandContext<State extends Serializable = any>
  extends MockCommandContext
  implements ValueEntity.CommandContext<State>
{
  entityId: string;
  commandId: Long;
  replyMetadata: Metadata;

  updatedState?: State = undefined;
  delete = false;

  updateState(state: State) {
    this.updatedState = state;
  }

  deleteState() {
    this.delete = true;
  }
}
