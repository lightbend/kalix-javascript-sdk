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

const path = require("path");
const debug = require("debug")("akkaserverless-replicated-entity");
const util = require("util");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const protoHelper = require("./protobuf-helper");
const AnySupport = require("./protobuf-any");
const replicatedData = require("./replicated-data");
const CommandHelper = require("./command-helper");
const Metadata = require("./metadata");

class ReplicatedEntityServices {
  constructor() {
    this.services = {};
    this.includeDirs = [
      path.join(__dirname, "..", "proto"),
      path.join(__dirname, "..", "protoc", "include")
    ];
  }

  addService(entity) {
    this.services[entity.serviceName] = new ReplicatedEntitySupport(entity.root, entity.service, {
      commandHandlers: entity.commandHandlers,
      onStateSet: entity.onStateSet,
      defaultValue: entity.defaultValue
    });
  }

  componentType() {
    return "akkaserverless.component.replicatedentity.ReplicatedEntities";
  }

  register(server) {
    const packageDefinition = protoLoader.loadSync(path.join("akkaserverless", "component", "replicatedentity", "replicated_entity.proto"), {
      includeDirs: this.includeDirs
    });
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const entityService = grpcDescriptor.akkaserverless.component.replicatedentity.ReplicatedEntities.service;

    server.addService(entityService, {
      handle: this.handle.bind(this)
    });
  }

  handle(call) {
    let service;

    call.on("data", replicatedEntityStreamIn => {
      // cycle through the ReplicatedEntityStreamIn type, this will ensure default values are initialised
      replicatedEntityStreamIn = protoHelper.moduleRoot.akkaserverless.component.replicatedentity.ReplicatedEntityStreamIn.fromObject(replicatedEntityStreamIn);

      if (replicatedEntityStreamIn.init) {
        if (service != null) {
          service.streamDebug("Terminating entity due to duplicate init message.");
          console.error("Terminating entity due to duplicate init message.");
          call.write({
            failure: {
              description: "Init message received twice."
            }
          });
          call.end();
        } else if (replicatedEntityStreamIn.init.serviceName in this.services) {
          service = this.services[replicatedEntityStreamIn.init.serviceName].create(call, replicatedEntityStreamIn.init);
        } else {
          console.error("Received command for unknown Replicated Entity service: '%s'", replicatedEntityStreamIn.init.serviceName);
          call.write({
            failure: {
              description: "Replicated Entity service '" + replicatedEntityStreamIn.init.serviceName + "' unknown."
            }
          });
          call.end();
        }
      } else if (service != null) {
        service.onData(replicatedEntityStreamIn);
      } else {
        console.error("Unknown message received before init %o", replicatedEntityStreamIn);
        call.write({
          failure: {
            description: "Unknown message received before init"
          }
        });
        call.end();
      }
    });

    call.on("end", () => {
      if (service != null) {
        service.onEnd();
      } else {
        call.end();
      }
    });
  }
}

class ReplicatedEntitySupport {

  constructor(root, service, handlers) {
    this.root = root;
    this.service = service;
    this.anySupport = new AnySupport(this.root);
    this.commandHandlers = handlers.commandHandlers;
    this.onStateSet = handlers.onStateSet;
    this.defaultValue = handlers.defaultValue;
  }

  create(call, init) {
    const handler = new ReplicatedEntityHandler(this, call, init.entityId);
    if (init.delta) {
      handler.handleInitialDelta(init.delta)
    }
    return handler;
  }
}

/**
 * Callback for handling {@link module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext#onStateChange}
 * events for a Replicated Entity, specific to a given streamed connection.
 *
 * The callback may not modify the Replicated Entity state, doing so will cause an error.
 *
 * @callback module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext~onStateChangeCallback
 * @param {module:akkaserverless.replicatedentity.ReplicatedData} state The current Replicated Data state that has changed
 * @param {module:akkaserverless.replicatedentity.StateChangedContext} context The context for the state change.
 * @returns {undefined|object} If an object is returned, that will be sent as a message to the current streamed call.
 * It must be an object that conforms to this streamed commands output type.
 */

/**
 * Callback for handling {@link module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext#onStreamCancel}
 * events for a Replicated Entity, specific to a given streamed connection.
 *
 * The callback may modify the Replicated Entity state if it pleases.
 *
 * @callback module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext~onStreamCancelCallback
 * @param {module:akkaserverless.replicatedentity.ReplicatedData} state The current Replicated Data state that has changed
 * @param {module:akkaserverless.replicatedentity.StreamCancelledContext} context The context for the stream cancellation.
 */

/*
 * Handler for a single Replicated Entity.
 */
class ReplicatedEntityHandler {

  constructor(support, call, entityId) {
    this.entity = support;
    this.call = call;
    this.entityId = entityId;

    this.currentState = null;

    this.streamId = Math.random().toString(16).substr(2, 7);

    this.commandHelper = new CommandHelper(this.entityId, support.service, this.streamId, call,
      this.commandHandlerFactory.bind(this), debug);

    this.streamDebug("Started new stream");

    this.subscribers = new Map();
    this.cancelledCallbacks = new Map();
  }

  commandHandlerFactory(commandName, grpcMethod) {
    if (this.entity.commandHandlers.hasOwnProperty(commandName)) {

      return (command, ctx) => {

        /**
         * Context for a Replicated Entity command handler.
         *
         * @interface module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext
         * @extends module:akkaserverless.replicatedentity.StateManagementContext
         * @extends module:akkaserverless.CommandContext
         * @extends module:akkaserverless.EntityContext
         */

        this.addStateManagementToContext(ctx);

        ctx.subscribed = false;

        /**
         * Set a callback for handling state change events.
         *
         * This may only be invoked on streamed commands. If invoked on a non streamed command, it will throw an error.
         *
         * This will be invoked every time the state of this Replicated Entity changes, allowing the callback to send
         * messages to the stream.
         *
         * @name module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext#onStateChange
         * @type {module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext~onStateChangeCallback}
         */
        Object.defineProperty(ctx.context, "onStateChange", {
          set: (handler) => {
            ctx.ensureActive();
            if (!ctx.streamed) {
              throw new Error("Cannot subscribe to updates from non streamed command")
            }
            this.subscribers.set(ctx.commandId.toString(), {
              commandId: ctx.commandId,
              handler: handler,
              grpcMethod: grpcMethod,
              metadata: ctx.context.metadata
            });
            ctx.subscribed = true;
          }
        });

        /**
         * Set a callback for handling the stream cancelled event.
         *
         * This may only be invoked on streamed commands. If invoked on a non streamed command, it will throw an error.
         *
         * This will be invoked if the client initiated a cancel, it will not be invoked if the stream was ended by
         * invoking {@link module:akkaserverless.replicatedentity.StateChangedContext#end}.
         *
         * @name module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext#onStreamCancel
         * @type {module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext~onStreamCancelCallback}
         */
        Object.defineProperty(ctx.context, "onStreamCancel", {
          set: (handler) => {
            ctx.ensureActive();
            if (!ctx.streamed) {
              throw new Error("Cannot receive stream cancelled from non streamed command")
            }
            this.cancelledCallbacks.set(ctx.commandId.toString(), {
              commandId: command.id,
              handler: handler,
              grpcMethod: grpcMethod
            });
            ctx.subscribed = true;
          }
        });

        /**
         * Whether this command is streamed or not.
         *
         * @name module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext#streamed
         * @type {boolean}
         * @readonly
         */
        Object.defineProperty(ctx.context, "streamed", {
          get: () => ctx.streamed === true
        });

        /**
         * Set the write consistency for replication of Replicated Entity state.
         *
         * @name module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext#writeConsistency
         * @type {module:akkaserverless.replicatedentity.WriteConsistency}
         */
        Object.defineProperty(ctx.context, "writeConsistency", {
          get: () => ctx.writeConsistency,
          set: (writeConsistency) => ctx.writeConsistency = writeConsistency
        });

        const userReply = this.entity.commandHandlers[commandName](command, ctx.context);
        if (ctx.streamed && ctx.subscription === null) {
          // todo relax this requirement
          throw new Error("Streamed commands must be subscribed to using ctx.subscribe()");
        }

        this.setStateActionOnReply(ctx);

        if (ctx.subscribed) {
          ctx.reply.streamed = true;
        }

        return userReply;
      };
    } else {
      return null;
    }
  }

  setStateActionOnReply(ctx) {
    if (ctx.deleted) {
      ctx.commandDebug("Deleting entity");
      ctx.reply.stateAction = {
        delete: {},
        writeConsistency: ctx.writeConsistency
      };
      this.currentState = null;
      this.handleStateChange();
    } else if (this.currentState !== null) {
      const delta = this.currentState.getAndResetDelta();
      if (delta != null) {
        ctx.commandDebug("Updating entity");
        ctx.reply.stateAction = {
          update: delta,
          writeConsistency: ctx.writeConsistency
        };
        this.handleStateChange();
      }
    }
  }

  addStateManagementToContext(ctx) {
    ctx.deleted = false;
    ctx.noState = this.currentState === null;
    ctx.defaultValue = false;
    if (ctx.noState) {
      this.currentState = this.entity.defaultValue();
      if (this.currentState !== null) {
        this.entity.onStateSet(this.currentState, this.entityId);
        ctx.defaultValue = true;
      }
    }

    /**
     * Context that allows managing a Replicated Entity's state.
     *
     * @interface module:akkaserverless.replicatedentity.StateManagementContext
     */

    /**
     * Delete this Replicated Entity.
     *
     * @function module:akkaserverless.replicatedentity.StateManagementContext#delete
     */
    ctx.context.delete = () => {
      ctx.ensureActive();
      if (this.currentState === null) {
        throw new Error("Can't delete entity that hasn't been created.");
      } else if (ctx.noState) {
        this.currentState = null;
      } else {
        ctx.deleted = true;
      }
    };

    /**
     * The Replicated Data state for a Replicated Entity.
     * It may only be set once, if it's already set, an error will be thrown.
     *
     * @name module:akkaserverless.replicatedentity.StateManagementContext#state
     * @type {module:akkaserverless.replicatedentity.ReplicatedData}
     */
    Object.defineProperty(ctx.context, "state", {
      get: () => {
        ctx.ensureActive();
        return this.currentState;
      },
      set: (state) => {
        ctx.ensureActive();
        if (this.currentState !== null) {
          throw new Error("Cannot create a new Replicated Entity state after it's been created.")
        } else if (typeof state.getAndResetDelta !== "function") {
          throw new Error(util.format("%o is not a Replicated Data type", state));
        } else {
          this.currentState = state;
          this.entity.onStateSet(this.currentState, this.entityId);
        }
      }
    });
  }

  streamDebug(msg, ...args) {
    debug("%s [%s] - " + msg, ...[this.streamId, this.entityId].concat(args));
  }

  handleInitialDelta(delta) {
    this.streamDebug("Handling initial delta for Replicated Data type %s", delta.delta);
    if (this.currentState === null) {
      this.currentState = replicatedData.createForDelta(delta);
    }
    this.currentState.applyDelta(delta, this.entity.anySupport, replicatedData.createForDelta);
    this.entity.onStateSet(this.currentState, this.entityId);
  }

  onData(replicatedEntityStreamIn) {
    try {
      this.handleReplicatedEntityStreamIn(replicatedEntityStreamIn);
    } catch (err) {
      this.streamDebug("Error handling message, terminating stream: %o", replicatedEntityStreamIn);
      console.error(err);
      this.call.write({
        failure: {
          commandId: 0,
          description: "Fatal error handling message, check user container logs."
        }
      });
      this.call.end();
    }
  }

  handleStateChange() {
    this.subscribers.forEach((subscriber, key) => {
      /**
       * Context passed to {@link module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext#onStateChange} handlers.
       *
       * @interface module:akkaserverless.replicatedentity.StateChangedContext
       * @extends module:akkaserverless.CommandContext
       * @extends module:akkaserverless.EntityContext
       */
      const ctx = this.commandHelper.createContext(subscriber.commandId, subscriber.metadata);

      /**
       * The Replicated Data state for a Replicated Entity.
       *
       * @name module:akkaserverless.replicatedentity.StateChangedContext#state
       * @type module:akkaserverless.replicatedentity.ReplicatedData
       * @readonly
       */
      Object.defineProperty(ctx.context, "state", {
        get: () => {
          return this.currentState;
        }
      });

      /**
       * End this stream.
       *
       * @function module:akkaserverless.replicatedentity.StateChangedContext#end
       */
      ctx.context.end = () => {
        ctx.reply.endStream = true;
        this.subscribers.delete(key);
        this.cancelledCallbacks.delete(key);
      };

      try {
        this.commandHelper.invokeHandler(() => {
          const userReply = subscriber.handler(this.currentState, ctx.context);
          if (this.currentState.getAndResetDelta() !== null) {
            throw new Error("State change handler attempted to modify state");
          }
          return userReply;
        }, ctx, subscriber.grpcMethod, msg => {
          if (ctx.effects.length > 0 || ctx.reply.endStream === true || ctx.reply.clientAction !== undefined) {
            return {
              streamedMessage: msg
            };
          }
        })
      } catch (e) {
        this.call.write({
          failure: {
            commandId: subscriber.commandId,
            description: util.format("Error: %o", e)
          }
        });
        this.call.end();
        // Probably rethrow?
      }
    });
  }

  handleStreamCancelled(cancelled) {
    const subscriberKey = cancelled.id.toString();
    const subscriber = this.subscribers.get(subscriberKey);
    let metadata = new Metadata([]);
    if (subscriber && subscriber.metadata) {
      metadata = subscriber.metadata;
    }
    this.subscribers.delete(subscriberKey);

    let response = {
      commandId: cancelled.id
    };

    try {
      if (this.cancelledCallbacks.has(subscriberKey)) {
        const subscriber = this.cancelledCallbacks.get(subscriberKey);

        /**
         * Context passed to {@link module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext#onStreamCancel} handlers.
         *
         * @interface module:akkaserverless.replicatedentity.StreamCancelledContext
         * @extends module:akkaserverless.EffectContext
         * @extends module:akkaserverless.EntityContext
         * @extends module:akkaserverless.replicatedentity.StateManagementContext
         */

        const ctx = this.commandHelper.createContext(cancelled.id, metadata);
        ctx.reply = response;
        this.addStateManagementToContext(ctx);

        subscriber.handler(this.currentState, ctx.context);
        this.setStateActionOnReply(ctx);
        ctx.commandDebug("Sending streamed cancelled response");

        response = ctx.reply;
      }

      this.call.write({
        streamCancelledResponse: response
      });

    } catch (e) {
      this.call.write({
        failure: {
          commandId: cancelled.id,
          description: util.format("Error: %o", e)
        }
      });
      this.call.end();
    }
  }

  handleReplicatedEntityStreamIn(replicatedEntityStreamIn) {
    if (replicatedEntityStreamIn.delta && this.currentState === null) {
      this.handleInitialDelta(replicatedEntityStreamIn.delta)
    } else if (replicatedEntityStreamIn.delta) {
      this.streamDebug("Received delta for Replicated Data type %s", replicatedEntityStreamIn.delta.delta);
      this.currentState.applyDelta(replicatedEntityStreamIn.delta, this.entity.anySupport, replicatedData.createForDelta);
      this.handleStateChange();
    } else if (replicatedEntityStreamIn.delete) {
      this.streamDebug("Received Replicated Entity delete");
      this.currentState = null;
      this.handleStateChange();
    } else if (replicatedEntityStreamIn.command) {
      this.commandHelper.handleCommand(replicatedEntityStreamIn.command);
    } else if (replicatedEntityStreamIn.streamCancelled) {
      this.handleStreamCancelled(replicatedEntityStreamIn.streamCancelled)
    } else {
      this.call.write({
        failure: {
          commandId: 0,
          description: util.format("Unknown message: %o", replicatedEntityStreamIn)
        }
      });
      this.call.end();
    }
  }

  onEnd() {
    this.streamDebug("Stream terminating");
    this.call.end();
  }

}

module.exports = {
  ReplicatedEntityServices: ReplicatedEntityServices,
  ReplicatedEntitySupport: ReplicatedEntitySupport,
  ReplicatedEntityHandler: ReplicatedEntityHandler
};
