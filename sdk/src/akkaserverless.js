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
const grpc = require("@grpc/grpc-js");
const fs = require("fs");
const settings = require("../settings");

const discovery_messages = require('../proto/akkaserverless/protocol/discovery_pb');
const discovery_services = require('../proto/akkaserverless/protocol/discovery_grpc_pb');
const google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb');

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

// Specific error-link bindings
const specificCodes = new Map([
  ["AS-00112", "javascript/views.html#changing"],
  ["AS-00402", "javascript/topic-eventing.html"],
  ["AS-00406", "javascript/topic-eventing.html"]
]);
const codeCategories = new Map([
  ["AS-001", "javascript/views.html"],
  ["AS-002", "javascript/value-entity.html"],
  ["AS-003", "javascript/eventsourced.html"],
  ["AS-004", "javascript/"] // no single page for eventing
])

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
 * @implements module:akkaserverless.Server
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
    this.proxySeen = false
    this.proxyHasTerminated = false
    this.waitingForProxyTermination = false
    this.devMode = false;
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
   * @param {module:akkaserverless.Server~startOptions=} options The options for starting.
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

    this.server.addService(discovery_services.DiscoveryService, {
      discover: this.discover.bind(this),
      reportError: this.reportError.bind(this),
      proxyTerminated: this.proxyTerminated.bind(this)
    });

    const afterStart = (port) => {
      console.log("gRPC server started on " + opts.bindAddress + ":" + port);

      process.on('SIGTERM', function onSigterm () {
        if (!this.proxySeen || this.proxyHasTerminated || this.devMode) {
          debug('Got SIGTERM. Shutting down')
          this.terminate()
        } else {
          debug('Got SIGTERM. But did not yet see proxy terminating, deferring shutdown until proxy stops')
          // no timeout because process will be SIGKILLed anyway if it does not get the proxy termination in time
          this.waitingForProxyTermination = true
        }
      }.bind(this));
    }

    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        opts.bindAddress + ":" + opts.bindPort,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
          if (err) {
            console.error(`Server error: ${err.message}`);
            reject(err);
          } else {
            console.log(`Server bound on port: ${port}`);
            this.server.start();
            afterStart(port);
            resolve(port);
          }
        },
      );
    });
  }

  // detect hybrid proxy version probes when protocol version 0.0 (or undefined)
  isVersionProbe(info) {
    return !info.getProtocolMajorVersion() && !info.getProtocolMinorVersion()
  }

  discoveryLogic(proxyInfo) {
    const protocolVersion = settings.protocolVersion();
    const serviceInfo = new discovery_messages.ServiceInfo();
    serviceInfo.setServiceName(this.options.serviceName);
    serviceInfo.setServiceVersion(this.options.serviceVersion);
    serviceInfo.setServiceRuntime(process.title + " " + process.version);
    serviceInfo.setSupportLibraryName(packageInfo.name);
    serviceInfo.setSupportLibraryVersion(packageInfo.version);
    serviceInfo.setProtocolMajorVersion(protocolVersion.major);
    serviceInfo.setProtocolMinorVersion(protocolVersion.minor);

    const spec = new discovery_messages.Spec();
    spec.setServiceInfo(serviceInfo)

    if (this.isVersionProbe(proxyInfo)) {
      // only (silently) send service info for hybrid proxy version probe
    } else {
      debug(proxyInfo)
      this.proxySeen = true
      this.devMode = proxyInfo.getDevMode()
      this.proxyHasTerminated = false
      debug("Discover call with info %o, sending %s components", proxyInfo, this.components.length);

      const components = this.components.map(component => {
        const res = new discovery_messages.Component();

        res.setServiceName(component.serviceName);
        res.setComponentType(component.componentType());

        const entity = new discovery_messages.EntitySettings();
        entity.setEntityType(component.options.entityType);
        if (component.options.entityPassivationStrategy) {
          const ps = new discovery_messages.PassivationStrategy();
          const tps = new discovery_messages.TimeoutPassivationStrategy();
          tps.setTimeout(component.options.entityPassivationStrategy.timeout);
          ps.setTimeout(tps);
          entity.setPassivationStrategy(ps);
        }

        res.setEntity(entity);

        return res;
      });

      spec.setProto(this.proto);
      spec.setComponentsList(components);
    }

    return spec;
  }

  discover(call, callback) {
    const proxyInfo = call.request;
    const spec = this.discoveryLogic(proxyInfo);

    callback(null, spec);
  }

  docLinkFor(code) {
    const baseUrl = "https://developer.lightbend.com/docs/akka-serverless/"

    const shortCode = code.substr(0, 6);
    if (specificCodes.has(code)) {
      return `${baseUrl}${specificCodes.get(code)}`;
    } else if (codeCategories.has(shortCode)) {
      return `${baseUrl}${codeCategories.get(shortCode)}`;
    } else {
      return '';
    }
  }

  reportErrorLogic(userError) {
    let msg = "Error reported from Akka system: " + userError.getCode() + " " + userError.getMessage();
    if (userError.getDetail()) {
      msg += "\n\n" + userError.getDetail();
    }

    if(userError.getCode()) {
      const docLink = this.docLinkFor(userError.getCode())
      if (docLink)
        msg += " See documentation: " + docLink
      for (const location of (userError.getSourceLocationsList() || [])) {
        msg += "\n\n" + this.formatSource(location)
      }
    }

    return msg;
  }

  reportError(call, callback) {
    const msg = this.reportErrorLogic(call.request)
    
    console.error(msg);
    callback(null, new google_protobuf_empty_pb.Empty().toObject());
  }

  proxyTerminated() {
    this.proxyHasTerminated = true
    if (this.waitingForProxyTermination) {
      this.terminate()
    }
  }

  formatSource(location) {
    let startLine = location.getStartLine();
    if (startLine === undefined) {
      startLine = 0;
    }
    let endLine = location.getEndLine();
    if (endLine === undefined) {
      endLine = 0;
    }
    let startCol = location.getStartCol();
    if (startCol === undefined) {
      startCol = 0;
    }
    let endCol = location.getEndCol();
    if (endCol === undefined) {
      endCol = 0;
    }
    if (endLine === 0 && endCol === 0) {
      // It's been sent without line/col data
      return "At " + location.getFileName();
    }
    // First, we need to location the protobuf file that it's from. To do that, we need to look in the include dirs
    // of each entity.
    for (const component of this.components) {
      for (const includeDir of component.options.includeDirs) {
        const file = path.resolve(includeDir, location.getFileName());
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
          return "At " + location.getFileName() + ":" + (startLine + 1) + ":" + (startCol + 1) + ":" + "\n" + content
        }
      }
    }
    return "At " + location.getFileName() + ":" + (startLine + 1) + ":" + (startCol + 1);
  }

  shutdown() {
    this.server.tryShutdown(() => {
      console.log("gRPC server has shutdown.");
    });
  }

  terminate() {
    this.server.forceShutdown()
    process.exit(0)
  }
}

module.exports = AkkaServerless;
