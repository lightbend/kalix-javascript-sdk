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
import * as fs from 'fs';
import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as settings from '../settings';

import * as discovery from '../proto/kalix/protocol/discovery_pb';
import * as discovery_grpc from '../proto/kalix/protocol/discovery_grpc_pb';
import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb';
import { PackageInfo } from './package-info';

function loadJson(filename: string) {
  return JSON.parse(fs.readFileSync(filename).toString());
}

const userPkgJson = path.join(process.cwd(), 'package.json');

export interface KalixOptions {
  /**
   * The name of this service (defaults to name from package.json).
   */
  serviceName?: string;
  /**
   * The version of this service (defaults to version from package.json).
   */
  serviceVersion?: string;
  /**
   * Path to a Protobuf FileDescriptor set, as output by protoc --descriptor_set_out=somefile.desc.
   * This file must contain all of the component services that this Kalix service serves.
   * See the `compile-descriptor` command for creating this file.
   */
  descriptorSetPath?: string;
}

class ServiceInfo {
  readonly name: string;
  readonly version: string;
  private pkgName: string = 'unknown';
  private pkgVersion: string = '0.0.0';

  constructor(name?: string, version?: string, filename: string = userPkgJson) {
    if (!name || !version) {
      this.loadFromPkg(filename);
    }
    this.name = name || this.pkgName;
    this.version = version || this.pkgVersion;
  }

  private loadFromPkg(filename: string = userPkgJson) {
    const json = loadJson(filename);
    this.pkgName = json.name;
    this.pkgVersion = json.version;
  }
}

interface ServiceBinding {
  /**
   * The address to bind the Kalix service to.
   */
  address?: string;
  /**
   * The port to bind the Kalix service to.
   */
  port?: number;
}

export interface ComponentService {
  componentType: () => string;
  register: (server: grpc.Server) => void;
}

export interface EntityPassivationStrategy {
  timeout?: number;
}

export enum ReplicatedWriteConsistency {
  /**
   * Updates will only be written to the local replica immediately, and then asynchronously
   * distributed to other replicas in the background.
   */
  LOCAL,
  /**
   * Updates will be written immediately to a majority of replicas, and then asynchronously
   * distributed to remaining replicas in the background.
   */
  MAJORITY,
  /**
   * Updates will be written immediately to all replicas.
   */
  ALL,
}

export interface ComponentOptions {
  includeDirs?: Array<string>;
  forwardHeaders?: Array<string>;
  entityType?: string;
}

export interface EntityOptions {
  entityType: string;
  includeDirs?: Array<string>;
  entityPassivationStrategy?: EntityPassivationStrategy;
  forwardHeaders?: Array<string>;
  replicatedWriteConsistency?: ReplicatedWriteConsistency;
}

export interface Component {
  serviceName: string;
  desc?: string | string[];
  service?: any;
  options: ComponentOptions | EntityOptions;
  grpc?: grpc.GrpcObject;
  componentType: () => string;
  register?: (components: any) => ComponentService;
}

class DocLink {
  private specificCodes: Map<string, string> = new Map([
    ['AS-00112', 'javascript/views.html#changing'],
    ['AS-00402', 'javascript/topic-eventing.html'],
    ['AS-00406', 'javascript/topic-eventing.html'],
    ['AS-00414', 'javascript/entity-eventing.html'],
    // TODO: docs for value entity eventing (https://github.com/kalix-io/kalix-javascript-sdk/issues/103)
    // ['AS-00415', 'javascript/entity-eventing.html'],
  ]);
  private codeCategories: Map<string, string> = new Map([
    ['AS-001', 'javascript/views.html'],
    ['AS-002', 'javascript/value-entity.html'],
    ['AS-003', 'javascript/eventsourced.html'],
    ['AS-004', 'javascript/'], // no single page for eventing
    ['AS-005', 'javascript/'], // no docs yet for replicated entities
    ['AS-006', 'javascript/proto.html#_transcoding_http'], // all HTTP API errors
  ]);

  constructor(private baseUrl: string = 'https://docs.kalix.io/') {
    this.specificCodes.forEach((value, key) => key.length >= 6);
  }

  getLink(code: string) {
    const shortCode = code.substr(0, 6);
    if (this.specificCodes.has(code)) {
      return `${this.baseUrl}${this.specificCodes.get(code)}`;
    } else if (this.codeCategories.has(shortCode)) {
      return `${this.baseUrl}${this.codeCategories.get(shortCode)}`;
    } else {
      return '';
    }
  }
}

class SourceFormatter {
  constructor(private location: discovery.UserFunctionError.SourceLocation) {}

  getLocationString(components: Array<Component>) {
    if (this.location.getEndLine() === 0 && this.location.getEndCol() === 0) {
      // It's been sent without line/col data
      return `At ${this.location.getFileName}`;
    }
    // First, we need to location the protobuf file that it's from. To do that, we need to look in the include dirs
    // of each entity.
    for (const component of components) {
      for (const includeDir of component.options?.includeDirs ?? []) {
        const file = path.resolve(includeDir, this.location.getFileName());
        if (fs.existsSync(file)) {
          const lines = fs
            .readFileSync(file)
            .toString('utf-8')
            .split(/\r?\n/)
            .slice(
              this.location.getStartLine(),
              this.location.getEndLine() + 1,
            );
          let content = '';
          if (lines.length > 1) {
            content = lines.join('\n');
          } else if (lines.length === 1) {
            const line = lines[0];
            content = line + '\n';
            for (
              let i = 0;
              i < Math.min(line.length, this.location.getStartCol());
              i++
            ) {
              if (line.charAt(i) === '\t') {
                content += '\t';
              } else {
                content += ' ';
              }
            }
            content += '^';
          }
          return `At ${this.location.getFileName()}:${
            this.location.getStartLine() + 1
          }:${this.location.getStartCol() + 1}:\n${content}`;
        }
      }
    }
    return `At ${this.location.getFileName()}:${
      this.location.getStartLine() + 1
    }:${this.location.getStartCol() + 1}`;
  }
}

/**
 * Kalix service.
 *
 * @param options - the options for starting the service
 */
export class Kalix {
  private address: string = process.env.HOST || '127.0.0.1';
  private port: number =
    (process.env.PORT ? parseInt(process.env.PORT) : undefined) || 8080;
  private descriptorSetPath: string = 'user-function.desc';
  private service: ServiceInfo;
  private packageInfo: PackageInfo = new PackageInfo();
  private components: Array<Component> = [];
  private proto: Buffer;
  private server: grpc.Server;
  private runtime: string = `${process.title} ${process.version}`;
  private protocolMajorVersion: number = parseInt(
    settings.protocolVersion().major,
  );
  private protocolMinorVersion: number = parseInt(
    settings.protocolVersion().minor,
  );
  private docLink = new DocLink();

  private proxySeen: boolean = false;
  private proxyHasTerminated: boolean = false;
  private waitingForProxyTermination: boolean = false;
  private devMode: boolean = false;

  constructor(options?: KalixOptions) {
    if (options?.descriptorSetPath) {
      this.descriptorSetPath = options.descriptorSetPath;
    }

    this.service = new ServiceInfo(
      options?.serviceName,
      options?.serviceVersion,
    );

    try {
      this.proto = fs.readFileSync(this.descriptorSetPath);
    } catch (e) {
      throw new Error(
        `Unable to read protobuf descriptor from: ${this.descriptorSetPath}`,
      );
    }

    this.server = new grpc.Server();
  }

  /**
   * Add one or more components to this Kalix service.
   *
   * @param components - the components to add
   * @returns this Kalix service
   */
  addComponent(...components: Array<Component>): Kalix {
    this.components = this.components.concat(components);
    return this;
  }

  getComponents() {
    return this.components;
  }

  afterStart(port: number) {
    console.log('Kalix service started on ' + this.address + ':' + port);

    process.on('SIGTERM', () => {
      if (!this.proxySeen || this.proxyHasTerminated || this.devMode) {
        console.debug('Got SIGTERM. Shutting down');
        this.terminate();
      } else {
        console.debug(
          'Got SIGTERM. But did not yet see proxy terminating, deferring shutdown until proxy stops',
        );
        // no timeout because process will be SIGKILLed anyway if it does not get the proxy termination in time
        this.waitingForProxyTermination = true;
      }
    });
  }

  /**
   * Start the Kalix service.
   * @param binding - optional address/port binding to start the service on
   * @returns a Promise of the bound port for this service
   */
  start(binding?: ServiceBinding): Promise<number> {
    if (binding) {
      if (binding.address) {
        this.address = binding.address;
      }
      if (binding.port) {
        this.port = binding.port;
      }
    }

    const allComponentsMap: any = {};
    this.components.forEach((component: Component) => {
      allComponentsMap[component.serviceName ?? 'undefined'] =
        component.service;
    });

    const componentTypes: any = {};
    this.components.forEach((component: Component) => {
      if (component.register) {
        const componentServices = component.register(allComponentsMap);
        componentTypes[componentServices.componentType()] = componentServices;
      }
    });

    Object.values(componentTypes).forEach((services: any) => {
      services.register(this.server);
    });

    const discoveryServer = this.getDiscoveryServer();

    this.server.addService(discovery_grpc.DiscoveryService, discoveryServer);

    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `${this.address}:${this.port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
          if (err) {
            console.error(`Server error: ${err.message}`);
            reject(err);
          } else {
            console.log(`Server bound on port: ${port}`);
            this.server.start();
            this.afterStart(port);
            resolve(port);
          }
        },
      );
    });
  }

  docLinkFor(code: string) {
    return this.docLink.getLink(code);
  }

  formatSource(location: discovery.UserFunctionError.SourceLocation) {
    return new SourceFormatter(location).getLocationString(this.components);
  }

  getDiscoveryServer() {
    const that = this;
    const discoveryServer: discovery_grpc.IDiscoveryServer = {
      discover(
        call: grpc.ServerUnaryCall<discovery.ProxyInfo, discovery.Spec>,
        callback: grpc.sendUnaryData<discovery.Spec>,
      ) {
        const result = that.discoveryLogic(call.request);
        callback(null, result);
      },
      reportError(
        call: grpc.ServerUnaryCall<
          discovery.UserFunctionError,
          google_protobuf_empty_pb.Empty
        >,
        callback: grpc.sendUnaryData<google_protobuf_empty_pb.Empty>,
      ) {
        const msg = that.reportErrorLogic(
          call.request.getCode(),
          call.request.getMessage(),
          call.request.getDetail(),
          call.request.getSourceLocationsList(),
        );

        console.error(msg);
        callback(null, new google_protobuf_empty_pb.Empty());
      },
      proxyTerminated(
        call: grpc.ServerUnaryCall<
          google_protobuf_empty_pb.Empty,
          google_protobuf_empty_pb.Empty
        >,
        callback: grpc.sendUnaryData<google_protobuf_empty_pb.Empty>,
      ) {
        that.proxyTerminatedLogic();
        callback(null, new google_protobuf_empty_pb.Empty());
      },
      healthCheck(
        call: grpc.ServerUnaryCall<
          google_protobuf_empty_pb.Empty,
          google_protobuf_empty_pb.Empty
        >,
        callback: grpc.sendUnaryData<google_protobuf_empty_pb.Empty>,
      ) {
        callback(null, new google_protobuf_empty_pb.Empty());
      },
    };

    return discoveryServer;
  }

  /**
   * Shut down the Kalix service.
   */
  shutdown(): void {
    this.tryShutdown(() => {
      console.log('Kalix service has shutdown.');
    });
  }

  /**
   * Shut down the Kalix service.
   *
   * @param callback - shutdown callback, accepting possible error
   */
  tryShutdown(callback: (error?: Error) => void): void {
    this.server.tryShutdown(callback);
  }

  terminate() {
    this.server.forceShutdown();
    process.exit(0);
  }

  reportErrorLogic(
    code: string | undefined,
    message: string | undefined,
    detail: string | undefined,
    locations: Array<discovery.UserFunctionError.SourceLocation> | undefined,
  ) {
    let msg = `Error reported from Kalix system: ${code} ${message}`;
    if (detail) {
      msg += `\n\n${detail}`;
    }

    if (code) {
      const docLink = this.docLink.getLink(code);
      if (docLink.length > 0)
        msg += `\nSee documentation: ${this.docLink.getLink(code)}`;
      for (const location of locations || []) {
        msg += `\n\n${this.formatSource(location)}`;
      }
    }

    return msg;
  }

  // detect hybrid proxy version probes when protocol version 0.0 (or undefined)
  isVersionProbe(proxyInfo: discovery.ProxyInfo) {
    return (
      !proxyInfo.getProtocolMajorVersion() &&
      !proxyInfo.getProtocolMinorVersion()
    );
  }

  discoveryLogic(proxyInfo: discovery.ProxyInfo): discovery.Spec {
    const serviceInfo = new discovery.ServiceInfo()
      .setServiceName(this.service.name)
      .setServiceVersion(this.service.version)
      .setServiceRuntime(this.runtime)
      .setSupportLibraryName(this.packageInfo.name)
      .setSupportLibraryVersion(this.packageInfo.version)
      .setProtocolMajorVersion(this.protocolMajorVersion)
      .setProtocolMinorVersion(this.protocolMinorVersion);

    const spec = new discovery.Spec().setServiceInfo(serviceInfo);

    if (this.isVersionProbe(proxyInfo)) {
      // only (silently) send service info for hybrid proxy version probe
    } else {
      this.proxySeen = true;
      this.devMode = proxyInfo.getDevMode();
      this.proxyHasTerminated = false;

      console.debug(
        `Discover call with info ${proxyInfo}, sending ${this.components.length} components`,
      );

      const components = this.components.map((component) => {
        const res = new discovery.Component();

        res.setServiceName(component.serviceName);
        res.setComponentType(component.componentType());

        if (res.getComponentType().indexOf('Entities') > -1) {
          // entities has EntityOptions / EntitySettings
          const entityOptions = component.options as EntityOptions;
          const entitySettings = new discovery.EntitySettings();
          if (entityOptions.entityType) {
            entitySettings.setEntityType(entityOptions.entityType);
          }
          if (entityOptions.entityPassivationStrategy?.timeout) {
            const ps = new discovery.PassivationStrategy().setTimeout(
              new discovery.TimeoutPassivationStrategy().setTimeout(
                entityOptions.entityPassivationStrategy.timeout,
              ),
            );
            entitySettings.setPassivationStrategy(ps);
          }
          if (entityOptions.forwardHeaders) {
            entitySettings.setForwardHeadersList(entityOptions.forwardHeaders);
          }
          if (entityOptions.replicatedWriteConsistency) {
            const replicatedEntitySettings =
              new discovery.ReplicatedEntitySettings();
            let writeConsistency =
              discovery.ReplicatedWriteConsistency
                .REPLICATED_WRITE_CONSISTENCY_LOCAL_UNSPECIFIED;
            switch (entityOptions.replicatedWriteConsistency) {
              case ReplicatedWriteConsistency.ALL:
                writeConsistency =
                  discovery.ReplicatedWriteConsistency
                    .REPLICATED_WRITE_CONSISTENCY_ALL;
                break;
              case ReplicatedWriteConsistency.MAJORITY:
                writeConsistency =
                  discovery.ReplicatedWriteConsistency
                    .REPLICATED_WRITE_CONSISTENCY_MAJORITY;
                break;
              default:
                writeConsistency =
                  discovery.ReplicatedWriteConsistency
                    .REPLICATED_WRITE_CONSISTENCY_LOCAL_UNSPECIFIED;
            }
            replicatedEntitySettings.setWriteConsistency(writeConsistency);
            entitySettings.setReplicatedEntity(replicatedEntitySettings);
          }

          res.setEntity(entitySettings);
        } else if (res.getComponentType().indexOf('View') > -1) {
          // views need to use entity settings to be able to pass view id (as entity_id)
          const componentOptions = component.options as ComponentOptions;
          const entitySettings = new discovery.EntitySettings();
          if (componentOptions.entityType) {
            entitySettings.setEntityType(componentOptions.entityType);
          }
          if (componentOptions.forwardHeaders) {
            entitySettings.setForwardHeadersList(
              componentOptions.forwardHeaders,
            );
          }
          res.setEntity(entitySettings);
        } else {
          // other components has ComponentOptions / GenericComponentSettings
          const componentOptions = component.options as ComponentOptions;
          const componentSettings = new discovery.GenericComponentSettings();
          if (componentOptions.forwardHeaders) {
            componentSettings.setForwardHeadersList(
              componentOptions.forwardHeaders,
            );
          }
        }

        return res;
      });

      spec.setProto(this.proto).setComponentsList(components);
    }

    return spec;
  }

  proxyTerminatedLogic() {
    this.proxyHasTerminated = true;
    if (this.waitingForProxyTermination) {
      this.terminate();
    }
  }
}

/**
 * The GRPC status codes.
 */
export enum GrpcStatus {
  Ok = 0,
  Cancelled = 1,
  Unknown = 2,
  InvalidArgument = 3,
  DeadlineExceeded = 4,
  NotFound = 5,
  AlreadyExists = 6,
  PermissionDenied = 7,
  ResourceExhausted = 8,
  FailedPrecondition = 9,
  Aborted = 10,
  OutOfRange = 11,
  Unimplemented = 12,
  Internal = 13,
  Unavailable = 14,
  DataLoss = 15,
  Unauthenticated = 16,
}
