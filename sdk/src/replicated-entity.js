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
const AkkaServerless = require('./akkaserverless');
const replicatedData = require('./replicated-data');
const support = require('./replicated-entity-support');

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

// Callback definitions for akkaserverless.replicatedentity.*

/**
 * Callback for handling elements iterated through by {@link module:akkaserverless.replicatedentity.GSet#forEach}.
 *
 * @callback module:akkaserverless.replicatedentity.GSet~forEachCallback
 * @param {module:akkaserverless.Serializable} element The element.
 */

/**
 * Generator for default values.
 *
 * This is invoked by get when the current map has no Replicated Data defined for the key.
 *
 * If this returns a Replicated Data object, it will be added to the map.
 *
 * Care should be taken when using this, since it means that the get method can trigger elements to be created. If
 * using default values, the get method should not be used in queries where an empty value for the Replicated Data
 * means the value is not present.
 *
 * @callback module:akkaserverless.replicatedentity.ORMap~defaultValueCallback
 * @param {module:akkaserverless.Serializable} key The key the default value is being generated for.
 * @returns {undefined|module:akkaserverless.replicatedentity.ReplicatedData} The default value, or undefined if no default value should be returned.
 */

/**
 * Callback for handling elements iterated through by {@link module:akkaserverless.replicatedentity.ORMap#forEach}.
 *
 * @callback module:akkaserverless.replicatedentity.ORMap~forEachCallback
 * @param {module:akkaserverless.replicatedentity.ReplicatedData} value The Replicated Data value.
 * @param {module:akkaserverless.Serializable} key The key.
 * @param {module:akkaserverless.ORMap} This map.
 */

/**
 * Callback for handling elements iterated through by {@link module:akkaserverless.replicatedentity.ORSet#forEach}.
 *
 * @callback module:akkaserverless.replicatedentity.ORSet~forEachCallback
 * @param {module:akkaserverless.Serializable} element The element.
 */

/**
 * A Replicated Entity.
 *
 * @memberOf module:akkaserverless.replicatedentity
 * @implements module:akkaserverless.Entity
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
        includeDirs: ['.'],
        entityType: entityType,
      },
      ...options,
    };
    if (!entityType) throw Error('EntityType must contain a name');

    const allIncludeDirs = protobufHelper.moduleIncludeDirs.concat(
      this.options.includeDirs,
    );

    this.root = protobufHelper.loadSync(desc, allIncludeDirs);

    this.serviceName = serviceName;
    // Eagerly lookup the service to fail early
    this.service = this.root.lookupService(serviceName);

    const packageDefinition = protoLoader.loadSync(desc, {
      includeDirs: allIncludeDirs,
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

  /**
   * @param allComponents
   * @return {ReplicatedEntityServices}
   */
  register(allComponents) {
    replicatedEntityServices.addService(this, allComponents);
    return replicatedEntityServices;
  }
}

/**
 * @type {{
 * ReplicatedData: {
 *   ReplicatedCounter: function(): void,
 *   GSet: function(): void,
 *   ORSet: function(): void,
 *   LWWRegister: function(module:akkaserverless.Serializable, module:akkaserverless.replicatedentity.Clock=, number=): void,
 *   Flag: function(): void, Clocks: unknown[],
 *   ORMap: function(): void,
 *   Vote: function(): void,
 *   Clocks: unknown[],
 *   WriteConsistencies: unknown[]
 * },
 * ReplicatedEntity: module:akkaserverless.replicatedentity.ReplicatedEntity
 * }}
 */
module.exports = {
  ReplicatedEntity: ReplicatedEntity,
  ReplicatedData: {
    ReplicatedCounter: replicatedData.ReplicatedCounter,
    GSet: replicatedData.GSet,
    ORSet: replicatedData.ORSet,
    LWWRegister: replicatedData.LWWRegister,
    Flag: replicatedData.Flag,
    ORMap: replicatedData.ORMap,
    Vote: replicatedData.Vote,
    Clocks: replicatedData.Clocks,
    WriteConsistencies: replicatedData.WriteConsistencies,
  },
};
