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
import ViewServices from './view-support';
import { ComponentOptions, ServiceMap } from './kalix';
import { Serializable } from './serializable';
import { Metadata } from './metadata';

const viewServices = new ViewServices();

namespace View {
  export interface UpdateHandlerContext {
    viewId: string;
    eventSubject?: string;
    commandName: string;
    metadata: Metadata;
  }

  export type Handler = (
    event: any,
    state?: Serializable,
    context?: UpdateHandlerContext,
  ) => Serializable;

  export type Handlers = {
    [methodName: string]: Handler;
  };

  export interface Options extends ComponentOptions {
    viewId?: string;
  }
}

const defaultOptions = {
  includeDirs: ['.'],
  forwardHeaders: [],
};

class View {
  readonly options: Required<View.Options>;
  readonly root: protobuf.Root;
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly grpc: grpc.GrpcObject;
  updateHandlers?: View.Handlers;

  constructor(
    desc: string | string[],
    serviceName: string,
    options?: View.Options,
  ) {
    // default view id, name without package from service name
    const defaultViewId = serviceName.split('.').pop() ?? serviceName;

    this.options = {
      ...defaultOptions,
      ...{ viewId: defaultViewId },
      ...options,
      ...{ entityType: options?.viewId ?? defaultViewId },
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
  }

  componentType(): string {
    return viewServices.componentType();
  }

  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  setUpdateHandlers(handlers: View.Handlers): View {
    this.updateHandlers = handlers;
    return this;
  }

  register(allComponents: ServiceMap): ViewServices {
    viewServices.addService(this, allComponents);
    return viewServices;
  }
}

export = View;
