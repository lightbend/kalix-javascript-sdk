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

const grpc = require("@grpc/grpc-js");
const AkkaServerless = require("./akkaserverless");
const settings = require("../settings");
const { GenericContainer, TestContainers, Wait } = require("testcontainers");
const util = require("util");

const defaultOptions = {
  dockerImage: `gcr.io/akkaserverless-public/akkaserverless-proxy:${settings.frameworkVersion}`
}

/**
 * @private
 */
class IntegrationTestkit {

  constructor(options) {
    this.options = {
      ...defaultOptions,
      ...options
    }

    this.clients = {};
    this.akkaServerless = new AkkaServerless(options);
  }

  /**
   * Add the given component to this testkit.
   *
   * @param component The component.
   */
  addComponent(component) {
    this.akkaServerless.addComponent(component);
  }

  start(callback) {
    // First start this user function
    const boundPortPromise = this.akkaServerless.start({
      bindPort: 0
    });

    const tcExposePortPromise = (boundPort) => {
      TestContainers.exposeHostPorts(boundPort);
      return boundPort;
    }

    const serverPromise = (boundPort) => new GenericContainer(this.options.dockerImage)
        .withExposedPorts(9000)
        .withEnv("USER_FUNCTION_HOST", "host.testcontainers.internal")
        .withEnv("USER_FUNCTION_PORT", boundPort.toString())
        .withEnv("HTTP_PORT", "9000")
        .withWaitStrategy(Wait.forLogMessage("Akka Serverless proxy online"))
        .start().then(proxyContainer => {

          this.proxyContainer = proxyContainer;

          const proxyPort = proxyContainer.getMappedPort(9000);

          // Create clients
          this.akkaServerless.components.forEach(entity => {
            const parts = entity.serviceName.split(".")
            let stub = entity.grpc;
            parts.forEach(part => {
              stub = stub[part];
            });
            const client = new stub("localhost:" + proxyPort, grpc.credentials.createInsecure());
            this.clients[parts[parts.length - 1]] = this.promisifyClient(client);
          });

          return this;
    });

    const executionPromise = boundPortPromise
      .then(tcExposePortPromise)
      .then(serverPromise)

    if (typeof callback === "function") {
      executionPromise.then(() => callback(), error => callback(error));
    } else {
      return executionPromise;
    }
  }

  // add async versions of unary request methods, suffixed with "Async"
  promisifyClient(client) {
    Object.keys(Object.getPrototypeOf(client)).forEach((methodName) => {
      const methodFunction = client[methodName];
      if (methodFunction.requestStream == false && methodFunction.responseStream == false) {
        client[methodName + "Async"] = util.promisify(methodFunction).bind(client);
      }
    });
    return client;
  }

  shutdown(callback) {
    if (this.proxyContainer !== undefined) {
      this.proxyContainer.stop()
    }

    Object.getOwnPropertyNames(this.clients).forEach(client => {
      this.clients[client].close();
    });

    this.akkaServerless.shutdown();

    if (typeof callback === "function") {
      callback();
    }
  }
}

module.exports = IntegrationTestkit;
