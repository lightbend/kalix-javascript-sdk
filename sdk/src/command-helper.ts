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

import AnySupport from './protobuf-any';
import {
  CommandHandlerFactory,
  InternalContext,
  Message,
  UserReply,
} from './command';
import { ContextFailure } from './context-failure';
import { EffectMethod } from './effect';
import EffectSerializer from './effect-serializer';
import { GrpcStatus, ServiceMap } from './kalix';
import Long from 'long';
import { Metadata } from './metadata';
import { Reply } from './reply';
import grpc from '@grpc/grpc-js';
import * as proto from '../proto/protobuf-bundle';

namespace protocol {
  export type EntityCommand = proto.kalix.component.entity.ICommand;
  export type EntityStreamOut =
    | proto.kalix.component.valueentity.IValueEntityStreamOut
    | proto.kalix.component.eventsourcedentity.IEventSourcedStreamOut
    | proto.kalix.component.replicatedentity.IReplicatedEntityStreamOut;
  export type Failure = proto.kalix.component.IFailure;
}

/**
 * Creates the base for context objects.
 * @private
 */
class CommandHelper {
  private entityId: string;
  private service: protobuf.Service;
  private streamId: string;
  private call: grpc.ServerDuplexStream<any, any>;
  private handlerFactory: CommandHandlerFactory;
  private effectSerializer: EffectSerializer;
  private debug: debug.Debugger;

  constructor(
    entityId: string,
    service: protobuf.Service,
    streamId: string,
    call: grpc.ServerDuplexStream<any, any>,
    handlerFactory: CommandHandlerFactory,
    allComponents: ServiceMap,
    debug: debug.Debugger,
  ) {
    this.entityId = entityId;
    this.service = service;
    this.streamId = streamId;
    this.call = call;
    this.effectSerializer = new EffectSerializer(allComponents);
    this.debug = debug;
    this.handlerFactory = handlerFactory;
  }

  /**
   * Handle a command.
   *
   * @param command The command to handle.
   * @private
   */
  async handleCommand(command: protocol.EntityCommand): Promise<void> {
    try {
      const reply = await this.handleCommandLogic(command);
      this.call.write(reply);
    } catch (err: any) {
      if (err.failure && err.failure.commandId === command.id) {
        this.call.write(err);
        this.call.end();
      } else {
        console.error(err);
        throw err;
      }
    }
  }

  async handleCommandLogic(
    command: protocol.EntityCommand,
  ): Promise<protocol.EntityStreamOut> {
    const commandId = command.id ? Long.fromValue(command.id) : Long.ZERO;
    const metadata = Metadata.fromProtocol(command.metadata);
    const ctx = this.createContext(commandId, metadata);

    const errorReply = (
      msg: string,
      status: GrpcStatus,
    ): protocol.EntityStreamOut => {
      return {
        failure: {
          commandId: command.id,
          description: msg,
          grpcStatusCode: status,
        },
      };
    };

    if (!command.name) {
      ctx.commandDebug('No command name');
      return errorReply('No command name', GrpcStatus.InvalidArgument);
    } else if (!this.service.methods.hasOwnProperty(command.name)) {
      ctx.commandDebug("Command '%s' unknown", command.name);
      return errorReply(
        'Unknown command named ' + command.name,
        GrpcStatus.Unimplemented,
      );
    } else {
      try {
        const grpcMethod = this.service.methods[command.name];

        // todo maybe reconcile whether the command URL of the Any type matches the gRPC response type
        const payload = command.payload?.value ?? Buffer.alloc(0);
        const message = grpcMethod.resolvedRequestType!.decode(payload);

        const handler = this.handlerFactory(command.name);

        if (handler !== null) {
          const reply = await this.invokeHandlerLogic(
            () => handler(message, ctx),
            ctx,
            grpcMethod,
            'Command',
          );
          return reply;
        } else {
          const msg =
            "No handler registered for command '" + command.name + "'";
          ctx.commandDebug(msg);
          return errorReply(msg, GrpcStatus.Unimplemented);
        }
      } catch (err: any) {
        const error = "Error handling command '" + command.name + "'";
        ctx.commandDebug(error);
        console.error(err);
        throw errorReply(error + ': ' + err, GrpcStatus.Unknown);
      }
    }
  }

  async invoke(
    handler: () => Promise<UserReply>,
    ctx: InternalContext,
  ): Promise<UserReply> {
    ctx.reply = {};
    let userReply: UserReply;
    try {
      userReply = await Promise.resolve(handler());
    } catch (err) {
      if (ctx.error === undefined) {
        // If the error field is defined, then that means we were explicitly told
        // to fail, so we can ignore this thrown error and fail gracefully with a
        // failure message. Otherwise, we rethrow, and handle by closing the connection
        // higher up.
        throw err;
      }
    } finally {
      ctx.active = false;
    }

    return userReply;
  }

  errorReply(
    msg: string | undefined,
    status: GrpcStatus | undefined,
    ctx: InternalContext,
    desc: string,
  ): protocol.EntityStreamOut {
    ctx.commandDebug("%s failed with message '%s'", desc, msg);
    const failure: protocol.Failure = {
      commandId: ctx.commandId,
      description: msg,
    };
    if (status !== undefined) {
      failure.grpcStatusCode = status;
    }
    return {
      reply: {
        commandId: ctx.commandId,
        clientAction: {
          failure: failure,
        },
      },
    };
  }

  async invokeHandlerLogic(
    handler: () => Promise<UserReply>,
    ctx: InternalContext,
    grpcMethod: protobuf.Method,
    desc: string,
  ): Promise<protocol.EntityStreamOut> {
    const userReply = await this.invoke(handler, ctx);

    if (ctx.error !== undefined) {
      return this.errorReply(
        ctx.error.message,
        ctx.error.grpcStatus,
        ctx,
        desc,
      );
    } else if (userReply instanceof Reply) {
      if (userReply.getFailure()) {
        // handle failure with a separate write to make sure we don't write back events etc
        return this.errorReply(
          userReply.getFailure()?.getDescription(),
          userReply.getFailure()?.getStatus(),
          ctx,
          desc,
        );
      } else {
        // effects need to go first to end up in reply
        // note that we amend the ctx.reply to get events etc passed along from the entities
        if (!ctx.reply) ctx.reply = {};
        ctx.reply.commandId = ctx.commandId;
        if (userReply.getEffects()) {
          ctx.reply.sideEffects = userReply
            .getEffects()
            .map((effect) =>
              this.effectSerializer.serializeSideEffect(
                effect.method,
                effect.message,
                effect.synchronous,
                effect.metadata,
              ),
            );
        }
        if (userReply.getMessage()) {
          ctx.reply.clientAction = {
            reply: {
              payload: AnySupport.serialize(
                grpcMethod.resolvedResponseType!.create(userReply.getMessage()),
                false,
                false,
              ),
              metadata: userReply.getMetadata() || null,
            },
          };
          ctx.commandDebug(
            '%s reply with type [%s] with %d side effects.',
            desc,
            ctx.reply.clientAction.reply?.payload?.type_url,
            ctx.effects.length,
          );
        } else if (userReply.getForward()) {
          ctx.reply.clientAction = {
            forward: this.effectSerializer.serializeForward(
              userReply.getForward()?.getMethod() ?? null,
              userReply.getForward()?.getMessage(),
              userReply.getForward()?.getMetadata(),
            ),
          };
          ctx.commandDebug(
            '%s forward to %s with %d side effects.',
            desc,
            userReply.getForward()?.getMethod(),
            ctx.effects.length,
          );
        } else {
          // empty reply
          // FIXME should this be Protobuf Empty rather than no reply at all?
          ctx.commandDebug(
            '%s no reply with %d side effects.',
            desc,
            ctx.effects.length,
          );
          ctx.reply.clientAction = {
            reply: {
              payload: AnySupport.serialize(
                grpcMethod.resolvedResponseType!.create({}),
                false,
                false,
              ),
              metadata: userReply.getMetadata() || null,
            },
          };
        }

        return { reply: ctx.reply };
      }
    } else {
      if (!ctx.reply) ctx.reply = {};
      ctx.reply.commandId = ctx.commandId;
      ctx.reply.sideEffects = ctx.effects;

      if (ctx.forward !== undefined) {
        ctx.reply.clientAction = {
          forward: ctx.forward,
        };
        ctx.commandDebug(
          '%s forward to %s.%s with %d side effects.',
          desc,
          ctx.forward?.serviceName,
          ctx.forward?.commandName,
          ctx.effects.length,
        );
      } else if (userReply !== undefined) {
        ctx.reply.clientAction = {
          reply: {
            payload: AnySupport.serialize(
              grpcMethod.resolvedResponseType!.create(userReply),
              false,
              false,
            ),
            metadata: ctx.replyMetadata.entries.length
              ? { entries: ctx.replyMetadata.entries }
              : null,
          },
        };
        ctx.commandDebug(
          '%s reply with type [%s] with %d side effects.',
          desc,
          ctx.reply.clientAction.reply?.payload?.type_url,
          ctx.effects.length,
        );
      } else {
        ctx.commandDebug(
          '%s no reply with %d side effects.',
          desc,
          ctx.effects.length,
        );
      }

      return { reply: ctx.reply };
    }
  }

  commandDebug(msg: string, ...args: any[]): void {
    this.debug(
      '%s [%s] (%s) - ' + msg,
      ...[this.streamId, this.entityId].concat(args),
    );
  }

  // This creates the context. Note that the context has two levels, first is the internal implementation context, this
  // has everything the ReplicatedEntity and EventSourcedEntity support needs to do its stuff, it's where effects and
  // metadata are recorded, etc. The second is the user facing context, which is a property on the internal context
  // called "context".
  createContext(commandId: Long, metadata: Metadata) {
    const accessor: InternalContext = {
      commandId: commandId,
      active: true,
      effects: [],
      replyMetadata: new Metadata(),

      ensureActive: () => {
        if (!accessor.active) {
          throw new Error('Command context no longer active!');
        }
      },

      commandDebug: (msg: string, ...args: any[]) => {
        this.commandDebug(msg, ...[commandId].concat(args));
      },
    };

    accessor.context = {
      entityId: this.entityId,
      commandId: commandId,
      metadata: metadata,
      replyMetadata: accessor.replyMetadata,

      effect: (
        method: EffectMethod,
        message: Message,
        synchronous = false,
        metadata?: Metadata,
        internalCall?: boolean,
      ): void => {
        accessor.ensureActive();
        if (!internalCall)
          console.warn(
            "WARNING: Command context 'effect' is deprecated. Please use 'Reply.addEffect' instead.",
          );
        accessor.effects.push(
          this.effectSerializer.serializeSideEffect(
            method,
            message,
            synchronous,
            metadata,
          ),
        );
      },

      // FIXME: remove for version 0.8 (https://github.com/lightbend/kalix-proxy/issues/410)
      thenForward: (
        method: EffectMethod,
        message: Message,
        metadata?: Metadata,
      ): void => {
        accessor.context?.forward(method, message, metadata);
      },

      forward: (
        method: EffectMethod,
        message: Message,
        metadata?: Metadata,
        internalCall?: boolean,
      ): void => {
        accessor.ensureActive();
        if (!internalCall)
          console.warn(
            "WARNING: Command context 'forward' is deprecated. Please use 'ReplyFactory.forward' instead.",
          );
        accessor.forward = this.effectSerializer.serializeForward(
          method,
          message,
          metadata,
        );
      },

      fail: (msg: string, grpcStatus?: GrpcStatus): never => {
        accessor.ensureActive();
        // We set it here to ensure that even if the user catches the error, for
        // whatever reason, we will still fail as instructed.
        accessor.error = new ContextFailure(msg, grpcStatus);
        // Then we throw, to end processing of the command.
        throw accessor.error;
      },
    };
    return accessor;
  }
}

export = CommandHelper;
