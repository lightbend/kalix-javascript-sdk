/*
 * Copyright 2021 Lightbend Inc.
 */

const fs = require("fs");
const protobufHelper = require("./protobuf-helper");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const EventSourcedEntityServices = require("./event-sourced-entity-support");
const AkkaServerless = require("./akkaserverless");

const eventSourcedEntityServices = new EventSourcedEntityServices();

/**
 * An event sourced entity command handler.
 *
 * @callback module:akkaserverless.EventSourcedEntity~commandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:akkaserverless.Serializable} state The entity state.
 * @param {module:akkaserverless.EventSourcedEntity.EventSourcedEntityCommandContext} context The command context.
 * @returns {undefined|Object|module:akkaserverless.replies.Reply} The message to reply with, it must match the gRPC service call output type for this
 * command, or if a Reply is returned, contain an object that matches the output type.
 */

/**
 * An event sourced entity event handler.
 *
 * @callback module:akkaserverless.EventSourcedEntity~eventHandler
 * @param {module:akkaserverless.Serializable} event The event.
 * @param {module:akkaserverless.Serializable} state The entity state.
 * @returns {module:akkaserverless.Serializable} The new entity state.
 */

/**
 * An event sourced entity behavior.
 *
 * @typedef module:akkaserverless.EventSourcedEntity~behavior
 * @property {Object<String, module:akkaserverless.EventSourcedEntity~commandHandler>} commandHandlers The command handlers.
 *
 * The names of the properties must match the names of the service calls specified in the gRPC descriptor for this
 * event sourced entities service.
 * @property {Object<String, module:akkaserverless.EventSourcedEntity~eventHandler>} eventHandlers The event handlers.
 *
 * The names of the properties must match the short names of the events.
 */

/**
 * An event sourced entity behavior callback.
 *
 * This callback takes the current entity state, and returns a set of handlers to handle commands and events for it.
 *
 * @callback module:akkaserverless.EventSourcedEntity~behaviorCallback
 * @param {module:akkaserverless.Serializable} state The entity state.
 * @returns {module:akkaserverless.EventSourcedEntity~behavior} The new entity state.
 */

/**
 * Initial state callback.
 *
 * This is invoked if the entity is started with no snapshot.
 *
 * @callback module:akkaserverless.EventSourcedEntity~initialCallback
 * @param {string} entityId The entity id.
 * @returns {module:akkaserverless.Serializable} The entity state.
 */

/**
 * Options for an event sourced entity.
 *
 * @typedef module:akkaserverless.EventSourcedEntity~options
 * @property {number} [snapshotEvery=100] A snapshot will be persisted every time this many events are emitted.
 *                                        It is strongly recommended to not disable snapshotting unless it is known that
 *                                        event sourced entities will never have more than 100 events (in which case
 *                                        the default will anyway not trigger any snapshots)
 * @property {array<string>} [includeDirs=["."]] The directories to include when looking up imported protobuf files.
 * @property {boolean} [serializeAllowPrimitives=false] Whether serialization of primitives should be supported when
 * serializing events and snapshots.
 * @property {boolean} [serializeFallbackToJson=false] Whether serialization should fallback to using JSON if an event
 * or snapshot can't be serialized as a protobuf.
 */

/**
 * An event sourced entity.
 *
 * @memberOf module:akkaserverless
 * @extends module:akkaserverless.Entity
 */
class EventSourcedEntity {

  /**
   * Create a new event sourced entity.
   *
   * @param {string|string[]} desc A descriptor or list of descriptors to parse, containing the service to serve.
   * @param {string} serviceName The fully qualified name of the service that provides this entities interface.
   * @param {string} entityType The entity type name for all event source entities of this type. This will be prefixed
   *                            onto the entityId when storing the events for this entity. Be aware that the
   *                            chosen name must be stable through the entity lifecycle.  Never change it after deploying
   *                            a service that stored data of this type
   * @param {module:akkaserverless.EventSourcedEntity~options=} options The options for this event sourced entity
   */
  constructor(desc, serviceName, entityType,  options) {

    this.options = {
      ...{
        entityType: entityType,
        snapshotEvery: 100,
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
    return eventSourcedEntityServices.componentType();
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

  /**
   * The initial state callback.
   *
   * @member module:akkaserverless.EventSourcedEntity#initial
   * @type module:akkaserverless.EventSourcedEntity~initialCallback
   */

  /**
   * Set the initial state callback.
   *
   * @param {module:akkaserverless.EventSourcedEntity~initialCallback} callback The initial state callback.
   * @return {module:akkaserverless.EventSourcedEntity} This entity.
   */
  setInitial(callback) {
    this.initial = callback;
    return this;
  }

  /**
   * The behavior callback.
   *
   * @member module:akkaserverless.EventSourcedEntity#behavior
   * @type module:akkaserverless.EventSourcedEntity~behaviorCallback
   */

  /**
   * Set the behavior callback.
   *
   * @param {module:akkaserverless.EventSourcedEntity~behaviorCallback} callback The behavior callback.
   * @return {module:akkaserverless.EventSourcedEntity} This entity.
   */
  setBehavior(callback) {
    this.behavior = callback;
    return this;
  }

  register(allComponents) {
    eventSourcedEntityServices.addService(this, allComponents);
    return eventSourcedEntityServices;
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

module.exports = EventSourcedEntity;
