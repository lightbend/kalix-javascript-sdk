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

import * as util from 'util';
import * as protobuf from 'protobufjs';
import * as grpc from '@grpc/grpc-js';
import { ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client';

/**
 * gRPC client.
 *
 * @public
 */
export interface GrpcClient extends grpc.Client {
  [methodName: string]: Function;
}

/**
 * gRPC client creator for a service.
 *
 * @public
 */
export interface GrpcClientCreator {
  /**
   * Create a new client for service.
   *
   * @param address - the address for the service
   * @param credentials - the credentials for the connection
   * @returns a new gRPC client for the service
   */
  createClient(
    address: string,
    credentials?: grpc.ChannelCredentials,
  ): GrpcClient;
}

/**
 * gRPC client lookup, using fully qualified name for service.
 *
 * @public
 */
export interface GrpcClientLookup {
  [index: string]: GrpcClientLookup | GrpcClientCreator;
}

/** @public */
export class GrpcUtil {
  /**
   * Create gRPC client creators for defined services, with promisified clients.
   */
  static clientCreators(
    namespace: protobuf.Namespace,
    grpcObject: grpc.GrpcObject,
  ): GrpcClientLookup {
    const result: GrpcClientLookup = {};
    for (const serviceFqn of GrpcUtil.getServiceNames(namespace)) {
      let currentLookup = result;
      let currentGrpc = grpcObject;
      const nameComponents = serviceFqn.split('.');
      for (const packageName of nameComponents.slice(0, -1)) {
        if (!currentLookup[packageName]) {
          currentLookup[packageName] = {};
        }
        currentLookup = currentLookup[packageName] as GrpcClientLookup;
        currentGrpc = currentGrpc[packageName] as grpc.GrpcObject;
      }
      const serviceName = nameComponents[nameComponents.length - 1];
      const serviceClientConstructor = currentGrpc[
        serviceName
      ] as ServiceClientConstructor;
      const clientCreator = function (
        address: string,
        credentials?: grpc.ChannelCredentials,
      ) {
        const creds = credentials || grpc.credentials.createInsecure();
        const client = new serviceClientConstructor(address, creds);
        return GrpcUtil.promisifyClient(client);
      };
      currentLookup[serviceName] = {
        createClient: clientCreator,
      };
    }
    return result;
  }

  /**
   * Iterate through a (resolved) protobufjs reflection object to find services.
   */
  static getServiceNames(
    obj: protobuf.ReflectionObject,
    parentName: string = '',
  ): Array<string> {
    const fullName = parentName === '' ? obj.name : parentName + '.' + obj.name;
    if (obj instanceof protobuf.Service) {
      return [fullName];
    } else if (
      obj instanceof protobuf.Namespace &&
      typeof obj.nestedArray !== 'undefined'
    ) {
      return obj.nestedArray
        .map((nestedObj) => GrpcUtil.getServiceNames(nestedObj, fullName))
        .reduce((acc, val) => acc.concat(val), []);
    }
    return [];
  }

  /**
   * add async versions of unary request methods, suffixed with the given suffix
   */
  static promisifyClient(client: any, suffix: String = '') {
    Object.keys(Object.getPrototypeOf(client)).forEach((methodName) => {
      const methodFunction = client[methodName];
      if (
        methodFunction.requestStream == false &&
        methodFunction.responseStream == false
      ) {
        client[methodName + suffix] = util
          .promisify(methodFunction)
          .bind(client);
      }
    });
    return client;
  }
}
