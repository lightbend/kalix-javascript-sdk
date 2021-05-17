/*
 * Copyright 2021 Lightbend Inc.
 */

const grpc = require("grpc");
const AkkaServerless = require("./akkaserverless");
const settings = require("../settings");
const { GenericContainer, TestContainers, Wait } = require("testcontainers");
const util = require("util");

const defaultOptions = {
  dockerImage: `gcr.io/akkaserverless-public/akkaserverless-proxy:${settings.frameworkVersion}`
}

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
    const boundPort = this.akkaServerless.start({
      bindPort: 0
    });

    TestContainers.exposeHostPorts(boundPort);

    const serverPromise = new GenericContainer(this.options.dockerImage)
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

    if (typeof callback === "function") {
      serverPromise.then(() => callback(), error => callback(error));
    } else {
      return serverPromise;
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
