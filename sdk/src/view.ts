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
import { Component, ComponentOptions, ServiceMap } from './kalix';
import { Serializable } from './serializable';
import { Metadata } from './metadata';
import { Message } from './command';

const viewServices = new ViewServices();

/** @public */
export namespace View {
  /**
   * Context for a view update event.
   */
  export interface UpdateHandlerContext {
    /**
     * The view id.
     */
    viewId: string;

    /**
     * The event subject.
     */
    eventSubject?: string;

    /**
     * The update command name.
     */
    commandName: string;

    /**
     * Metadata for the event.
     */
    metadata: Metadata;
  }

  /**
   * A handler for transforming an incoming event and the previous view state into a new state
   *
   * @param event - The event, this will be of the type of the gRPC event handler input type
   * @param state - The previous view state or 'undefined' if no previous state was stored
   * @param context - The view handler context
   * @returns The state to store in the view or undefined to not update/store state for the event
   */
  export type Handler = (
    event: any,
    state: any,
    context: UpdateHandlerContext,
  ) => Message | undefined;

  /**
   * View update handlers.
   *
   * @remarks
   * The names of the properties must match the names of all the view methods specified in the gRPC
   * descriptor.
   */
  export type Handlers = {
    [methodName: string]: Handler;
  };

  /**
   * Options for a view.
   */
  export interface Options extends ComponentOptions {
    /**
     * The id for the view, used for persisting the view.
     *
     * @defaultValue Defaults to the service name
     */
    viewId?: string;
  }
}

const defaultOptions = {
  includeDirs: ['.'],
  forwardHeaders: [],
};

/**
 * View.
 *
 * @public
 */
export class View implements Component {
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly options: Required<View.Options>;

  /** @internal */ readonly root: protobuf.Root;
  /** @internal */ readonly grpc: grpc.GrpcObject;

  /**
   * View update handlers.
   *
   * @remarks
   * The names of the properties must match the names of all the view methods specified in the gRPC
   * descriptor.
   */
  updateHandlers?: View.Handlers;

  /**
   * Create a new view.
   *
   * @param desc - A descriptor or list of descriptors to parse, containing the service to serve
   * @param serviceName - The fully qualified name of the service that provides this interface
   * @param options - The options for this view
   */
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

  /** @internal */
  componentType(): string {
    return viewServices.componentType();
  }

  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  /**
   * Set the update handlers of the view.
   *
   * @remarks
   * Only used for updates where event transformation is enabled through
   * `"transform_updates: true"` in the grpc descriptor.
   *
   * @param handlers - The handler callbacks
   * @returns This view
   */
  setUpdateHandlers(handlers: View.Handlers): View {
    this.updateHandlers = handlers;
    return this;
  }

  /** @internal */
  register(allComponents: ServiceMap): ViewServices {
    viewServices.addService(this, allComponents);
    return viewServices;
  }
}
