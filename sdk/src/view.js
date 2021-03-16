/*
 * Copyright 2019 Lightbend Inc.
 */

const protobufHelper = require("./protobuf-helper");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const ViewSupport = require("./view-support");
const AkkaServerless = require("./akkaserverless");

const viewServices = new ViewSupport();

/**
 * Options for a view entity.
 *
 * @typedef module:akkaserverless.View~options
 * @property {string} [viewId=serviceName] The id for the view, used for persisting the view.
 * @property {array<string>} [includeDirs=["."]] The directories to include when looking up imported protobuf files.
 */

/**
 * A view.
 *
 * @memberOf module:akkaserverless
 * @extends module:akkaserverless.Entity
 */
class View {

  /**
   * Create a new view.
   *
   * @param {string|string[]} desc A descriptor or list of descriptors to parse, containing the service to serve.
   * @param {string} serviceName The fully qualified name of the service that provides this interface.
   * @param {module:akkaserverless.View~options=} options The options for this view
   */
  constructor(desc, serviceName, options) {

    this.options = {
      ...{
        includeDirs: ["."],
        viewId: serviceName,
      },
      ...options
    };

    this.options.entityType = this.options.viewId;

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
    return viewServices.componentType();
  }

  /**
   * Lookup a protobuf message type.
   *
   * This is provided as a convenience to lookup protobuf message types.
   *
   * @param {string} messageType The fully qualified name of the type to lookup.
   */
  lookupType(messageType) {
    return this.root.lookupType(messageType);
  }

  register(allEntities) {
    viewServices.addService(this, allEntities);
    return viewServices;
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

module.exports = View;
