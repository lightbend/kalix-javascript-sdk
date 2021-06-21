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

const fs = require("fs");
const protobufHelper = require("./protobuf-helper");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const ValueEntityServices = require("./value-entity-support");
const AkkaServerless = require("./akkaserverless");

const valueEntityServices = new ValueEntityServices();

/**
 * Value entity command handlers
 * The names of the properties must match the names of the service calls specified in the gRPC descriptor for this value entities service.
 *
 * @typedef module:akkaserverless.ValueEntity~commandHandlers
 * @type {Object<String, module:akkaserverless.ValueEntity~commandHandler>}
 */

/**
 * A command handler for one service call to the value entity
 *
 * @callback module:akkaserverless.ValueEntity~commandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:akkaserverless.Serializable} state The entity state.
 * @param {module:akkaserverless.ValueEntity.ValueEntityCommandContext} context The command context.
 * @returns {undefined|Object|module:akkaserverless.replies.Reply} The message to reply with, it must match the gRPC service call output type for this
 * command, or if a Reply is returned, contain an object that matches the output type.
 */

/**
 * Initial state callback.
 *
 * This is invoked if the entity is started with no snapshot.
 *
 * @callback module:akkaserverless.ValueEntity~initialCallback
 * @param {string} entityId The entity id.
 * @returns {module:akkaserverless.Serializable} The entity state.
 */

/**
 * Options for a value entity.
 *
 * @typedef module:akkaserverless.ValueEntity~options
 * @property {array<string>} [includeDirs=["."]] The directories to include when looking up imported protobuf files.
 * @property {boolean} [serializeAllowPrimitives=false] Whether serialization of primitives should be supported when
 * serializing the state.
 * @property {boolean} [serializeFallbackToJson=false] Whether serialization should fallback to using JSON if the state
 * can't be serialized as a protobuf.
 */

/**
 * A value entity.
 *
 * @memberOf module:akkaserverless
 * @implements module:akkaserverless.Entity
 */
class ValueEntity {

  /**
   * Create a new value entity.
   *
   * @param {string|string[]} desc A descriptor or list of descriptors to parse, containing the service to serve.
   * @param {string} serviceName The fully qualified name of the service that provides this entities interface.
   * @param {string} entityType The entity type name for all value entities of this type. Never change it after deploying
   *                            a service that stored data of this type
   * @param {module:akkaserverless.ValueEntity~options=} options The options for this entity
   */
  constructor(desc, serviceName, entityType, options) {

    this.options = {
      ...{
        entityType: entityType,
        includeDirs: ["."],
        serializeAllowPrimitives: false,
        serializeFallbackToJson: false
      },
      ...options
    };
    if (!entityType) throw Error("EntityType must contain a name")

    const allIncludeDirs = protobufHelper.moduleIncludeDirs
      .concat(this.options.includeDirs);

    this.root = protobufHelper.loadSync(desc, allIncludeDirs);

    this.serviceName = serviceName;
    // Eagerly lookup the service to fail early
    this.service = this.root.lookupService(serviceName);

    const packageDefinition = protoLoader.loadSync(desc, {
      includeDirs: allIncludeDirs
    });
    this.grpc = grpc.loadPackageDefinition(packageDefinition);
  }

  componentType() {
    return valueEntityServices.componentType();
  }

  /**
   * Lookup a protobuf message type.
   *
   * This is provided as a convenience to lookup protobuf message types for use with state.
   *
   * @param {string} messageType The fully qualified name of the type to lookup.
   */
  lookupType(messageType) {
    return this.root.lookupType(messageType);
  }

  /**
   * The initial state callback.
   *
   * @member module:akkaserverless.ValueEntity#initial
   * @type module:akkaserverless.ValueEntity~initialCallback
   */

  /**
   * Set the initial state callback.
   *
   * @param {module:akkaserverless.ValueEntity~initialCallback} callback The initial state callback.
   * @return {module:akkaserverless.ValueEntity} This entity.
   */
  setInitial(callback) {
    this.initial = callback;
    return this;
  }

  /**
   * Set the command handlers of the entity.
   *
   * @param {module:akkaserverless.ValueEntity~commandHandlers} handlers The command handler callbacks.
   * @return {module:akkaserverless.ValueEntity} This entity.
   */
  setCommandHandlers(commandHandlers) {
    this.commandHandlers = commandHandlers;
    return this;
  }

  register(allComponents) {
    valueEntityServices.addService(this, allComponents);
    return valueEntityServices;
  }

  start(options) {
    if (this.server !== undefined) {
      throw new Error("Server already started!")
    }
    this.server = new AkkaServerless();
    this.server.addComponent(this);

    return this.server.start(options);
  }

  shutdown() {
    if (this.server === undefined) {
      throw new Error("Server not started!")
    }
    this.server.shutdown();
    delete this.server;
  }

}

module.exports = ValueEntity;
