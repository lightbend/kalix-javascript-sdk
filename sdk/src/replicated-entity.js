/*
 * Copyright 2019 Lightbend Inc.
 */

const fs = require("fs");
const protobufHelper = require("./protobuf-helper");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const AkkaServerless = require("./akkaserverless");
const replicatedData = require("./replicated-data");
const support = require("./replicated-entity-support");

const replicatedEntityServices = new support.ReplicatedEntityServices();

/**
 * Options for creating a Replicated Entity.
 *
 * @typedef module:akkaserverless.replicatedentity.ReplicatedEntity~options
 * @property {array<string>} includeDirs The directories to include when looking up imported protobuf files.
 */

/**
 * A command handler callback.
 *
 * @callback module:akkaserverless.replicatedentity.ReplicatedEntity~commandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:akkaserverless.replicatedentity.ReplicatedEntityCommandContext} context The command context.
 * @returns {undefined|Object} The message to reply with, it must match the gRPC service call output type for this
 * command.
 */

/**
 * A state set handler callback.
 *
 * This is invoked whenever a new state is set on the Replicated Entity, to allow the state to be enriched with domain
 * specific properties and methods. This may be due to the state being set explicitly from a command handler on the
 * command context, or implicitly as the default value, or implicitly when a new state is received from the proxy.
 *
 * @callback module:akkaserverless.replicatedentity.ReplicatedEntity~onStateSetCallback
 * @param {module:akkaserverless.replicatedentity.ReplicatedData} state The Replicated Data state that was set.
 * @param {string} entityId The id of the entity.
 */

/**
 * A callback that is invoked to create a default value if the Akka Serverless proxy doesn't send an existing one.
 *
 * @callback module:akkaserverless.replicatedentity.ReplicatedEntity~defaultValueCallback
 * @param {string} entityId The id of the entity.
 * @returns {Object} The default value to use for this entity.
 */

/**
 * A Replicated Entity.
 *
 * @memberOf module:akkaserverless.replicatedentity
 * @extends module:akkaserverless.Entity
 */
class ReplicatedEntity {

  /**
   * Create a Replicated Entity.
   *
   * @param desc {string|string[]} The file name of a protobuf descriptor or set of descriptors containing the
   *                               Replicated Entity service.
   * @param serviceName {string} The fully qualified name of the gRPC service that this Replicated Entity implements.
   * @param {string} entityType The entity type name, used to namespace entities of different Replicated Data
   *                            types in the same service.
   * @param options {module:akkaserverless.replicatedentity.ReplicatedEntity~options=} The options.
   */
  constructor(desc, serviceName, entityType, options) {

    this.options = {
      ...{
        includeDirs: ["."],
        entityType: entityType
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

    /**
     * The command handlers.
     *
     * The names of the properties must match the names of the service calls specified in the gRPC descriptor for this
     * Replicated Entity service.
     *
     * @type {Object.<string, module:akkaserverless.replicatedentity.ReplicatedEntity~commandHandler>}
     */
    this.commandHandlers = {};

    /**
     * A callback that is invoked whenever the Replicated Data state is set for this Replicated Entity.
     *
     * This is invoked whenever a new Replicated Data state is set on the Replicated Entity, to allow the state to be
     * enriched with domain specific properties and methods. This may be due to the state being set explicitly from a
     * command handler on the command context, or implicitly as the default value, or implicitly when a new state is
     * received from the proxy.
     *
     * @member {module:akkaserverless.replicatedentity.ReplicatedEntity~onStateSetCallback} module:akkaserverless.replicatedentity.ReplicatedEntity#onStateSet
     */
    this.onStateSet = (state, entityId) => undefined;

    /**
     * A callback that is invoked to create a default value if the Akka Serverless proxy doesn't send an existing one.
     *
     * @member {module:akkaserverless.replicatedentity.ReplicatedEntity~defaultValueCallback} module:akkaserverless.replicatedentity.ReplicatedEntity#defaultValue
     */
    this.defaultValue = (entityId) => null;
  }

  componentType() {
    return replicatedEntityServices.componentType();
  }

  /**
   * Lookup a Protobuf message type.
   *
   * This is provided as a convenience to lookup protobuf message types for use, for example, as values in sets and
   * maps.
   *
   * @param {string} messageType The fully qualified name of the type to lookup.
   */
  lookupType(messageType) {
    return this.root.lookupType(messageType);
  }

  register(allComponents) {
    replicatedEntityServices.addService(this, allComponents);
    return replicatedEntityServices;
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

module.exports = {
  ReplicatedEntity: ReplicatedEntity,
  ReplicatedData: {
    GCounter: replicatedData.GCounter,
    PNCounter: replicatedData.PNCounter,
    GSet: replicatedData.GSet,
    ORSet: replicatedData.ORSet,
    LWWRegister: replicatedData.LWWRegister,
    Flag: replicatedData.Flag,
    ORMap: replicatedData.ORMap,
    Vote: replicatedData.Vote,
    Clocks: replicatedData.Clocks,
    WriteConsistencies: replicatedData.WriteConsistencies
  }
};
