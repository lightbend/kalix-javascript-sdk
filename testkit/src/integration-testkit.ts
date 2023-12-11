/*
 * Copyright 2021-2023 Lightbend Inc.
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
import {
  Component,
  GrpcUtil,
  Kalix,
  KalixOptions,
  LocalServicePrincipal,
  PredefinedPrincipal,
  Principal,
  settings,
} from '@kalix-io/kalix-javascript-sdk';
import { GenericContainer, TestContainers, Wait } from 'testcontainers';

const defaultDockerImage = `gcr.io/kalix-public/kalix-proxy:${settings.frameworkVersion.replace(
  '-SNAPSHOT',
  '',
)}`;

/** @public */
export namespace IntegrationTestkit {
  /**
   * Callback for start, accepting possible error.
   *
   * @param error - Error on starting the testkit.
   */
  export type StartCallback = (error?: Error) => void;

  /**
   * Callback for shutdown, accepting possible error.
   *
   * @param error - Error on shutting down the testkit.
   */
  export type ShutdownCallback = (error?: Error) => void;
}

/**
 * @public
 */
export interface IntegrationTestKitOptions extends KalixOptions {
  /**
   * Whether ACL checking is enabled.
   */
  aclCheckingEnabled?: boolean;
  /**
   * Docker image to test
   */
  dockerImage?: string;
}

/**
 * Integration Testkit.
 *
 * @public
 */
export class IntegrationTestkit {
  private options: IntegrationTestKitOptions;
  private componentClients: { [serviceName: string]: any };
  private kalix: Kalix;
  private proxyContainer: any;
  private proxyPort?: number;

  /**
   * Integration Testkit.
   *
   * @param options - Options for the testkit and Kalix service
   */
  constructor(options?: IntegrationTestKitOptions) {
    if (options) {
      this.options = options;
    } else {
      this.options = {};
    }

    this.options.delayDiscoveryUntilProxyPortSet = true;

    // sensible defaults for missing values
    if (!this.options.dockerImage) {
      this.options.dockerImage = defaultDockerImage;
    }
    if (!this.options.serviceName) {
      this.options.serviceName = 'self';
    }

    this.componentClients = {};
    this.kalix = new Kalix(this.options);
  }

  /**
   * Get promisified gRPC clients, by service name.
   */
  get clients(): { [serviceName: string]: any } {
    return this.componentClients;
  }

  /**
   * Get promisified gRPC clients, authenticating using the given principal.
   *
   * @param principal The principal to authenticate calls to the service as.
   */
  clientsForPrincipal(principal: Principal): { [serviceName: string]: any } {
    var serviceName: string;
    if (principal == PredefinedPrincipal.Self) {
      serviceName = this.options.serviceName!;
    } else if (principal instanceof LocalServicePrincipal) {
      serviceName = principal.name.toString();
    } else {
      throw new Error("Only 'Self' and 'LocalServicePrincipal' is supported");
    }
    const metadata = new grpc.Metadata();
    metadata.add('impersonate-kalix-service', serviceName);
    return this.createClients(this.proxyPort!, metadata);
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
  start(callback: IntegrationTestkit.StartCallback): void {
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
    console.log('Starting Kalix Proxy');
    const proxyContainer = await new GenericContainer(this.options.dockerImage!)
      .withExposedPorts(9000)
      .withEnv('USER_FUNCTION_HOST', 'host.testcontainers.internal')
      .withEnv('USER_FUNCTION_PORT', boundPort.toString())
      .withEnv('HTTP_PORT', '9000')
      .withEnv('SERVICE_NAME', this.options.serviceName!)
      .withEnv(
        'ACL_ENABLED',
        (this.options.aclCheckingEnabled ?? false).toString(),
      )
      .withEnv(
        'VERSION_CHECK_ON_STARTUP',
        process.env.VERSION_CHECK_ON_STARTUP || 'true',
      )
      // https://github.com/lightbend/kalix-runtime/blob/4136a07e203e3ebb5b03777aefbe9d72549fe859/proxy/core/src/main/scala/kalix/proxy/KalixRuntimeMain.scala#L77
      .withWaitStrategy(Wait.forLogMessage('Starting Kalix '))
      .start();
    this.proxyPort = proxyContainer.getMappedPort(9000);
    // sdk needs to know how to call itself for cross component calls,
    // Note: a flag in KalixOptions delays discovery until we have set the port
    this.kalix.setProxyPort(this.proxyPort!);

    this.proxyContainer = proxyContainer;

    // wait for discovery to complete
    console.log('Proxy started, waiting for discovery to complete');
    while (!this.kalix.discoveryCompleted) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    // FIXME why is so much time needed here?
    // wait some more for proxy to complete parsing/starting the discovered services
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Create clients
    this.componentClients = this.createClients(this.proxyPort);
  }

  private createClients(
    proxyPort: number,
    additionalRequestMetadata?: grpc.Metadata,
  ): any {
    const clients: any = {};
    this.kalix.getComponents().forEach((component: Component) => {
      const parts = component.serviceName
        ? component.serviceName.split('.')
        : [];
      if ((component as any).grpc) {
        let stub: any = (component as any).grpc;
        parts.forEach((part: string) => {
          stub = stub[part];
        });
        const client = new stub(
          'localhost:' + proxyPort,
          grpc.credentials.createInsecure(),
        );
        if (additionalRequestMetadata) {
          GrpcUtil.addHeadersToAllRequests(client, additionalRequestMetadata);
        }
        clients[parts[parts.length - 1]] = GrpcUtil.promisifyClient(
          client,
          'Async',
        );
      }
    });
    return clients;
  }

  /**
   * Shut down the testkit.
   *
   * @param callback - shutdown callback, accepting possible error
   */
  shutdown(callback: IntegrationTestkit.ShutdownCallback) {
    Object.getOwnPropertyNames(this.componentClients).forEach((client) => {
      this.componentClients[client].close();
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
