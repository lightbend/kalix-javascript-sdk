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

import { AkkaServerless, Bindings } from "./akkaserverless";

const grpc = require('@grpc/grpc-js');
const settings = require('../settings');
const { GenericContainer, TestContainers, Wait } = require('testcontainers');
const util = require('util');

const defaultOptions = {
  dockerImage: `gcr.io/akkaserverless-public/akkaserverless-proxy:${settings.frameworkVersion}`,
};

/**
 * @private
 */
class IntegrationTestkit {
  private options: any;
  private clients: any;
  private akkaServerless: AkkaServerless;
  private proxyContainer: any;

  constructor(options: any) {
    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.clients = {};
    this.akkaServerless = new AkkaServerless(options);
  }

  /**
   * Add the given component to this testkit.
   *
   * @param component The component.
   */
  addComponent(component: any) {
    this.akkaServerless.addComponent(component);
  }

  start(callback: any) {
    // First start this user function
    const bindings = new Bindings(process.env.HOST, 0);
    const boundPortPromise = this.akkaServerless.start(bindings);

    const tcExposePortPromise = (boundPort: number) => {
      TestContainers.exposeHostPorts(boundPort);
      return boundPort;
    };

    const serverPromise = (boundPort: number) =>
      new GenericContainer(this.options.dockerImage)
        .withExposedPorts(9000)
        .withEnv('USER_FUNCTION_HOST', 'host.testcontainers.internal')
        .withEnv('USER_FUNCTION_PORT', boundPort.toString())
        .withEnv('HTTP_PORT', '9000')
        .withWaitStrategy(Wait.forLogMessage('Akka Serverless proxy online'))
        .start()
        .then((proxyContainer: any) => {
          this.proxyContainer = proxyContainer;

          const proxyPort = proxyContainer.getMappedPort(9000);

          // Create clients
          this.akkaServerless.getComponents().forEach((entity: any) => {
            const parts = entity.serviceName.split('.');
            let stub = entity.grpc;
            parts.forEach((part: any) => {
              stub = stub[part];
            });
            const client = new stub(
              'localhost:' + proxyPort,
              grpc.credentials.createInsecure(),
            );
            this.clients[parts[parts.length - 1]] =
              this.promisifyClient(client);
          });

          return this;
        });

    const executionPromise = boundPortPromise
      .then(tcExposePortPromise)
      .then(serverPromise);

    if (typeof callback === 'function') {
      executionPromise.then(
        () => callback(),
        (error) => callback(error),
      );
    } else {
      return executionPromise;
    }
  }

  // add async versions of unary request methods, suffixed with "Async"
  promisifyClient(client: any) {
    Object.keys(Object.getPrototypeOf(client)).forEach((methodName) => {
      const methodFunction = client[methodName];
      if (
        methodFunction.requestStream == false &&
        methodFunction.responseStream == false
      ) {
        client[methodName + 'Async'] = util
          .promisify(methodFunction)
          .bind(client);
      }
    });
    return client;
  }

  shutdown(callback: any) {
    if (this.proxyContainer !== undefined) {
      this.proxyContainer.stop();
    }

    Object.getOwnPropertyNames(this.clients).forEach((client) => {
      this.clients[client].close();
    });

    this.akkaServerless.shutdown();

    if (typeof callback === 'function') {
      callback();
    }
  }
}

module.exports = IntegrationTestkit;
