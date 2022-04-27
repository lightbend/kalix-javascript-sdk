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
const ValueEntityServices = require('./value-entity-support');
const Kalix = require('./kalix');
const { GrpcUtil } = require('./grpc-util');

const valueEntityServices = new ValueEntityServices();

/**
 * Value entity command handlers
 * The names of the properties must match the names of the service calls specified in the gRPC descriptor for this value entities service.
 *
 * @typedef module:kalix.ValueEntity~commandHandlers
 * @type {Object<string, module:kalix.ValueEntity~commandHandler>}
 */

/**
 * A command handler for one service call to the value entity
 *
 * @callback module:kalix.ValueEntity~commandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:kalix.Serializable} state The entity state.
 * @param {module:kalix.ValueEntity.ValueEntityCommandContext} context The command context.
 * @returns {undefined|Object|module:kalix.replies.Reply} The message to reply with, it must match the gRPC service call output type for this
 * command, or if a Reply is returned, contain an object that matches the output type.
 */

/**
 * Initial state callback.
 *
 * This is invoked if the entity is started with no snapshot.
 *
 * @callback module:kalix.ValueEntity~initialCallback
 * @param {string} entityId The entity id.
 * @returns {module:kalix.Serializable} The entity state.
 */

/**
 * Options for a value entity.
 *
 * @typedef module:kalix.ValueEntity~options
 * @property {array<string>} [includeDirs=["."]] The directories to include when looking up imported protobuf files.
 * @property {boolean} [serializeAllowPrimitives=false] Whether serialization of primitives should be supported when
 * serializing the state.
 * @property {boolean} [serializeFallbackToJson=false] Whether serialization should fallback to using JSON if the state
 * can't be serialized as a protobuf.
 * @property {array<string>} [forwardHeaders=[]] request headers to be forwarded as metadata to the value entity
 * @property {module:kalix.ValueEntity~entityPassivationStrategy} [entityPassivationStrategy] Entity passivation strategy to use.
 */

/**
 * Entity passivation strategy for a value entity.
 *
 * @typedef module:kalix.ValueEntity~entityPassivationStrategy
 * @property {number} [timeout] Passivation timeout (in milliseconds).
 */

/**
 * A value entity.
 *
 * @memberOf module:kalix
 * @implements module:kalix.Entity
 */
class ValueEntity {
  /**
   * Create a new value entity.
   *
   * @constructs
   * @param {string|string[]} desc A descriptor or list of descriptors to parse, containing the service to serve.
   * @param {string} serviceName The fully qualified name of the service that provides this entities interface.
   * @param {string} entityType The entity type name for all value entities of this type. Never change it after deploying
   *                            a service that stored data of this type
   * @param {module:kalix.ValueEntity~options=} options The options for this entity
   */
  constructor(desc, serviceName, entityType, options) {
    /**
     * @type {module:kalix.ValueEntity~options}
     */
    this.options = {
      ...{
        entityType: entityType,
        includeDirs: ['.'],
        serializeAllowPrimitives: false,
        serializeFallbackToJson: false,
      },
      ...options,
    };
    if (!entityType) throw Error('EntityType must contain a name');

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
     * @type module:kalix.GrpcClientLookup
     */
    this.clients = GrpcUtil.clientCreators(this.root, this.grpc);
  }

  /**
   * @return {string} value entity component type.
   */
  componentType() {
    return valueEntityServices.componentType();
  }

  /**
   * Lookup a protobuf message type.
   *
   * This is provided as a convenience to lookup protobuf message types for use with state.
   *
   * @param {string} messageType The fully qualified name of the type to lookup.
   * @return {protobuf.Type} The protobuf message type.
   */
  lookupType(messageType) {
    return this.root.lookupType(messageType);
  }

  /**
   * The initial state callback.
   *
   * @member module:kalix.ValueEntity#initial
   * @type module:kalix.ValueEntity~initialCallback
   */

  /**
   * Set the initial state callback.
   *
   * @param {module:kalix.ValueEntity~initialCallback} callback The initial state callback.
   * @return {module:kalix.ValueEntity} This entity.
   */
  setInitial(callback) {
    this.initial = callback;
    return this;
  }

  /**
   * The command handlers.
   *
   * @member module:kalix.ValueEntity#commandHandlers
   * @type module:kalix.ValueEntity~commandHandlers
   */

  /**
   * Set the command handlers of the entity.
   *
   * @param {module:kalix.ValueEntity~commandHandlers} handlers The command handler callbacks.
   * @return {module:kalix.ValueEntity} This entity.
   */
  setCommandHandlers(commandHandlers) {
    this.commandHandlers = commandHandlers;
    return this;
  }

  register(allComponents) {
    valueEntityServices.addService(this, allComponents);
    return valueEntityServices;
  }
}

module.exports = ValueEntity;
