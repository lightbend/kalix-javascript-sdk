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
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const debug = require("debug")("akkaserverless-action");
// Bind to stdout
debug.log = console.log.bind(console);
const AnySupport = require("./protobuf-any");
const EffectSerializer = require("./effect-serializer");
const Metadata = require("./metadata");
const CloudEvents = require("./cloudevents");
const Reply = require("./reply").Reply;

class ActionSupport {
  constructor(root, service, commandHandlers, allComponents) {
    this.root = root;
    this.service = service;
    this.commandHandlers = commandHandlers;
    this.anySupport = new AnySupport(this.root);
    this.effectSerializer = new EffectSerializer(allComponents);
  }
}

class ActionHandler {

  constructor(support, grpcMethod, commandHandler, call, grpcCallback, metadata) {
    this.support = support;
    this.grpcMethod = grpcMethod;
    this.commandHandler = commandHandler;
    this.call = call;
    this.grpcCallback = grpcCallback;

    this.streamId = Math.random().toString(16).substr(2, 7);
    this.streamDebug("Started new call");
    this.supportedEvents = [];
    this.callbacks = {};
    this.ctx = this.createContext(metadata);
  }

  streamDebug(msg, ...args) {
    debug("%s [%s.%s] - " + msg, ...[this.streamId, this.support.service.name, this.grpcMethod.name].concat(args));
  }

  /**
   * Context for an action command.
   *
   * @interface module:akkaserverless.Action.ActionCommandContext
   * @extends module:akkaserverless.CommandContext
   * @property {boolean} cancelled Whether the client is still connected.
   * @property {module:akkaserverless.Metadata} metadata The metadata associated with the command.
   * @property {module:akkaserverless.CloudEvent} cloudevent The CloudEvents metadata associated with the command.
   * @property {String} eventSubject The origin subject of the CloudEvent. For example, the entity key when the event was emitted from an entity.
   */
  createContext(metadata) {
    /**
     * Write a message.
     *
     * @function module:akkaserverless.Action.ActionCommandContext#write
     * @param {Object} message The protobuf message to write.
     * @param {module:akkaserverless.Metadata} metadata The metadata associated with the message.
     */

    const call = this.call;
    let metadataObject = new Metadata([]);
    if (metadata && metadata.entries) {
      metadataObject = new Metadata(metadata.entries);
    }
    const cloudevent = CloudEvents.toCloudevent(metadataObject.getMap);
    const ctx = {
      get cancelled() {
        return call.cancelled;
      },
      get metadata() {
        return metadataObject;
      },
      get cloudevent() {
        return cloudevent;
      },
      get eventSubject() {
        return cloudevent.subject();
      }
    };

    /**
     * Register an event handler.
     *
     * @function module:akkaserverless.Action.ActionCommandContext#on
     * @param {string} eventType The type of the event.
     * @param {function} callback The callback to handle the event.
     */
    ctx.on = (eventType, callback) => {
      if (this.supportedEvents.includes(eventType)) {
        this.callbacks[eventType] = callback;
      } else {
        throw new Error("Unknown event type: " + eventType);
      }
    };
    return ctx;
  }

  /**
   * @return {*} The return value from the callback, if there was one
   */
  invokeCallback(eventType, ...args) {
    if (this.callbacks.hasOwnProperty(eventType)) {
      return this.invokeUserCallback(eventType + " event", this.callbacks[eventType], ...args)
    }
  }

  ensureNotCancelled() {
    if (this.call.cancelled) {
      throw new Error("Already replied to unary command, cannot interact further.")
    }
  }

  /**
   * @param {module:akkaserverless.Action.ActionCommandContext} ctx
   * @param {module:akkaserverless.replies.Reply} reply
   */
  passReplyThroughContext(ctx, reply) {
    // effects need to go first to end up in reply
    if (reply.effects) {
      reply.effects.forEach(function(effect) {
        ctx.effect(effect.method, effect.message, effect.synchronous, effect.metadata, true)
      })
    }
    if (reply.failure) {
      ctx.fail(reply.failure)
    } else if (reply.message) {
      ctx.write(reply.message, reply.metadata)
    } else if (reply.forward) {
      ctx.forward(reply.forward.method, reply.forward.message, reply.forward.metadata, true)
    } else {
      // no reply
      ctx.write(null)
    }
  }

  handleSingleReturn(value) {
    if (value) {
      if (this.ctx.alreadyReplied) {
        console.warn(`WARNING: Command handler for ${this.support.service.name}.${this.grpcMethod.name} both sent a reply through the context and returned a value, ignoring return value.`)
      } else if (value instanceof Reply) {
        this.passReplyThroughContext(this.ctx, value)
      } else if (typeof value.then === "function") {
        value.then(this.handleSingleReturn.bind(this), this.ctx.fail)
      } else {
        this.ctx.write(value)
      }
    } else if (!this.ctx.alreadyReplied) {
      this.ctx.write({}) // empty reply, resolved to response type
    }
  }

  /**
   * Context for a unary action command.
   *
   * @interface module:akkaserverless.Action.UnaryCommandContext
   * @extends module:akkaserverless.Action.ActionCommandContext
   */
  handleUnary() {
    this.setupUnaryOutContext();
    const deserializedCommand = this.support.anySupport.deserialize(this.call.request.payload);
    const userReturn = this.invokeUserCallback("command", this.commandHandler, deserializedCommand, this.ctx);
    this.handleSingleReturn(userReturn);
  }

  /**
   * Context for a streamed in action command.
   *
   * @interface module:akkaserverless.Action.StreamedInCommandContext
   * @extends module:akkaserverless.Action.StreamedInContext
   * @extends module:akkaserverless.Action.ActionCommandContext
   */
  handleStreamedIn() {
    this.setupUnaryOutContext();
    this.setupStreamedInContext();
    const userReturn = this.invokeUserCallback("command", this.commandHandler, this.ctx);
    if (userReturn !== undefined) {
      if (this.call.cancelled) {
        this.streamDebug("Streamed command handler for command %s.%s both sent a reply through the context and returned a value, ignoring return value.", this.support.service.name, this.grpcMethod.name)
      } else {
        if (typeof userReturn.then === "function") {
          userReturn.then(this.ctx.write, this.ctx.fail)
        } else {
          this.ctx.write(userReturn);
        }
      }
    }
  }

  /**
   * Context for a streamed out action command.
   *
   * @interface module:akkaserverless.Action.StreamedOutCommandContext
   * @extends module:akkaserverless.Action.StreamedOutContext
   */
  handleStreamedOut() {
    this.setupStreamedOutContext();
    const deserializedCommand = this.support.anySupport.deserialize(this.call.request.payload);
    this.invokeUserCallback("command", this.commandHandler, deserializedCommand, this.ctx);
  }

  /**
   * Context for a streamed action command.
   *
   * @interface module:akkaserverless.Action.StreamedCommandContext
   * @extends module:akkaserverless.Action.StreamedInContext
   * @extends module:akkaserverless.Action.StreamedOutContext
   */
  handleStreamed() {
    this.setupStreamedInContext();
    this.setupStreamedOutContext();
    this.invokeUserCallback("command", this.commandHandler, this.ctx);
  }

  setupUnaryOutContext() {
    const effects = [];

    // FIXME: remove for version 0.8 (https://github.com/lightbend/akkaserverless-framework/issues/410)
    this.ctx.thenForward = (method, message, metadata) => {
      console.warn("WARNING: Action context 'thenForward' is deprecated. Please use 'forward' instead.");
      this.ctx.forward(method, message, metadata, true);
    }

    /**
     * DEPRECATED. Forward this command to another service component call, use 'ReplyFactory.forward' instead.
     *
     * @function module:akkaserverless.Action.UnaryCommandContext#forward
     * @param method The service component method to invoke.
     * @param {object} message The message to send to that service component.
     * @param {module:akkaserverless.Metadata} metadata Metadata to send with the forward.
     */
    this.ctx.forward = (method, message, metadata, internalCall) => {
      this.ensureNotCancelled();
      this.streamDebug("Forwarding to %s", method);
      this.ctx.alreadyReplied = true;
      if (!internalCall)
        console.warn("WARNING: Command context 'forward' is deprecated. Please use 'ReplyFactory.forward' instead.");
      const forward = this.support.effectSerializer.serializeEffect(method, message, metadata);
      this.grpcCallback(null, {
        forward: forward,
        sideEffects: effects
      });
    };

    this.ctx.write = (message, metadata) => {
      this.ensureNotCancelled();
      this.streamDebug("Sending reply");
      this.ctx.alreadyReplied = true
      if (message != null) {
        const messageProto = this.grpcMethod.resolvedResponseType.create(message);
        const replyPayload = AnySupport.serialize(messageProto, false, false);
        let replyMetadata = null;
        if (metadata && metadata.entries) {
          replyMetadata = {
            entries: metadata.entries
          };
        }
        this.grpcCallback(null, {
          reply: {
            payload: replyPayload,
            metadata: replyMetadata
          },
          sideEffects: effects
        });
      } else { // empty reply
        this.grpcCallback(null, {
          sideEffects: effects
        });
      }
    };

    this.ctx.effect = (method, message, synchronous, metadata) => {
      this.ensureNotCancelled();
      this.streamDebug("Emitting effect to %s", method);
      effects.push(this.support.effectSerializer.serializeSideEffect(method, message, synchronous, metadata));
    };

    this.ctx.fail = error => {
      this.ensureNotCancelled();
      this.streamDebug("Failing with %s", error);
      this.ctx.alreadyReplied = true;
      this.grpcCallback(null, {
        failure: {
          description: error
        },
        sideEffects: effects
      });
    };
  }

  /**
   * Context for an action command that returns a streamed message out.
   *
   * @interface module:akkaserverless.Action.StreamedOutContext
   * @extends module:akkaserverless.Action.ActionCommandContext
   */
  setupStreamedOutContext() {
    let effects = [];

    /**
     * A cancelled event.
     *
     * @event module:akkaserverless.Action.StreamedOutContext#cancelled
     */
    this.supportedEvents.push("cancelled");

    this.call.on("cancelled", () => {
      this.streamDebug("Received stream cancelled");
      this.invokeCallback("cancelled", this.ctx);
    });

    /**
     * Send a reply
     *
     * @function module:akkaserverless.Action.StreamedOutContext#reply
     * @param {module:akkaserverless.replies.Reply} reply The reply to send
     */
    this.ctx.reply = (reply) => {
      this.passReplyThroughContext(this.ctx, reply)
    }

    /**
     * Terminate the outgoing stream of messages.
     *
     * @function module:akkaserverless.Action.StreamedOutContext#end
     */
    this.ctx.end = () => {
      if (this.call.cancelled) {
        this.streamDebug("end invoked when already cancelled.");
      } else {
        this.streamDebug("Ending stream out");
        this.call.end();
      }
    };

    // FIXME: remove for version 0.8 (https://github.com/lightbend/akkaserverless-framework/issues/410)
    this.ctx.thenForward = (method, message, metadata) => {
      console.warn("WARNING: Action context 'thenForward' is deprecated. Please use 'forward' instead.");
      this.ctx.forward(method, message, metadata);
    }

    this.ctx.forward = (method, message, metadata) => {
      this.ensureNotCancelled();
      this.streamDebug("Forwarding to %s", method);
      const forward = this.support.effectSerializer.serializeEffect(method, message, metadata);
      this.call.write({
        forward: forward,
        sideEffects: effects
      });
      effects = []; // clear effects after each streamed write
    };

    this.ctx.write = (message, metadata) => {
      this.ensureNotCancelled();
      this.streamDebug("Sending reply");
      if (message != null) {
        const messageProto = this.grpcMethod.resolvedResponseType.create(message);
        const replyPayload = AnySupport.serialize(messageProto, false, false);
        let replyMetadata = null;
        if (metadata && metadata.entries) {
          replyMetadata = {
            entries: metadata.entries
          };
        }
        this.call.write({
          reply: {
            payload: replyPayload,
            metadata: replyMetadata
          },
          sideEffects: effects
        });
      } else { // empty reply
        this.call.write({
          sideEffects: effects
        });
      }
      effects = []; // clear effects after each streamed write
    };

    this.ctx.effect = (method, message, synchronous, metadata) => {
      this.ensureNotCancelled();
      this.streamDebug("Emitting effect to %s", method);
      effects.push(this.support.effectSerializer.serializeSideEffect(method, message, synchronous, metadata));
    };

    this.ctx.fail = error => {
      this.ensureNotCancelled();
      this.streamDebug("Failing with %s", error);
      this.call.write({
        failure: {
          description: error
        },
        sideEffects: effects
      });
      effects = []; // clear effects after each streamed write
    };
  }

  /**
   * Context for an action command that handles streamed messages in.
   *
   * @interface module:akkaserverless.Action.StreamedInContext
   * @extends module:akkaserverless.Action.ActionCommandContext
   */
  setupStreamedInContext() {
    /**
     * A data event.
     *
     * Emitted when a new message arrives.
     *
     * @event module:akkaserverless.Action.StreamedInContext#data
     * @type {Object}
     */
    this.supportedEvents.push("data");

    /**
     * A stream end event.
     *
     * Emitted when the input stream terminates.
     *
     * If a callback is registered and that returns a Reply, then that is returned as a response from the action
     *
     * @event module:akkaserverless.Action.StreamedInContext#end
     */
    this.supportedEvents.push("end");

    this.call.on("data", (data) => {
      this.streamDebug("Received data in");
      const deserializedCommand = this.support.anySupport.deserialize(data.payload);
      this.invokeCallback("data", deserializedCommand, this.ctx);
    });

    this.call.on("end", () => {
      this.streamDebug("Received stream end");
      const userReturn = this.invokeCallback("end", this.ctx);
      if (userReturn instanceof Reply) {
        this.passReplyThroughContext(this.ctx, userReturn)
      } else {
        this.streamDebug("Ignored unknown (non Reply) return value from end callback")
      }

    });

    /**
     * Cancel the incoming stream of messages.
     *
     * @function module:akkaserverless.Action.StreamedInContext#cancel
     */
    this.ctx.cancel = () => {
      if (this.call.cancelled) {
        this.streamDebug("cancel invoked when already cancelled.");
      } else {
        this.call.cancel();
      }
    }
  }

  invokeUserCallback(callbackName, callback, ...args) {
    try {
      return callback.apply(null, args);
    } catch (err) {
      const error = "Error handling " + callbackName;
      this.streamDebug(error);
      console.error(err);
      if (!this.call.cancelled) {
        const failure = {
          failure: {
            description: error
          },
        };
        if (this.grpcCallback != null) {
          this.grpcCallback(null, failure);
        } else {
          this.call.write(failure);
          this.call.end();
        }
      }
    }
  }
}

module.exports = class ActionServices {

  constructor() {
    this.services = {};
  }

  addService(component, allComponents) {
    this.services[component.serviceName] = new ActionSupport(component.root, component.service,
        component.commandHandlers, allComponents);
  }

  componentType() {
    return "akkaserverless.component.action.Actions";
  }

  register(server) {
    const includeDirs = [
      path.join(__dirname, "..", "proto"),
      path.join(__dirname, "..", "protoc", "include")
    ];
    const packageDefinition = protoLoader.loadSync(path.join("akkaserverless", "component", "action", "action.proto"), {
      includeDirs: includeDirs
    });
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const actionService = grpcDescriptor.akkaserverless.component.action.Actions.service;

    server.addService(actionService, {
      handleUnary: this.handleUnary.bind(this),
      handleStreamedIn: this.handleStreamedIn.bind(this),
      handleStreamedOut: this.handleStreamedOut.bind(this),
      handleStreamed: this.handleStreamed.bind(this),
    });
  }

  createHandler(call, callback, data) {
    const service = this.services[data.serviceName];
    if (service && service.service.methods.hasOwnProperty(data.name)) {
      if (service.commandHandlers.hasOwnProperty(data.name)) {
        return new ActionHandler(service, service.service.methods[data.name], service.commandHandlers[data.name], call, callback, data.metadata)
      } else {
        this.reportError("Service call " + data.serviceName + "." + data.name + " not implemented", call, callback)
      }
    } else {
      this.reportError("No service call named " + data.serviceName + "." + data.name + " found", call, callback)
    }
  }

  reportError(error, call, callback) {
    console.warn(error);
    const failure = {
      failure: {
        description: error
      }
    };
    if (callback !== null) {
      callback(null, failure);
    } else {
      call.write(failure);
      call.end();
    }
  }

  handleStreamed(call) {
    let initial = true;
    call.on("data", data => {
      if (initial) {
        initial = false;
        const handler = this.createHandler(call, null, data);
        if (handler) {
          handler.handleStreamed();
        }
      } // ignore the remaining data here, subscribed in setupStreamedInContext
    });
  }

  handleStreamedOut(call) {
    const handler = this.createHandler(call, null, call.request);
    if (handler) {
      handler.handleStreamedOut();
    }
  }

  handleStreamedIn(call, callback) {
    let initial = true;
    call.on("data", data => {
      if (initial) {
        initial = false;
        const handler = this.createHandler(call, callback, data);
        if (handler) {
          handler.handleStreamedIn();
        }
      } // ignore the remaining data here, subscribed in setupStreamedInContext
    });
  }

  handleUnary(call, callback) {
    const handler = this.createHandler(call, callback, call.request);
    if (handler) {
      handler.handleUnary();
    }
  }

};
