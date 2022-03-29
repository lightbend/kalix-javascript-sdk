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

import * as grpc from '@grpc/grpc-js';
import * as settings from '../settings';
import { GrpcUtil } from './grpc-util';

import { Kalix, Component } from './kalix';
import { GenericContainer, TestContainers, Wait } from 'testcontainers';

const defaultDockerImage = `gcr.io/akkaserverless-public/kalix-proxy:${settings.frameworkVersion.replace('-SNAPSHOT', '')}`;

/**
 * Integration Testkit.
 */
export class IntegrationTestkit {
  private options: any = { dockerImage: defaultDockerImage };
  private clients: any;
  private kalix: Kalix;
  private proxyContainer: any;

  constructor(options?: any) {
    if (options) {
      this.options = options;
      if (!options.dockerImage) {
        this.options.dockerImage = defaultDockerImage;
      }
    }

    this.clients = {};
    this.kalix = new Kalix(options);
  }

  /**
   * Add the given component to this testkit.
   *
   * @param component - the component to add
   * @returns this testkit
   */
  addComponent(component: Component): IntegrationTestkit {
    this.kalix.addComponent(component);
    return this;
  }

  // This encoding is compatible with this issue:
  // https://github.com/mochajs/mocha/issues/2407
  /**
   * Start the testkit, with the registered components.
   *
   * @param callback - start callback, accepting possible error
   */
  start(callback: any): void {
    const result = this.asyncStart();
    if (typeof callback === 'function') {
      result.then(
        () => callback(),
        (error) => callback(error),
      );
    }
  }

  private async asyncStart() {
    // First start this user function
    const boundPort = await this.kalix.start({ port: 0 });

    await TestContainers.exposeHostPorts(boundPort);

    const proxyContainer = await new GenericContainer(this.options.dockerImage)
      .withExposedPorts(9000)
      .withEnv('USER_FUNCTION_HOST', 'host.testcontainers.internal')
      .withEnv('USER_FUNCTION_PORT', boundPort.toString())
      .withEnv('HTTP_PORT', '9000')
      .withEnv(
        'VERSION_CHECK_ON_STARTUP',
        process.env.VERSION_CHECK_ON_STARTUP || 'true',
      )
      .withWaitStrategy(Wait.forLogMessage('gRPC proxy started'))
      .start();

    this.proxyContainer = proxyContainer;

    const proxyPort = proxyContainer.getMappedPort(9000);

    // Create clients
    this.kalix.getComponents().forEach((entity: Component) => {
      const parts = entity.serviceName ? entity.serviceName.split('.') : [];
      if (entity.grpc) {
        let stub: any = entity.grpc;
        parts.forEach((part: string) => {
          stub = stub[part];
        });
        const client = new stub(
          'localhost:' + proxyPort,
          grpc.credentials.createInsecure(),
        );
        this.clients[parts[parts.length - 1]] = GrpcUtil.promisifyClient(
          client,
          'Async',
        );
      }
    });
  }

  /**
   * Shut down the testkit.
   *
   * @param callback - shutdown callback, accepting possible error
   */
  shutdown(callback: (error?: any) => void) {
    Object.getOwnPropertyNames(this.clients).forEach((client) => {
      this.clients[client].close();
    });
    let proxyContainerStopped: Promise<void>;
    if (this.proxyContainer !== undefined) {
      // Important, ensure that the proxy container is stopped before we shut down
      // ourselves, otherwise it will try to reconnect and that will cause unhandled
      // exceptions.
      proxyContainerStopped = this.proxyContainer.stop();
    } else {
      proxyContainerStopped = Promise.resolve();
    }
    proxyContainerStopped.then(
      () => this.kalix.tryShutdown(callback),
      (err) => this.kalix.tryShutdown(() => callback(err)),
    );
  }
}
