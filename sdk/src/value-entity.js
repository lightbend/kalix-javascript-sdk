/*
 * Copyright 2019 Lightbend Inc.
 */

const fs = require("fs");
const protobufHelper = require("./protobuf-helper");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const ValueEntityServices = require("./value-entity-support");
const AkkaServerless = require("./akkaserverless");

const valueEntityServices = new ValueEntityServices();

/**
 * Value entity command handlers
 *
 * @typedef module:akkaserverless.ValueEntity~commandHandlers
 *
 * The names of the properties must match the names of the service calls specified in the gRPC descriptor for this
 * value entities service.
 * @property {Object<String, module:akkaserverless.ValueEntity~commandHandler>}
 */

/**
 * A command handler for one service call to the value entity
 *
 * @callback module:akkaserverless.ValueEntity~commandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:akkaserverless.Serializable} state The entity state.
 * @param {module:akkaserverless.ValueEntity.ValueEntityCommandContext} context The command context.
 * @returns {undefined|Object} The message to reply with, it must match the gRPC service call output type for this
 * command.
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
 * @property {string} [entityType="entity"] A persistence id for all value entities of this type. This will be prefixed
 * onto the entityId when storing the state for this entity.
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
 * @extends module:akkaserverless.Entity
 */
class ValueEntity {

  /**
   * Create a new value entity.
   *
   * @param {string|string[]} desc A descriptor or list of descriptors to parse, containing the service to serve.
   * @param {string} serviceName The fully qualified name of the service that provides this entities interface.
   * @param {module:akkaserverless.ValueEntity~options=} options The options for this entity
   */
  constructor(desc, serviceName, options) {

    this.options = {
      ...{
        entityType: "entity",
        includeDirs: ["."],
        serializeAllowPrimitives: false,
        serializeFallbackToJson: false
      },
      ...options
    };

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
   * @param {module:akkaserverless.ValueEntity~commandHandlers} callback The command handler callbacks.
   * @return {module:akkaserverless.ValueEntity} This entity.
   */
  setCommandHandlers(commandHandlers) {
    this.commandHandlers = commandHandlers;
    return this;
  }

  register(allEntities) {
    valueEntityServices.addService(this, allEntities);
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
