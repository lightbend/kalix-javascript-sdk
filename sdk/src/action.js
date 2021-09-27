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

const fs = require('fs');
const protobufHelper = require('./protobuf-helper');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const ActionSupport = require('./action-support');
const AkkaServerless = require('./akkaserverless');
const { GrpcUtil } = require('./grpc-util');

const actionServices = new ActionSupport();

/**
 * Options for an action.
 *
 * @typedef module:akkaserverless.Action~options
 * @property {array<string>} [includeDirs=["."]] The directories to include when looking up imported protobuf files.
 * @property {array<string>} [forwardHeaders=[]] request headers to be forwarded as metadata to the action
 */

/**
 * A unary action command handler.
 *
 * @callback module:akkaserverless.Action~unaryCommandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:akkaserverless.Action.UnaryCommandContext} context The command context.
 * @returns {undefined|Object|Promise.<any>|module:akkaserverless.replies.Reply} The message to reply with, it must match the gRPC service call output type for
 *                                     this command. If replying by using context.write, undefined must be returned.
 */

/**
 * A streamed in action command handler.
 *
 * @callback module:akkaserverless.Action~streamedInCommandHandler
 * @param {module:akkaserverless.Action.StreamedInCommandContext} context The command context.
 * @returns {undefined|Object|Promise.<any>} The message to reply with, it must match the gRPC service call output type for
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
 * @implements module:akkaserverless.Component
 */
class Action {
  /**
   * Create a new action.
   *
   * @constructs
   * @param {string|string[]} desc A descriptor or list of descriptors to parse, containing the service to serve.
   * @param {string} serviceName The fully qualified name of the service that provides this interface.
   * @param {module:akkaserverless.Action~options=} options The options for this action
   */
  constructor(desc, serviceName, options) {
    /**
     * @type {module:akkaserverless.Action~options}
     */
    this.options = {
      ...{
        includeDirs: ['.'],
      },
      ...options,
    };

    const allIncludeDirs = protobufHelper.moduleIncludeDirs.concat(
      this.options.includeDirs,
    );

    this.root = protobufHelper.loadSync(desc, allIncludeDirs);

    /**
     * @type {string}
     */
    this.serviceName = serviceName;

    // Eagerly lookup the service to fail early
    /**
     * @type {protobuf.Service}
     */
    this.service = this.root.lookupService(serviceName);

    const packageDefinition = protoLoader.loadSync(desc, {
      includeDirs: allIncludeDirs,
    });
    this.grpc = grpc.loadPackageDefinition(packageDefinition);

    /**
     * Access to gRPC clients (with promisified unary methods).
     *
     * @type module:akkaserverless.GrpcClientLookup
     */
    this.clients = GrpcUtil.clientCreators(this.root, this.grpc);

    /**
     * The command handlers.
     *
     * The names of the properties must match the names of the service calls specified in the gRPC descriptor
     *
     * @type {Object.<string, module:akkaserverless.Action.ActionCommandHandler>}
     */
    this.commandHandlers = {};
  }

  /**
   * @return {string} action component type.
   */
  componentType() {
    return actionServices.componentType();
  }

  /**
   * Lookup a protobuf message type.
   *
   * This is provided as a convenience to lookup protobuf message types for use with events and snapshots.
   *
   * @param {string} messageType The fully qualified name of the type to lookup.
   * @return {protobuf.Type} The protobuf message type.
   */
  lookupType(messageType) {
    return this.root.lookupType(messageType);
  }

  /**
   * Set the command handlers for this action.
   *
   * @param {Object.<string, module:akkaserverless.Action.ActionCommandHandler>} handlers The command handlers.
   * @return {module:akkaserverless.Action} This action.
   */
  setCommandHandlers(commandHandlers) {
    this.commandHandlers = commandHandlers;
    return this;
  }

  register(allComponents) {
    actionServices.addService(this, allComponents);
    return actionServices;
  }
}

module.exports = Action;
