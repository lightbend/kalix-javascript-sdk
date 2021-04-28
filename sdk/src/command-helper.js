/*
 * Copyright 2019 Lightbend Inc.
 */

const AnySupport = require("./protobuf-any");
const EffectSerializer = require("./effect-serializer");
const ContextFailure = require("./context-failure");
const Metadata = require("./metadata");
const CloudEvents = require("./cloudevents");
const Reply = require("./reply").Reply;

/**
 * Creates the base for context objects.
 * @private
 */
module.exports = class CommandHelper {

  constructor(entityId, service, streamId, call, handlerFactory, allComponents, debug) {
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
  handleCommand(command) {
    let metadata = new Metadata([]);
    if (command.metadata && command.metadata.entries) {
      metadata = new Metadata(command.metadata.entries);
    }

    const ctx = this.createContext(command.id, metadata);

    if (!this.service.methods.hasOwnProperty(command.name)) {
      ctx.commandDebug("Command '%s' unknown", command.name);
      this.call.write({
        failure: {
          commandId: command.id,
          description: "Unknown command named " + command.name
        }
      })
    } else {

      try {
        const grpcMethod = this.service.methods[command.name];

        // todo maybe reconcile whether the command URL of the Any type matches the gRPC response type
        let commandBuffer = command.payload.value;
        if (typeof commandBuffer === "undefined") {
          commandBuffer = new Buffer(0)
        }
        const deserCommand = grpcMethod.resolvedRequestType.decode(commandBuffer);

        const handler = this.handlerFactory(command.name, grpcMethod);

        if (handler !== null) {

          ctx.streamed = command.streamed;

          this.invokeHandler(() => handler(deserCommand, ctx), ctx, grpcMethod, reply => { return {reply}; }, "Command");

        } else {
          const msg = "No handler registered for command '" + command.name + "'";
          ctx.commandDebug(msg);
          this.call.write({
            failure: {
              commandId: command.id,
              description: msg
            }
          })
        }
      } catch (err) {
        const error = "Error handling command '" + command.name + "'";
        ctx.commandDebug(error);
        console.error(err);

        this.call.write({
          failure: {
            commandId: command.id,
            description: error + ": " + err
          }
        });

        this.call.end();
      }
    }

  }

  invokeHandler(handler, ctx, grpcMethod, createReply, desc) {
    ctx.reply = {};
    let userReply = null;
    try {
      userReply = handler();
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

    if (ctx.error !== null) {
      ctx.commandDebug("%s failed with message '%s'", desc, ctx.error.message);
      this.call.write({
        reply: {
          commandId: ctx.commandId,
          clientAction: {
            failure: {
              commandId: ctx.commandId,
              description: ctx.error.message
            }
          }
        }
      });
    } else if (userReply instanceof Reply) {
      if (userReply.failure) {
        // handle failure with a separate write to make sure we don't write back events etc
        ctx.commandDebug("%s failed with message '%s'", desc, userReply.failure);
        this.call.write({
          reply: {
            commandId: ctx.commandId,
            clientAction: {
              failure: {
                commandId: ctx.commandId,
                description: userReply.failure
              }
            }
          }
        })
      } else {
        // effects need to go first to end up in reply
        // note that we amend the ctx.reply to get events etc passed along from the entities
        ctx.commandDebug("%s Reply '%s'", desc, userReply);
        ctx.reply.commandId = ctx.commandId;
        if (userReply.effects) {
          ctx.reply.sideEffects = userReply.effects.map(effect =>
            this.effectSerializer.serializeSideEffect(effect.method, effect.message, effect.synchronous, effect.metadata)
          )
        }
        if (userReply.message) {
          ctx.reply.clientAction = {
            reply: {
              payload: AnySupport.serialize(grpcMethod.resolvedResponseType.create(userReply.message), false, false),
              metadata: userReply.metadata || null
            }
          }
        } else if (userReply.forward) {
          ctx.reply.clientAction = {
            forward: this.effectSerializer.serializeEffect(
              userReply.forward.method, userReply.forward.message, userReply.forward.metadata)
          }
        } else {
          // empty reply, but
          ctx.reply.clientAction = {
            reply: {
              payload: null,
              metadata: userReply.metadata || null
            }
          }
        }
        const reply = createReply(ctx.reply);
        if (reply !== undefined) {
          this.call.write(reply);
        }
      }
    } else {
      ctx.reply.commandId = ctx.commandId;
      ctx.reply.sideEffects = ctx.effects;

      if (ctx.forward !== null) {
        ctx.reply.clientAction = {
          forward: ctx.forward
        };
        ctx.commandDebug("%s forward to %s.%s with %d side effects.", desc, ctx.forward.serviceName, ctx.forward.commandName, ctx.effects.length);
      } else if (userReply !== undefined) {
        ctx.reply.clientAction = {
          reply: {
            payload: AnySupport.serialize(grpcMethod.resolvedResponseType.create(userReply), false, false),
            metadata: (ctx.replyMetadata.entries.length) ? { entries: ctx.replyMetadata.entries } : null
          }
        };
        ctx.commandDebug("%s reply with type [%s] with %d side effects.", desc, ctx.reply.clientAction.reply.payload.type_url, ctx.effects.length);
      } else {
        ctx.commandDebug("%s no reply with %d side effects.", desc, ctx.effects.length);
      }

      const reply = createReply(ctx.reply);
      if (reply !== undefined) {
        this.call.write(reply);
      }
    }
  }

  commandDebug(msg, ...args) {
    this.debug("%s [%s] (%s) - " + msg, ...[this.streamId, this.entityId].concat(args));
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
        throw new Error("Command context no longer active!");
      }
    };
    accessor.error = null;
    accessor.forward = null;
    accessor.replyMetadata = new Metadata([]);

    /**
     * Context for an entity.
     *
     * @interface module:akkaserverless.EntityContext
     * @property {string} entityId The id of the entity that the command is for.
     * @property {Long} commandId The id of the command.
     * @property {module:akkaserverless.Metadata} replyMetadata The metadata to send with a reply.
     */

    /**
     * Effect context.
     *
     * @interface module:akkaserverless.EffectContext
     * @property {module:akkaserverless.Metadata} metadata The metadata associated with the command.
     * @property {module:akkaserverless.CloudEvent} cloudevent The CloudEvents metadata associated with the command.
     */

    /**
     * Context for a command.
     *
     * @interface module:akkaserverless.CommandContext
     * @extends module:akkaserverless.EffectContext
     */
    accessor.context = {
      entityId: this.entityId,
      commandId: commandId,
      metadata: metadata,
      cloudevent: CloudEvents.toCloudevent(metadata.getMap),
      replyMetadata: accessor.replyMetadata,

      /**
       * DEPRECATED. Emit an effect after processing this command.
       *
       * @function module:akkaserverless.EffectContext#effect
       * @param method The entity service method to invoke.
       * @param {object} message The message to send to that service.
       * @param {boolean} synchronous Whether the effect should be execute synchronously or not.
       * @param {module:akkaserverless.Metadata} metadata Metadata to send with the effect.
       */
      effect: (method, message, synchronous = false, metadata, internalCall) => {
        accessor.ensureActive();
        if (!internalCall)
          console.warn("WARNING: Command context 'effect' is deprecated. Please use 'Reply.addEffect' instead.");
        accessor.effects.push(this.effectSerializer.serializeSideEffect(method, message, synchronous, metadata))
      },

      // FIXME: remove for version 0.8 (https://github.com/lightbend/akkaserverless-framework/issues/410)
      /**
       * DEPRECATED. Forward this command to another service component call.
       *
       * @deprecated Since version 0.7. Will be deleted in version 0.8. Use 'forward' instead.
       *
       * @function module:akkaserverless.CommandContext#thenForward
       * @param method The service component method to invoke.
       * @param {object} message The message to send to that service component.
       * @param {module:akkaserverless.Metadata} metadata Metadata to send with the forward.
       */
      thenForward: (method, message, metadata) => {
        accessor.context.forward(method, message, metadata);
      },

      /**
       * DEPRECATED. Forward this command to another service component call, use 'ReplyFactory.forward' instead.
       *
       * @function module:akkaserverless.CommandContext#forward
       * @param method The service component method to invoke.
       * @param {object} message The message to send to that service component.
       * @param {module:akkaserverless.Metadata} metadata Metadata to send with the forward.
       */
      forward: (method, message, metadata, internalCall) => {
        accessor.ensureActive();
        if (!internalCall)
          console.warn("WARNING: Command context 'forward' is deprecated. Please use 'ReplyFactory.forward' instead.");
        accessor.forward = this.effectSerializer.serializeEffect(method, message, metadata);
      },

      /**
       * Fail handling this command.
       *
       * An alternative to using this is to return a failed Reply created with 'ReplyFactory.failed'.
       *
       * @function module:akkaserverless.EffectContext#fail
       * @param msg The failure message.
       * @throws An error that captures the failure message. Note that even if you catch the error thrown by this
       * method, the command will still be failed with the given message.
       */
      fail: (msg) => {
        accessor.ensureActive();
        // We set it here to ensure that even if the user catches the error, for
        // whatever reason, we will still fail as instructed.
        accessor.error = new ContextFailure(msg);
        // Then we throw, to end processing of the command.
        throw error;
      },
    };
    return accessor;
  }
};
