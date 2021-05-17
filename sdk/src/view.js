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

const protobufHelper = require("./protobuf-helper");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const ViewServices = require("./view-support");
const AkkaServerless = require("./akkaserverless");

const viewServices = new ViewServices();

/**
 * Options for a view.
 *
 * @typedef module:akkaserverless.View~options
 * @property {string} [viewId=serviceName] The id for the view, used for persisting the view.
 * @property {array<string>} [includeDirs=["."]] The directories to include when looking up imported protobuf files.
 */

/**
 * View handlers
 *
 * @typedef module:akkaserverless.View~handlers
 *
 * The names of the properties must match the names of all the view methods specified in the gRPC
 * descriptor.
 * @property {Object<String, module:akkaserverless.View~handler>}
 */

/**
 * A handler for transforming an incoming event and the previous view state into a new state
 *
 * @callback module:akkaserverless.View~handler
 * @param {Object} event The event, this will be of the type of the gRPC event handler input type.
 * @param {undefined|module:akkaserverless.Serializable} state The previous view state or 'undefined' if no previous state was stored.
 * @param {module:akkaserverless.View.UpdateHandlerContext} context The view handler context.
 * @returns {undefined|module:akkaserverless.Serializable} The state to store in the view or undefined to not update/store state for the event
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

  /**
   * Set the update handlers of the view. Only used for updates where event transformation is enabled through
   * "transform_updates: true" in the grpc descriptor.
   *
   * @param {module:akkaserverless.View~handlers} handlers The handler callbacks.
   * @return {module:akkaserverless.View} This view.
   */
  setUpdateHandlers(handlers) {
    this.updateHandlers = handlers;
    return this;
  }

  register(allComponents) {
    viewServices.addService(this, allComponents);
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
