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
import * as protoLoader from '@grpc/proto-loader';
import * as settings from './settings';
import { PackageInfo } from './package-info';
import { GrpcClientLookup } from './grpc-util';
import * as discovery from '../types/protocol/discovery';
import { ServerErrorResponse } from '@grpc/grpc-js/build/src/server-call';

const debug = require('debug')('kalix');
debug.log = console.log.bind(console); // bind to stdout

function loadJson(filename: string) {
  return JSON.parse(fs.readFileSync(filename).toString());
}

const userPkgJson = path.join(process.cwd(), 'package.json');

/**
 * Options for the Kalix user function.
 *
 * @public
 */
export interface KalixOptions {
  /**
   * The name of this service.
   *
   * @defaultValue Defaults to name from `package.json`
   */
  serviceName?: string;

  /**
   * The version of this service.
   *
   * @defaultValue Defaults to version from `package.json`
   */
  serviceVersion?: string;

  /**
   * Path to a Protobuf FileDescriptor set, as output by protoc `--descriptor_set_out=somefile.desc`.
   * This file must contain all of the component services that this Kalix service serves.
   * See the `compile-descriptor` command for creating this file.
   *
   * @defaultValue `"user-function.desc"`
   */
  descriptorSetPath?: string;

  /**
   * Delay completing discovery until proxyPort has been set by the testkit.
   */
  delayDiscoveryUntilProxyPortSet?: boolean;
}

/** @internal */
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

/**
 * Service binding with address and port.
 *
 * @public
 */
export interface ServiceBinding {
  /**
   * The address to bind the Kalix service to.
   */
  address?: string;
  /**
   * The port to bind the Kalix service to.
   */
  port?: number;
}

/** @internal */
export interface ComponentServices {
  componentType: () => string;
  register: (server: grpc.Server) => void;
}

/**
 * Entity passivation strategy.
 *
 * @public
 */
export interface EntityPassivationStrategy {
  /**
   * Passivation timeout (in milliseconds).
   */
  timeout?: number;
}

/**
 * Replicated write consistency setting for replicated entities.
 *
 * @public
 */
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

/**
 * Options for a {@link Component}.
 *
 * @public
 */
export interface ComponentOptions {
  /**
   * The entity type name for all entities of this type.
   */
  entityType?: string;

  /**
   * The directories to include when looking up imported protobuf files.
   *
   * @defaultValue Defaults to the current directory `['.']`
   */
  includeDirs?: Array<string>;

  /**
   * Request headers to be forwarded as metadata to the component.
   *
   * @defaultValue Empty `[]`
   */
  forwardHeaders?: Array<string>;
}

/**
 * Options for an {@link Entity}.
 *
 * @public
 */
export interface EntityOptions extends ComponentOptions {
  /**
   * Entity passivation strategy to use.
   */
  entityPassivationStrategy?: EntityPassivationStrategy;
  replicatedWriteConsistency?: ReplicatedWriteConsistency;
}

/**
 * Kalix Component.
 *
 * @public
 */
export interface Component {
  /**
   * The gRPC service name for this component.
   */
  serviceName: string;

  /**
   * The protobuf Service for this component.
   */
  service: protobuf.Service;

  /**
   * Options for this component.
   */
  options: ComponentOptions | EntityOptions;

  /**
   * The loaded gRPC object for the protobuf definitions.
   *
   * @internal
   */
  grpc: grpc.GrpcObject;

  /**
   * Access to gRPC clients (with promisified unary methods).
   */
  clients?: GrpcClientLookup;

  /**
   * The component type.
   *
   * @internal
   */
  componentType(): string;

  /**
   * Lookup a protobuf message type.
   *
   * This is provided as a convenience to lookup protobuf message types.
   *
   * @param messageType - The fully qualified name of the type to lookup
   * @returns The protobuf message type
   */
  lookupType(messageType: string): protobuf.Type;

  /**
   * Register a component.
   *
   * @param allComponents - all components mapped to their protobuf Service
   *
   * @internal
   */
  register(allComponents: ServiceMap): ComponentServices;

  /**
   * Internal method for setting up the component.
   *
   * @internal
   */
  preStart(settings: PreStartSettings): void;
}

/**
 * Bootstrap parameters to component preStart, internal
 *
 * @public
 */
export interface PreStartSettings {
  proxyHostname: string;
  proxyPort: number;
  /**
   * @internal
   */
  identificationInfo?: discovery.IdentificationInfo;
}

/**
 * Kalix Entity.
 *
 * @public
 */
export interface Entity extends Component {}

/** @internal */
export interface ServiceMap {
  [key: string]: protobuf.Service;
}

/** @internal */
enum UserFunctionErrorSeverity {
  UNSPECIFIED = 0,
  ERROR = 1,
  WARNING = 2,
  INFO = 3,
}

/** @internal */
class DocLink {
  private specificCodes: Map<string, string> = new Map([
    ['KLX-00112', 'javascript/views.html#changing'],
    ['KLX-00402', 'javascript/topic-eventing.html'],
    ['KLX-00406', 'javascript/topic-eventing.html'],
    ['KLX-00414', 'javascript/entity-eventing.html'],
    // TODO: docs for value entity eventing (https://github.com/lightbend/kalix-javascript-sdk/issues/103)
    // ['KLX-00415', 'javascript/entity-eventing.html'],
  ]);
  private codeCategories: Map<string, string> = new Map([
    ['KLX-001', 'javascript/views.html'],
    ['KLX-002', 'javascript/value-entity.html'],
    ['KLX-003', 'javascript/eventsourced.html'],
    ['KLX-004', 'javascript/'], // no single page for eventing
    ['KLX-005', 'javascript/'], // no docs yet for replicated entities
    ['KLX-006', 'javascript/proto.html#_transcoding_http'], // all HTTP API errors
  ]);

  constructor(private baseUrl: string = 'https://docs.kalix.io/') {
    this.specificCodes.forEach((value, key) => key.length >= 7);
  }

  getLink(code: string) {
    const shortCode = code.substring(0, 7);
    if (this.specificCodes.has(code)) {
      return `${this.baseUrl}${this.specificCodes.get(code)}`;
    } else if (this.codeCategories.has(shortCode)) {
      return `${this.baseUrl}${this.codeCategories.get(shortCode)}`;
    } else {
      return '';
    }
  }
}

/** @internal */
class SourceFormatter {
  constructor(private location: discovery.SourceLocation) {}

  getLocationString(components: Array<Component>) {
    if (this.location.endLine === 0 && this.location.endCol === 0) {
      // It's been sent without line/col data
      return `At ${this.location.fileName}`;
    }
    // First, we need to location the protobuf file that it's from. To do that, we need to look in the include dirs
    // of each entity.
    for (const component of components) {
      for (const includeDir of component.options?.includeDirs ?? []) {
        const file = path.resolve(includeDir, this.location.fileName);
        if (fs.existsSync(file)) {
          const lines = fs
            .readFileSync(file)
            .toString('utf-8')
            .split(/\r?\n/)
            .slice(this.location.startLine, this.location.endLine + 1);
          let content = '';
          if (lines.length > 1) {
            content = lines.join('\n');
          } else if (lines.length === 1) {
            const line = lines[0];
            content = line + '\n';
            for (
              let i = 0;
              i < Math.min(line.length, this.location.startCol);
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
          return (
            `At ${this.location.fileName}:` +
            `${this.location.startLine + 1}:${this.location.startCol + 1}:\n` +
            content
          );
        }
      }
    }
    return (
      `At ${this.location.fileName}:` +
      `${this.location.startLine + 1}:${this.location.startCol + 1}`
    );
  }
}

/**
 * Kalix service.
 *
 * @param options - the options for starting the service
 *
 * @public
 */
export class Kalix {
  private address: string = process.env.HOST || '127.0.0.1';
  private port: number =
    (process.env.PORT ? parseInt(process.env.PORT) : undefined) || 8080;
  private delayDiscoveryUntilProxyPortSet: boolean;
  private proxyPort?: number;
  public discoveryCompleted: boolean = false;
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

    this.delayDiscoveryUntilProxyPortSet =
      options?.delayDiscoveryUntilProxyPortSet ?? false;

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
   * Set the port that the proxy is running on, for calls from the SDK to the proxy.
   * Used by the testkit.
   * @param port
   */
  setProxyPort(port: number) {
    this.proxyPort = port;
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

  private afterStart(port: number) {
    console.log('Kalix service started on ' + this.address + ':' + port);

    process.on('SIGTERM', () => {
      if (!this.proxySeen || this.proxyHasTerminated || this.devMode) {
        debug('Got SIGTERM. Shutting down');
        this.terminate();
      } else {
        debug(
          'Got SIGTERM. But did not yet see proxy terminating, deferring shutdown until proxy stops',
        );
        // no timeout because process will be SIGKILLed anyway if it does not get the proxy termination in time
        this.waitingForProxyTermination = true;
      }
    });
  }

  /**
   * Start the Kalix service.
   *
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

    const serviceMap: ServiceMap = {};
    this.components.forEach((component: Component) => {
      if (component.service)
        serviceMap[component.serviceName] = component.service;
    });

    const componentTypes: any = {};
    this.components.forEach((component: Component) => {
      if (component.register) {
        const componentServices = component.register(serviceMap);
        componentTypes[componentServices.componentType()] = componentServices;
      }
    });

    Object.values(componentTypes).forEach((services: any) => {
      services.register(this.server);
    });

    const packageDefinition = protoLoader.loadSync(
      path.join('kalix', 'protocol', 'discovery.proto'),
      {
        includeDirs: [path.join(__dirname, '..', 'proto')],
        defaults: true,
      },
    );

    const grpcDescriptor = grpc.loadPackageDefinition(
      packageDefinition,
    ) as unknown as discovery.Descriptor;

    const discoveryService = grpcDescriptor.kalix.protocol.Discovery.service;

    const discoveryHandlers = this.createDiscoveryHandlers();

    this.server.addService(discoveryService, discoveryHandlers);

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

  /** @internal */
  docLinkFor(code: string) {
    return this.docLink.getLink(code);
  }

  /** @internal */
  formatSource(location: discovery.SourceLocation) {
    return new SourceFormatter(location).getLocationString(this.components);
  }

  private createDiscoveryHandlers() {
    const self = this;
    const discoveryHandlers: discovery.Handlers = {
      Discover(call, callback) {
        try {
          const result = self.discoveryLogic(call.request);
          callback(null, result);
        } catch (error: any) {
          console.error('Error handling discovery', error);
          callback(error as Error, null);
        }
      },
      ReportError(call, callback) {
        self.reportError(call.request);
        callback(null, {});
      },
      ProxyTerminated(_call, callback) {
        self.proxyTerminatedLogic();
        callback(null, {});
      },
      HealthCheck(_call, callback) {
        callback(null, {});
      },
    };

    return discoveryHandlers;
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

  /** @internal */
  terminate() {
    this.server.forceShutdown();
    process.exit(0);
  }

  /** @internal */
  reportError(error: discovery.UserFunctionError): void {
    const msg = this.reportErrorLogic(
      error.code,
      error.message,
      error.detail,
      error.sourceLocations,
      error.severity,
    );
    switch (error.severity as number) {
      case UserFunctionErrorSeverity.INFO:
        console.info(msg);
        break;
      case UserFunctionErrorSeverity.WARNING:
        console.warn(msg);
        break;
      default:
        console.error(msg);
    }
  }

  /** @internal */
  reportErrorLogic(
    code: string,
    message: string,
    detail: string,
    locations: Array<discovery.SourceLocation>,
    severity: discovery.Severity,
  ): string {
    let messageType = 'Error';

    switch (severity as number) {
      case UserFunctionErrorSeverity.INFO:
        messageType = 'Message';
        break;
      case UserFunctionErrorSeverity.WARNING:
        messageType = 'Warning';
        break;
    }

    let msg = `${messageType} reported from Kalix system: ${code} ${message}`;

    if (detail) {
      msg += `\n\n${detail}`;
    }

    if (code) {
      const docLink = this.docLink.getLink(code);
      if (docLink.length > 0) msg += `\nSee documentation: ${docLink}`;
      for (const location of locations) {
        msg += `\n\n${this.formatSource(location)}`;
      }
    }

    return msg;
  }

  // detect hybrid proxy version probes when protocol version 0.0 (or undefined)
  private isVersionProbe(proxyInfo: discovery.ProxyInfo) {
    return !proxyInfo.protocolMajorVersion && !proxyInfo.protocolMinorVersion;
  }

  /** @internal */
  discoveryLogic(proxyInfo: discovery.ProxyInfo): discovery.Spec {
    if (this.delayDiscoveryUntilProxyPortSet && this.proxyPort === undefined) {
      console.log('Delaying discovery until proxy port set');
      throw Error('Delaying discovery until proxy port set');
    }

    const serviceInfo: discovery.ServiceInfo = {
      serviceName: this.service.name,
      serviceVersion: this.service.version,
      serviceRuntime: this.runtime,
      supportLibraryName: this.packageInfo.name,
      supportLibraryVersion: this.packageInfo.version,
      protocolMajorVersion: this.protocolMajorVersion,
      protocolMinorVersion: this.protocolMinorVersion,
    };

    const spec: discovery.Spec = {
      serviceInfo: serviceInfo,
    };

    if (this.isVersionProbe(proxyInfo)) {
      // only (silently) send service info for hybrid proxy version probe
    } else {
      this.proxySeen = true;
      this.devMode = proxyInfo.devMode;
      this.proxyHasTerminated = false;

      console.log(
        'Received discovery call from [%s %s] at [%s]:[%s] supporting Kalix protocol %s.%s',
        proxyInfo.proxyName,
        proxyInfo.proxyVersion,
        proxyInfo.internalProxyHostname,
        proxyInfo.proxyPort,
        proxyInfo.protocolMajorVersion,
        proxyInfo.protocolMinorVersion,
      );

      debug(
        'Discovery call with info %j, sending %d components',
        proxyInfo,
        this.components.length,
      );
      // references to proxyHostname are for backward compatibility with proxy 1.0.14 and older
      const preStartSettings: PreStartSettings = {
        proxyHostname:
          proxyInfo.internalProxyHostname ?? proxyInfo.proxyHostname,
        proxyPort:
          this.proxyPort ??
          (proxyInfo.proxyHostname == 'localhost' ? 9000 : 80),
        identificationInfo: proxyInfo.identificationInfo || undefined,
      };

      const components = this.components.map((component) => {
        component.preStart(preStartSettings);

        const res: discovery.Component = {
          serviceName: component.serviceName,
          componentType: component.componentType(),
        };

        if ((res.componentType ?? '').indexOf('Entities') > -1) {
          // entities has EntityOptions / EntitySettings
          const entityOptions = component.options as EntityOptions;
          const entitySettings: discovery.EntitySettings = {
            entityType: entityOptions.entityType,
            forwardHeaders: entityOptions.forwardHeaders,
          };
          if (entityOptions.entityPassivationStrategy?.timeout) {
            entitySettings.passivationStrategy = {
              timeout: {
                timeout: entityOptions.entityPassivationStrategy.timeout,
              },
            };
          }
          if (entityOptions.replicatedWriteConsistency) {
            const writeConsistency: number | undefined =
              entityOptions.replicatedWriteConsistency;
            const replicatedEntitySettings: discovery.ReplicatedEntitySettings =
              {
                writeConsistency: writeConsistency,
              };
            entitySettings.replicatedEntity = replicatedEntitySettings;
          }
          res.entity = entitySettings;
        } else if ((res.componentType ?? '').indexOf('View') > -1) {
          // views need to use entity settings to be able to pass view id (as entity_id)
          const componentOptions = component.options as ComponentOptions;
          const entitySettings: discovery.EntitySettings = {
            entityType: componentOptions.entityType,
            forwardHeaders: componentOptions.forwardHeaders,
          };
          res.entity = entitySettings;
        } else {
          // other components has ComponentOptions / GenericComponentSettings
          const componentOptions = component.options as ComponentOptions;
          const componentSettings: discovery.GenericComponentSettings = {
            forwardHeaders: componentOptions.forwardHeaders,
          };
          res.component = componentSettings;
        }

        return res;
      });

      spec.proto = this.proto;
      spec.components = components;
    }

    this.discoveryCompleted = true;
    return spec;
  }

  private proxyTerminatedLogic() {
    this.proxyHasTerminated = true;
    if (this.waitingForProxyTermination) {
      this.terminate();
    }
  }
}
