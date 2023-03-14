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

import { ContextFailure } from './context-failure';
import { EffectMethod } from './effect';
import { GrpcStatus } from './grpc-status';
import { Metadata } from './metadata';
import { Reply } from './reply';
import * as protocol from '../types/protocol/commands';

/**
 * A message object.
 *
 * @public
 */
export type Message = { [key: string]: any };

/** @internal */
export interface InternalContext {
  commandId: Long;
  active: boolean;
  context: EntityContext & CommandContext;
  reply?: protocol.EntityReply;
  replyMetadata: Metadata;
  forward?: protocol.Forward;
  effects: protocol.SideEffect[];
  error?: ContextFailure;
  ensureActive(): void;
  commandDebug(msg: string, ...args: any[]): void;
}

/**
 * Context for an entity.
 *
 * @public
 */
export interface EntityContext {
  /**
   * The id of the entity that the command is for.
   */
  entityId: string;

  /**
   * The id of the command.
   */
  commandId: Long;

  /**
   * The metadata to send with a reply.
   */
  replyMetadata: Metadata;
}

/**
 * Effect context.
 *
 * @public
 */
export interface EffectContext {
  /**
   * The metadata associated with the command.
   */
  readonly metadata: Metadata;

  /**
   * DEPRECATED. Emit an effect after processing this command.
   *
   * @deprecated Use {@link Reply.addEffect} instead.
   *
   * @param method - The entity service method to invoke
   * @param message - The message to send to that service
   * @param synchronous - Whether the effect should be execute synchronously or not
   * @param metadata - Metadata to send with the effect
   * @param internalCall - For internal calls to this deprecated function
   */
  effect(
    method: EffectMethod,
    message: Message,
    synchronous?: boolean,
    metadata?: Metadata,
    internalCall?: boolean,
  ): void;

  /**
   * Fail handling this command.
   *
   * @remarks
   *
   * An alternative to using this is to return a failed Reply created with {@link replies.failure}.
   *
   * @param msg - The failure message
   * @param grpcStatus - The grpcStatus
   * @throws An error that captures the failure message. Note that even if you
   *         catch the error thrown by this method, the command will still be
   *         failed with the given message.
   */
  fail(msg: string, grpcStatus?: GrpcStatus): void;
}

/**
 * Context for a command.
 *
 * @public
 */
export interface CommandContext extends EffectContext {
  // FIXME: remove for version 0.8 (https://github.com/lightbend/kalix-proxy/issues/410)
  /**
   * DEPRECATED. Forward this command to another service component call.
   *
   * @deprecated Use {@link replies.forward} instead.
   *
   * @param method - The service component method to invoke
   * @param message - The message to send to that service component
   * @param metadata - Metadata to send with the forward
   */
  thenForward(
    method: EffectMethod,
    message: Message,
    metadata?: Metadata,
  ): void;

  /**
   * DEPRECATED. Forward this command to another service component call.
   *
   * @deprecated Use {@link replies.forward} instead.
   *
   * @param method - The service component method to invoke
   * @param message - The message to send to that service component
   * @param metadata - Metadata to send with the forward
   * @param internalCall - For internal calls to this deprecated function
   */
  forward(
    method: EffectMethod,
    message: Message,
    metadata?: Metadata,
    internalCall?: boolean,
  ): void;
}

/**
 * Context for an entity command.
 *
 * @public
 */
export type EntityCommandContext = EntityContext & CommandContext;

/**
 * Command reply types.
 *
 * @public
 */
export type CommandReply<Message extends object = object> =
  | Reply<Message>
  | Message
  | undefined
  | void;

/** @internal */
export interface CommandHandler {
  (message: protobuf.Message, context: InternalContext): Promise<CommandReply>;
}

/** @internal */
export interface CommandHandlerFactory {
  (commandName: string): CommandHandler | null;
}
