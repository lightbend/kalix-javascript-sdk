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

const path = require("path");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const settings = require("../settings");

const debug = require("debug")("akkaserverless");
// Bind to stdout
debug.log = console.log.bind(console);

const defaultOptions = {
  bindAddress: "127.0.0.1",
  bindPort: 8080
};

if (process.env.PORT !== undefined) {
  defaultOptions.bindPort = parseInt(process.env.PORT);
}
if (process.env.HOST !== undefined) {
  defaultOptions.bindAddress = process.env.HOST;
}

const packageInfo = require(path.join(__dirname, "..", "package.json"));
const serviceInfo = {
  serviceName: "",
  serviceVersion: ""
};
try {
  const thisPackageInfo = require(path.join(process.cwd(), "package.json"));
  if (thisPackageInfo.name) {
    serviceInfo.serviceName = thisPackageInfo.name;
  }
  if (thisPackageInfo.version) {
    serviceInfo.serviceVersion = thisPackageInfo.version;
  }
} catch (e) {
  // ignore, if we can't find it, no big deal
}

/**
 * An Akka Serverless server.
 *
 * @interface module:akkaserverless.Server
 */

/**
 * Start the server.
 *
 * @function module:akkaserverless.Server#start
 * @param {module:akkaserverless.Server~startOptions=} options The options for starting the server.
 * @returns {number} The port number that the server bound to.
 */

/**
 * Shutdown the server
 *
 * @function module:akkaserverless.Server#shutdown
 */

/**
 * Options for starting a server.
 *
 * @typedef module:akkaserverless.Server~startOptions
 * @property {string} [bindAddress="0.0.0.0"] The address to bind to.
 * @property {number} [bindPort=8080] The port to bind to, specify zero for a random ephemeral port.
 */

/**
 * An Akka Serverless entity.
 *
 * @interface module:akkaserverless.Entity
 * @extends module:akkaserverless.Server
 */


/**
 * An Akka Serverless root server.
 *
 * @memberOf module:akkaserverless
 * @extends module:akkaserverless.Server
 */
class AkkaServerless {

  /**
   * @typedef module:akkaserverless.AkkaServerless~options
   * @property {string} [serviceName=<name from package.json>] The name of this service.
   * @property {string} [serviceVersion=<version from package.json>] The version of this service.
   * @property {string} [descriptorSetPath="user-function.desc"] A path to a compiled Protobuf FileDescriptor set,
   * as output by protoc --descriptor_set_out=somefile.desc. This file must contain all of the component services that
   * this user function serves.
   */

  /**
   * Create a new akkaserverless server.
   *
   * @param {module:akkaserverless.AkkaServerless~options=} options The options for this server.
   */
  constructor(options) {
    this.options = {
      ...{
        descriptorSetPath: "user-function.desc"
      },
      ...serviceInfo,
      ...options
    };

    try {
      this.proto = fs.readFileSync(this.options.descriptorSetPath);
    } catch (e) {
      console.error("Unable to read protobuf descriptor from: " + this.options.descriptorSetPath);
      throw e;
    }

    this.components = [];
  }

  /**
   * Add an component to this server.
   *
   * @param {module:akkaserverless.Component} components The components to add.
   * @returns {module:akkaserverless.AkkaServerless} This server.
   */
  addComponent(...components) {
    this.components = this.components.concat(components);
    return this;
  }

  /**
   * Start this server.
   *
   * @param {module:akkaserverless.AkkaServerless~startOptions=} options The options for starting.
   * @returns {number} The port that was bound to, useful for when a random ephemeral port was requested.
   */
  start(options) {
    const opts = {
      ...defaultOptions,
      ...options
    };

    const allComponentsMap = {};
    this.components.forEach(component => {
      allComponentsMap[component.serviceName] = component.service;
    });

    const componentTypes = {};
    this.components.forEach(component => {
      const componentServices = component.register(allComponentsMap);
      componentTypes[componentServices.componentType()] = componentServices;
    });

    this.server = new grpc.Server();

    Object.values(componentTypes).forEach(services => {
      services.register(this.server);
    });

    const includeDirs = [
      path.join(__dirname, "..", "proto"),
      path.join(__dirname, "..", "protoc", "include")
    ];
    const packageDefinition = protoLoader.loadSync(path.join("akkaserverless", "protocol", "discovery.proto"), {
      includeDirs: includeDirs
    });
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const discovery = grpcDescriptor.akkaserverless.protocol.Discovery.service;

    this.server.addService(discovery, {
      discover: this.discover.bind(this),
      reportError: this.reportError.bind(this)
    });

    const boundPort = this.server.bind(opts.bindAddress + ":" + opts.bindPort, grpc.ServerCredentials.createInsecure());
    this.server.start();
    console.log("gRPC server started on " + opts.bindAddress + ":" + boundPort);

    return boundPort;
  }

  // detect hybrid proxy version probes when protocol version 0.0 (or undefined)
  isVersionProbe(info) {
    return !info.protocolMajorVersion && !info.protocolMinorVersion
  }

  discover(call, callback) {
    const proxyInfo = call.request;
    const protocolVersion = settings.protocolVersion();
    const serviceInfo = {
      serviceName: this.options.serviceName,
      serviceVersion: this.options.serviceVersion,
      serviceRuntime: process.title + " " + process.version,
      supportLibraryName: packageInfo.name,
      supportLibraryVersion: packageInfo.version,
      protocolMajorVersion: protocolVersion.major,
      protocolMinorVersion: protocolVersion.minor
    }
    if (this.isVersionProbe(proxyInfo)) {
      // only (silently) send service info for hybrid proxy version probe
      callback(null, { serviceInfo: serviceInfo })
    } else {
      debug("Discover call with info %o, sending %s components", proxyInfo, this.components.length);
      const components = this.components.map(component => {
        const passivationTimeout = component.options.entityPassivationStrategy ? component.options.entityPassivationStrategy.timeout : null;
        const passivationStrategy = passivationTimeout ? { timeout: { timeout: passivationTimeout } } : {};
        return {
          componentType: component.componentType(),
          serviceName: component.serviceName,
          entity: {
            entityType: component.options.entityType,
            passivationStrategy: passivationStrategy
          }
        };
      });
      callback(null, {
        proto: this.proto,
        components: components,
        serviceInfo: serviceInfo
      });
    }
  }

  docLinkFor(code) {
    const specificCodes = {
      "AS-00112": "js-services/views.html#changing",
      "AS-00402": "js-services/topic-eventing.html",
      "AS-00406": "js-services/topic-eventing.html"
    }
    let path = specificCodes[code]
    if (!path) {
      const codeCategories = {
        // "AS-001": "js-services/views.html", not in place yet
        "AS-002": "js-services/value-entity.html",
        "AS-003": "js-services/eventsourced.html",
        "AS-004": "js-services/" // no single page for eventing
      }
      path = codeCategories[code.substr(0, 6)]
    }

    if (path)
      return "https://developer.lightbend.com/docs/akka-serverless/" + path
    else
      return ""
  }

  reportError(call, callback) {
    let msg = "Error reported from Akka system: " + call.request.code + " " + call.request.message;
    if (call.request.detail) {
      msg += "\n\n" + call.request.detail;
    }

    if(call.request.code) {
      const docLink = this.docLinkFor(call.request.code)
      if (docLink)
        msg += " See documentation: " + docLink
      for (const location of (call.request.sourceLocations || [])) {
        msg += "\n\n" + this.formatSource(location)
      }
    }
    
    console.error(msg);
    callback(null, {});
  }

  formatSource(location) {
    let startLine = location.startLine;
    if (startLine === undefined) {
      startLine = 0;
    }
    let endLine = location.endLine;
    if (endLine === undefined) {
      endLine = 0;
    }
    let startCol = location.startCol;
    if (startCol === undefined) {
      startCol = 0;
    }
    let endCol = location.endCol;
    if (endCol === undefined) {
      endCol = 0;
    }
    if (endLine === 0 && endCol === 0) {
      // It's been sent without line/col data
      return "At " + location.fileName;
    }
    // First, we need to location the protobuf file that it's from. To do that, we need to look in the include dirs
    // of each entity.
    for (const component of this.components) {
      for (const includeDir of component.options.includeDirs) {
        const file = path.resolve(includeDir, location.fileName);
        if (fs.existsSync(file)) {
          const lines = fs.readFileSync(file).toString("utf-8")
              .split(/\r?\n/)
              .slice(startLine, endLine + 1)
          let content = "";
          if (lines.length > 1) {
            content = lines.join("\n")
          } else if (lines.length === 1) {
            const line = lines[0]
            content = line + "\n";
            for (let i = 0; i < Math.min(line.length, startCol); i++) {
              if (line.charAt(i) === "\t") {
                content += "\t";
              } else {
                content += " ";
              }
            }
            content += "^";
          }
          return "At " + location.fileName + ":" + (startLine + 1) + ":" + (startCol + 1) + ":" + "\n" + content
        }
      }
    }
    return "At " + location.fileName + ":" + (startLine + 1) + ":" + (startCol + 1);
  }

  shutdown() {
    this.server.tryShutdown(() => {
      console.log("gRPC server has shutdown.");
    });
  }
}

module.exports = AkkaServerless;
