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

import { ContextFailure } from './context-failure';
import { EffectMethod } from './effect';
import { GrpcStatus } from './kalix';
import { Metadata } from './metadata';
import { Reply } from './reply';
import * as proto from '../proto/protobuf-bundle';

namespace protocol {
  export type EntityCommand = proto.kalix.component.entity.ICommand;
  export type EntityReply =
    | proto.kalix.component.valueentity.IValueEntityReply
    | proto.kalix.component.eventsourcedentity.IEventSourcedReply
    | proto.kalix.component.replicatedentity.IReplicatedEntityReply;
  export type Forward = proto.kalix.component.IForward;
  export type SideEffect = proto.kalix.component.ISideEffect;
  export type Failure = proto.kalix.component.IFailure;
}

export type Message = { [key: string]: any };

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

export interface EntityContext {
  entityId: string;
  commandId: Long;
  replyMetadata: Metadata;
}

export interface EffectContext {
  readonly metadata: Metadata;

  effect(
    method: EffectMethod,
    message: Message,
    synchronous?: boolean,
    metadata?: Metadata,
    internalCall?: boolean,
  ): void;

  fail(msg: string, grpcStatus?: GrpcStatus): void;
}

export interface CommandContext extends EffectContext {
  // FIXME: remove for version 0.8 (https://github.com/lightbend/kalix-proxy/issues/410)
  thenForward(
    method: EffectMethod,
    message: Message,
    metadata?: Metadata,
  ): void;

  forward(
    method: EffectMethod,
    message: Message,
    metadata?: Metadata,
    internalCall?: boolean,
  ): void;
}

export type UserReply = Reply | Message | undefined;

export interface CommandHandler {
  (message: protobuf.Message, context: InternalContext): Promise<UserReply>;
}

export interface CommandHandlerFactory {
  (commandName: string): CommandHandler | null;
}
