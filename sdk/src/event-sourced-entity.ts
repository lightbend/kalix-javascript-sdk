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
import EventSourcedEntityServices from './event-sourced-entity-support';
import { EntityOptions, ServiceMap } from './kalix';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { Serializable } from './serializable';
import { CommandContext, EntityContext, UserReply } from './command';

const eventSourcedEntityServices = new EventSourcedEntityServices();

namespace EventSourcedEntity {
  export interface EventSourcedEntityCommandContext
    extends CommandContext,
      EntityContext {
    emit(event: Serializable): void;
  }

  export type CommandHandler = (
    message: any,
    state: Serializable,
    context: EventSourcedEntityCommandContext,
  ) => Promise<UserReply>;

  export type EventHandler = (
    event: Serializable,
    state: Serializable,
  ) => Serializable;

  export type Behavior = {
    commandHandlers: { [commandName: string]: CommandHandler };
    eventHandlers: { [eventName: string]: EventHandler };
  };

  export type BehaviorCallback = (state: Serializable) => Behavior;

  export type InitialCallback = (entityId: string) => Serializable;

  export interface Options
    extends Omit<EntityOptions, 'replicatedWriteConsistency'> {
    snapshotEvery?: number;
    serializeAllowPrimitives?: boolean;
    serializeFallbackToJson?: boolean;
  }
}

const defaultOptions = {
  snapshotEvery: 100,
  includeDirs: ['.'],
  serializeAllowPrimitives: false,
  serializeFallbackToJson: false,
  forwardHeaders: [],
  entityPassivationStrategy: {},
};

class EventSourcedEntity {
  readonly options: Required<EventSourcedEntity.Options>;
  readonly root: protobuf.Root;
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly grpc: grpc.GrpcObject;
  readonly clients: GrpcClientLookup;
  initial?: EventSourcedEntity.InitialCallback;
  behavior?: EventSourcedEntity.BehaviorCallback;

  constructor(
    desc: string | string[],
    serviceName: string,
    entityType: string,
    options?: EventSourcedEntity.Options,
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
  }

  componentType(): string {
    return eventSourcedEntityServices.componentType();
  }

  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  setInitial(callback: EventSourcedEntity.InitialCallback): EventSourcedEntity {
    this.initial = callback;
    return this;
  }

  setBehavior(
    callback: EventSourcedEntity.BehaviorCallback,
  ): EventSourcedEntity {
    this.behavior = callback;
    return this;
  }

  register(allComponents: ServiceMap): EventSourcedEntityServices {
    eventSourcedEntityServices.addService(this, allComponents);
    return eventSourcedEntityServices;
  }
}

export = EventSourcedEntity;
