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

const AnySupport = require('./protobuf-any');
const EffectSerializer = require('./effect-serializer');
const { ContextFailure } = require('./context-failure');
const { Metadata } = require('./metadata');
const { Reply } = require('./reply');

/**
 * Creates the base for context objects.
 * @private
 */
class CommandHelper {
  constructor(
    entityId,
    service,
    streamId,
    call,
    handlerFactory,
    allComponents,
    debug,
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
  async handleCommand(command) {
    try {
      const reply = await this.handleCommandLogic(command);
      this.call.write(reply);
    } catch (err) {
      if (err.failure && err.failure.commandId === command.id) {
        this.call.write(err);
        this.call.end();
      } else {
        console.error(err);
        throw err;
      }
    }
  }

  async handleCommandLogic(command) {
    let metadata = new Metadata([]);
    if (command.metadata && command.metadata.entries) {
      metadata = new Metadata(command.metadata.entries);
    }

    const ctx = this.createContext(command.id, metadata);

    const errorReply = (msg, status) => {
      return {
        failure: {
          commandId: command.id,
          description: msg,
          grpcStatusCode: status,
        },
      };
    };

    if (!this.service.methods.hasOwnProperty(command.name)) {
      ctx.commandDebug("Command '%s' unknown", command.name);
      return errorReply(
        'Unknown command named ' + command.name,
        12 /* unimplemented */,
      );
    } else {
      try {
        const grpcMethod = this.service.methods[command.name];

        // todo maybe reconcile whether the command URL of the Any type matches the gRPC response type
        let commandBuffer = command.payload.value;
        if (typeof commandBuffer === 'undefined') {
          commandBuffer = new Buffer(0);
        }
        const deserCommand =
          grpcMethod.resolvedRequestType.decode(commandBuffer);

        const handler = this.handlerFactory(command.name, grpcMethod);

        if (handler !== null) {
          ctx.streamed = command.streamed;

          const reply = await this.invokeHandlerLogic(
            () => handler(deserCommand, ctx),
            ctx,
            grpcMethod,
            'Command',
          );

          if (reply && reply.reply) {
            return reply;
          } else {
            return { reply: reply };
          }
        } else {
          const msg =
            "No handler registered for command '" + command.name + "'";
          ctx.commandDebug(msg);
          return errorReply(msg, 12 /* unimplemented */);
        }
      } catch (err) {
        const error = "Error handling command '" + command.name + "'";
        ctx.commandDebug(error);
        console.error(err);

        throw errorReply(error + ': ' + err, 2 /* unknown */);
      }
    }
  }

  async invoke(handler, ctx) {
    ctx.reply = {};
    let userReply = null;
    try {
      userReply = await Promise.resolve(handler());
    } catch (err) {
      if (ctx.error === null) {
        // If the error field isn't null, then that means we were explicitly told
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

  errorReply(msg, status, ctx, desc) {
    ctx.commandDebug("%s failed with message '%s'", desc, msg);
    const failure = {
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

  async invokeHandlerLogic(handler, ctx, grpcMethod, desc) {
    const userReply = await this.invoke(handler, ctx);

    if (ctx.error !== null) {
      return this.errorReply(
        ctx.error.message,
        ctx.error.grpcStatus,
        ctx,
        desc,
      );
    } else if (userReply instanceof Reply) {
      if (userReply.failure) {
        // handle failure with a separate write to make sure we don't write back events etc
        return this.errorReply(
          userReply.failure.description,
          userReply.failure.status,
          ctx,
          desc,
        );
      } else {
        // effects need to go first to end up in reply
        // note that we amend the ctx.reply to get events etc passed along from the entities
        ctx.reply.commandId = ctx.commandId;
        if (userReply.effects) {
          ctx.reply.sideEffects = userReply.effects.map((effect) =>
            this.effectSerializer.serializeSideEffect(
              effect.method,
              effect.message,
              effect.synchronous,
              effect.metadata,
            ),
          );
        }
        if (userReply.message) {
          ctx.reply.clientAction = {
            reply: {
              payload: AnySupport.serialize(
                grpcMethod.resolvedResponseType.create(userReply.message),
                false,
                false,
              ),
              metadata: userReply.metadata || null,
            },
          };
          ctx.commandDebug(
            '%s reply with type [%s] with %d side effects.',
            desc,
            ctx.reply.clientAction.reply.payload.type_url,
            ctx.effects.length,
          );
        } else if (userReply.forward) {
          ctx.reply.clientAction = {
            forward: this.effectSerializer.serializeEffect(
              userReply.forward.method,
              userReply.forward.message,
              userReply.forward.metadata,
            ),
          };
          ctx.commandDebug(
            '%s forward to %s with %d side effects.',
            desc,
            userReply.forward.method,
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
                grpcMethod.resolvedResponseType.create({}),
                false,
                false,
              ),
              metadata: userReply.metadata || null,
            },
          };
        }

        return ctx.reply;
      }
    } else {
      ctx.reply.commandId = ctx.commandId;
      ctx.reply.sideEffects = ctx.effects;

      if (ctx.forward !== null) {
        ctx.reply.clientAction = {
          forward: ctx.forward,
        };
        ctx.commandDebug(
          '%s forward to %s.%s with %d side effects.',
          desc,
          ctx.forward.serviceName,
          ctx.forward.commandName,
          ctx.effects.length,
        );
      } else if (userReply !== undefined) {
        ctx.reply.clientAction = {
          reply: {
            payload: AnySupport.serialize(
              grpcMethod.resolvedResponseType.create(userReply),
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
          ctx.reply.clientAction.reply.payload.type_url,
          ctx.effects.length,
        );
      } else {
        ctx.commandDebug(
          '%s no reply with %d side effects.',
          desc,
          ctx.effects.length,
        );
      }

      return ctx.reply;
    }
  }

  commandDebug(msg, ...args) {
    this.debug(
      '%s [%s] (%s) - ' + msg,
      ...[this.streamId, this.entityId].concat(args),
    );
  }

  // This creates the context. Note that the context has two levels, first is the internal implementation context, this
  // has everything the ReplicatedEntity and EventSourcedEntity support needs to do its stuff, it's where effects and
  // metadata are recorded, etc. The second is the user facing context, which is a property on the internal context
  // called "context".
  createContext(commandId, metadata) {
    const accessor = {};

    accessor.commandDebug = (msg, ...args) => {
      this.commandDebug(msg, ...[commandId].concat(args));
    };

    accessor.commandId = commandId;
    accessor.effects = [];
    accessor.active = true;
    accessor.ensureActive = () => {
      if (!accessor.active) {
        throw new Error('Command context no longer active!');
      }
    };
    accessor.error = null;
    accessor.forward = null;
    accessor.replyMetadata = new Metadata([]);

    /**
     * Context for an entity.
     *
     * @interface module:kalix.EntityContext
     * @property {string} entityId The id of the entity that the command is for.
     * @property {Long} commandId The id of the command.
     * @property {module:kalix.Metadata} replyMetadata The metadata to send with a reply.
     */

    /**
     * Effect context.
     *
     * @interface module:kalix.EffectContext
     * @property {module:kalix.Metadata} metadata The metadata associated with the command.
     */

    /**
     * Context for a command.
     *
     * @interface module:kalix.CommandContext
     * @extends module:kalix.EffectContext
     */
    accessor.context = {
      /**
       * @name module:kalix.EntityContext#entityId
       * @type {string}
       */
      entityId: this.entityId,
      /**
       * @name module:kalix.EntityContext#commandId
       * @type {Long}
       */
      commandId: commandId,
      /**
       * @name module:kalix.EffectContext#metadata
       * @type {module:kalix.Metadata}
       */
      metadata: metadata,
      /**
       * @name module:kalix.EntityContext#replyMetadata
       * @type {module:kalix.Metadata}
       */
      replyMetadata: accessor.replyMetadata,

      /**
       * DEPRECATED. Emit an effect after processing this command.
       *
       * @function module:kalix.EffectContext#effect
       * @param {any} method The entity service method to invoke.
       * @param {object} message The message to send to that service.
       * @param {boolean} [synchronous] Whether the effect should be execute synchronously or not.
       * @param {module:kalix.Metadata} [metadata] Metadata to send with the effect.
       * @param {boolean} [internalCall] For internal calls to this deprecated function.
       */
      effect: (
        method,
        message,
        synchronous = false,
        metadata,
        internalCall,
      ) => {
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

      // FIXME: remove for version 0.8 (https://github.com/lightbend/akkaserverless-framework/issues/410)
      /**
       * DEPRECATED. Forward this command to another service component call.
       *
       * @deprecated Since version 0.7. Will be deleted in version 0.8. Use 'forward' instead.
       *
       * @function module:kalix.CommandContext#thenForward
       * @param {any} method The service component method to invoke.
       * @param {object} message The message to send to that service component.
       * @param {module:kalix.Metadata} metadata Metadata to send with the forward.
       */
      thenForward: (method, message, metadata) => {
        accessor.context.forward(method, message, metadata);
      },

      /**
       * DEPRECATED. Forward this command to another service component call, use 'ReplyFactory.forward' instead.
       *
       * @function module:kalix.CommandContext#forward
       * @param {any} method The service component method to invoke.
       * @param {object} message The message to send to that service component.
       * @param {module:kalix.Metadata} [metadata] Metadata to send with the forward.
       * @param {boolean} [internalCall] For internal calls to this deprecated function.
       */
      forward: (method, message, metadata, internalCall) => {
        accessor.ensureActive();
        if (!internalCall)
          console.warn(
            "WARNING: Command context 'forward' is deprecated. Please use 'ReplyFactory.forward' instead.",
          );
        accessor.forward = this.effectSerializer.serializeEffect(
          method,
          message,
          metadata,
        );
      },

      /**
       * Fail handling this command.
       *
       * An alternative to using this is to return a failed Reply created with 'ReplyFactory.failed'.
       *
       * @function module:kalix.EffectContext#fail
       * @param {string} msg The failure message.
       * @param {number} [grpcStatus] The grpcStatus.
       * @throws An error that captures the failure message. Note that even if you catch the error thrown by this
       * method, the command will still be failed with the given message.
       */
      fail: (msg, grpcStatus) => {
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

module.exports = CommandHelper;
