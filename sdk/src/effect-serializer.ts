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

import { ServiceMap } from './kalix';
import protobuf from 'protobufjs';
import AnySupport from './protobuf-any';
import util from 'util';
import grpc from '@grpc/grpc-js';
import { Effect } from './effect';
import { Metadata } from './metadata';

class EffectSerializer {
  private services: ServiceMap;

  constructor(services: ServiceMap) {
    this.services = services;
  }

  serializeEffect(
    method:
      | grpc.MethodDefinition<any, any>
      | protobuf.Method
      | protobuf.ReflectionObject
      | null,
    message: { [key: string]: any },
    metadata?: Metadata,
  ): Effect {
    let serviceName: string, commandName: string;
    // We support either the grpc method, or a protobufjs method being passed
    if (method && 'path' in method && typeof method.path === 'string') {
      const r = new RegExp('^/([^/]+)/([^/]+)$').exec(method.path);
      if (r == null) {
        throw new Error(
          util.format(
            "Not a valid gRPC method path '%s' on object '%o'",
            method.path,
            method,
          ),
        );
      }
      serviceName = r[1];
      commandName = r[2];
    } else if (method && 'type' in method && method.type === 'rpc') {
      serviceName = this.fullName(method.parent);
      commandName = method.name;
    } else {
      throw new Error(
        'Method must either be a gRPC MethodDefinition or a protobufjs Method',
      );
    }

    const service = this.services[serviceName];

    if (service !== undefined) {
      const command = service.methods[commandName];
      if (command !== undefined) {
        if (!command.resolvedRequestType) {
          command.resolve();
        }

        const payload = AnySupport.serialize(
          command.resolvedRequestType!.create(message),
          false,
          false,
        );
        const effect: Effect = {
          serviceName: serviceName,
          commandName: commandName,
          payload: payload,
        };

        if (metadata && metadata.entries) {
          effect.metadata = {
            entries: metadata.entries,
          };
        }

        return effect;
      } else {
        throw new Error(
          util.format(
            'Command [%s] unknown on service [%s].',
            commandName,
            serviceName,
          ),
        );
      }
    } else {
      throw new Error(
        util.format(
          "Service [%s] has not been registered as an entity in this user function, and so can't be used as a side effect or forward.",
          service,
        ),
      );
    }
  }

  fullName(item: protobuf.NamespaceBase | null): string {
    if (item?.parent && item.parent.name !== '') {
      return this.fullName(item.parent) + '.' + item.name;
    } else {
      return item?.name ?? '';
    }
  }

  serializeSideEffect(
    method:
      | grpc.MethodDefinition<any, any>
      | protobuf.Method
      | protobuf.ReflectionObject
      | null,
    message: { [key: string]: any },
    synchronous?: boolean,
    metadata?: Metadata,
  ): Effect {
    const effect = this.serializeEffect(method, message, metadata);
    effect.synchronous = typeof synchronous === 'boolean' ? synchronous : false;
    return effect;
  }
}

export = EffectSerializer;
