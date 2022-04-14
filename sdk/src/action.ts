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
import ActionSupport, { ActionCommandHandlers } from './action-support';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { ServiceMap } from './kalix';

const actionSupport = new ActionSupport();

export interface ActionOptions {
  includeDirs: string[];
  forwardHeaders: string[];
}

export default class Action {
  readonly options: ActionOptions;
  readonly root: protobuf.Root;
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly grpc: grpc.GrpcObject;
  readonly clients: GrpcClientLookup;
  commandHandlers: ActionCommandHandlers;

  constructor(
    desc: string | string[],
    serviceName: string,
    options?: ActionOptions,
  ) {
    this.options = {
      ...{
        includeDirs: ['.'],
        forwardHeaders: [],
      },
      ...options,
    };

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
    return actionSupport.componentType();
  }

  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  setCommandHandlers(commandHandlers: ActionCommandHandlers): Action {
    this.commandHandlers = commandHandlers;
    return this;
  }

  register(allComponents: ServiceMap): ActionSupport {
    actionSupport.addService(this, allComponents);
    return actionSupport;
  }
}
