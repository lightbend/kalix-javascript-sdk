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

import * as protobufHelper from './protobuf-helper';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import ValueEntityServices from './value-entity-support';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { EntityOptions, ServiceMap } from './kalix';
import { Serializable } from './serializable';
import { CommandContext, EntityContext, UserReply } from './command';

const valueEntityServices = new ValueEntityServices();

namespace ValueEntity {
  export interface ValueEntityCommandContext
    extends CommandContext,
      EntityContext {
    updateState(newState: Serializable): void;
    deleteState(): void;
  }

  export type CommandHandler = (
    message: any,
    state: Serializable,
    context: ValueEntityCommandContext,
  ) => Promise<UserReply>;

  export type CommandHandlers = {
    [commandName: string]: CommandHandler;
  };

  export type InitialCallback = (entityId: string) => Serializable;

  export interface Options
    extends Omit<EntityOptions, 'replicatedWriteConsistency'> {
    serializeAllowPrimitives?: boolean;
    serializeFallbackToJson?: boolean;
  }
}

const defaultOptions = {
  includeDirs: ['.'],
  serializeAllowPrimitives: false,
  serializeFallbackToJson: false,
  forwardHeaders: [],
  entityPassivationStrategy: {},
};

class ValueEntity {
  readonly options: Required<ValueEntity.Options>;
  readonly root: protobuf.Root;
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly grpc: grpc.GrpcObject;
  readonly clients: GrpcClientLookup;
  initial?: ValueEntity.InitialCallback;
  commandHandlers: ValueEntity.CommandHandlers;

  constructor(
    desc: string | string[],
    serviceName: string,
    entityType: string,
    options?: ValueEntity.Options,
  ) {
    this.options = {
      ...defaultOptions,
      ...{ entityType: entityType },
      ...options,
    };

    if (!entityType) throw Error('EntityType must contain a name');

    const allIncludeDirs = protobufHelper.moduleIncludeDirs.concat(
      this.options.includeDirs,
    );

    this.root = protobufHelper.loadSync(desc, allIncludeDirs);

    this.serviceName = serviceName;

    // Eagerly lookup the service to fail early
    this.service = this.root.lookupService(serviceName);

    const packageDefinition = protoLoader.loadSync(desc, {
      includeDirs: allIncludeDirs,
    });
    this.grpc = grpc.loadPackageDefinition(packageDefinition);

    this.clients = GrpcUtil.clientCreators(this.root, this.grpc);

    this.commandHandlers = {};
  }

  componentType(): string {
    return valueEntityServices.componentType();
  }

  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  setInitial(callback: ValueEntity.InitialCallback): ValueEntity {
    this.initial = callback;
    return this;
  }

  setCommandHandlers(commandHandlers: ValueEntity.CommandHandlers) {
    this.commandHandlers = commandHandlers;
    return this;
  }

  register(allComponents: ServiceMap): ValueEntityServices {
    valueEntityServices.addService(this, allComponents);
    return valueEntityServices;
  }
}

export = ValueEntity;
