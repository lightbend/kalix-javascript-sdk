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
import * as replicatedData from './replicated-data';
import { ReplicatedEntityServices } from './replicated-entity-support';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { EntityOptions, ReplicatedWriteConsistency, ServiceMap } from './kalix';
import { CommandContext, EntityContext, UserReply } from './command';

const replicatedEntityServices = new ReplicatedEntityServices();

export namespace ReplicatedEntity {
  export interface ReplicatedEntityCommandContext
    extends StateManagementContext,
      CommandContext,
      EntityContext {}

  export interface StateManagementContext {
    state: replicatedData.ReplicatedData;
    delete(): void;
  }

  export type CommandHandler = (
    command: any,
    context: ReplicatedEntityCommandContext,
  ) => Promise<UserReply> | UserReply;

  export type CommandHandlers = {
    [commandName: string]: CommandHandler;
  };

  export type OnStateSetCallback = (
    state: replicatedData.ReplicatedData,
    entityId: string,
  ) => void;

  export type DefaultValueCallback = (entityId: string) => any;

  export interface Options extends EntityOptions {}
}

const defaultOptions = {
  includeDirs: ['.'],
  forwardHeaders: [],
  entityPassivationStrategy: {},
  replicatedWriteConsistency: ReplicatedWriteConsistency.LOCAL,
};

export class ReplicatedEntity {
  readonly options: Required<ReplicatedEntity.Options>;
  readonly root: protobuf.Root;
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly grpc: grpc.GrpcObject;
  readonly clients: GrpcClientLookup;
  commandHandlers: ReplicatedEntity.CommandHandlers;
  onStateSet: ReplicatedEntity.OnStateSetCallback;
  defaultValue: ReplicatedEntity.DefaultValueCallback;

  constructor(
    desc: string | string[],
    serviceName: string,
    entityType: string,
    options?: ReplicatedEntity.Options,
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

    this.onStateSet = (_state, _entityId) => undefined;

    this.defaultValue = (_entityId) => null;
  }

  componentType(): string {
    return replicatedEntityServices.componentType();
  }

  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  register(allComponents: ServiceMap) {
    replicatedEntityServices.addService(this, allComponents);
    return replicatedEntityServices;
  }
}

// retain old export approach for now
export const exported = {
  ReplicatedEntity: ReplicatedEntity,
  ReplicatedCounter: replicatedData.ReplicatedCounter,
  ReplicatedSet: replicatedData.ReplicatedSet,
  ReplicatedRegister: replicatedData.ReplicatedRegister,
  ReplicatedMap: replicatedData.ReplicatedMap,
  ReplicatedCounterMap: replicatedData.ReplicatedCounterMap,
  ReplicatedRegisterMap: replicatedData.ReplicatedRegisterMap,
  ReplicatedMultiMap: replicatedData.ReplicatedMultiMap,
  Vote: replicatedData.Vote,
  Clocks: replicatedData.Clocks,
};
