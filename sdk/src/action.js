/*
 * Copyright 2019 Lightbend Inc.
 */

const fs = require("fs");
const protobufHelper = require("./protobuf-helper");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const ActionSupport = require("./action-support");
const AkkaServerless = require("./akkaserverless");

const actionServices = new ActionSupport();

/**
 * A unary action command handler.
 *
 * @callback module:akkaserverless.Action~unaryCommandHandler
 * @param {Object} command The command message, this will be of the type of the gRPC service call input type.
 * @param {module:akkaserverless.Action.UnaryCommandContext} context The command context.
 * @returns {undefined|Object|Promise} The message to reply with, it must match the gRPC service call output type for
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
 * @extends module:akkaserverless.Entity
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
      ...{
        includeDirs: ["."],
      },
      ...options
    };

    const allIncludeDirs = protobufHelper.moduleIncludeDirs
      .concat(this.options.includeDirs);

    this.root = protobufHelper.loadSync(desc, allIncludeDirs);

    this.serviceName = serviceName;
    // Eagerly lookup the service to fail early
    this.service = this.root.lookupService(serviceName);

    if(!fs.existsSync("user-function.desc"))
      throw new Error("No 'user-function.desc' file found in application root folder.");

    const packageDefinition = protoLoader.loadSync(desc, {
      includeDirs: allIncludeDirs
    });
    this.grpc = grpc.loadPackageDefinition(packageDefinition);

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

  register(allEntities) {
    actionServices.addService(this, allEntities);
    return actionServices;
  }

  start(options) {
    if (this.server !== undefined) {
      throw new Error("Server already started!")
    }
    this.server = new AkkaServerless();
    this.server.addEntity(this);

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

module.exports = Action;
