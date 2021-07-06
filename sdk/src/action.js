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

const ActionSupport = require('./action-support');
const { ProtobufjsSerializationSupport } = require('./serialization-support');

const actionServices = new ActionSupport();

/**
 * Options for a action.
 *
 * @typedef module:akkaserverless.Action~options
 * @property {array<string>} [includeDirs=["."]] The directories to include when looking up imported protobuf files.
 */

/**
 * A unary action command handler.
 *
 * @callback module:akkaserverless.Action~unaryCommandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:akkaserverless.Action.UnaryCommandContext} context The command context.
 * @returns {undefined|Object|Promise|module:akkaserverless.replies.Reply} The message to reply with, it must match the gRPC service call output type for
 *                                     this command. If replying by using context.write, undefined must be returned.
 */

/**
 * A streamed in action command handler.
 *
 * @callback module:akkaserverless.Action~streamedInCommandHandler
 * @param {module:akkaserverless.Action.StreamedInCommandContext} context The command context.
 * @returns {undefined|Object|Promise} The message to reply with, it must match the gRPC service call output type for
 *                                     this command. If replying by using context.write, undefined must be returned.
 */

/**
 * A streamed out command handler.
 *
 * @callback module:akkaserverless.Action~streamedOutCommandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:akkaserverless.Action.StreamedOutCommandContext} context The command context.
 */

/**
 * A streamed command handler.
 *
 * @callback module:akkaserverless.Action~streamedCommandHandler
 * @param {module:akkaserverless.Action.StreamedCommandContext} context The command context.
 */

/**
 * An action command handler.
 *
 * @typedef module:akkaserverless.Action.ActionCommandHandler
 * @type {module:akkaserverless.Action~unaryCommandHandler|module:akkaserverless.Action~streamedInCommandHandler|module:akkaserverless.Action~streamedOutCommandHandler|module:akkaserverless.Action~streamedCommandHandler}
 */

/**
 * An action.
 *
 * @memberOf module:akkaserverless
 * @implements module:akkaserverless.Entity
 */
class Action {
  /**
   * Create a new action.
   *
   * @param {string|string[]} desc A descriptor or list of descriptors to parse, containing the service to serve.
   * @param {string} serviceName The fully qualified name of the service that provides this interface.
   * @param {module:akkaserverless.Action~options=} options The options for this action
   */
  constructor(desc, serviceName, options) {
    this.options = {
      ...options,
    };

    if (!this.options.includeDirs) {
      this.options.includeDirs = ['.'];
    }

    this.serializationSupport = new ProtobufjsSerializationSupport(
      desc,
      serviceName,
      this.options.includeDirs,
    );

    /**
     * The command handlers.
     *
     * The names of the properties must match the names of the service calls specified in the gRPC descriptor
     *
     * @type {Object.<string, module:akkaserverless.Action.ActionCommandHandler>}
     */
    this.commandHandlers = {};
  }

  componentType() {
    return actionServices.componentType();
  }

  /**
   * Lookup a protobuf message type.
   *
   * This is provided as a convenience to lookup protobuf message types for use with events and snapshots.
   *
   * @param {string} messageType The fully qualified name of the type to lookup.
   */
  lookupType(messageType) {
    return this.root.lookupType(messageType);
  }

  register(allComponents) {
    this.serializationSupport.setComponents(allComponents);
    this.serializationSupport.validate();
    actionServices.addService(this);
    return actionServices;
  }
}

module.exports = Action;
