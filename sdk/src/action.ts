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
import ActionSupport from './action-support';
import { CommandContext } from './command';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { Metadata } from './metadata';
import { Reply } from './reply';
import { Component, ComponentOptions, ServiceMap } from './kalix';

const actionSupport = new ActionSupport();

const defaultOptions = {
  includeDirs: ['.'],
  forwardHeaders: [],
};

/**
 * An Action.
 *
 * @public
 */
export class Action implements Component {
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly options: Required<Action.Options>;
  readonly clients: GrpcClientLookup;

  /** @internal */ readonly root: protobuf.Root;
  /** @internal */ readonly grpc: grpc.GrpcObject;

  /**
   * The command handlers.
   *
   * @remarks
   * The names of the properties must match the names of the service calls specified in the gRPC descriptor.
   */
  commandHandlers: Action.CommandHandlers;

  /**
   * Create a new action.
   *
   * @param desc - A descriptor or list of descriptors to parse, containing the service to serve
   * @param serviceName - The fully qualified name of the service that provides this interface
   * @param options - The options for this action
   */
  constructor(
    desc: string | string[],
    serviceName: string,
    options?: Action.Options,
  ) {
    this.options = {
      ...defaultOptions,
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

  /**
   * @returns Action component type
   *
   * @internal
   */
  componentType(): string {
    return actionSupport.componentType();
  }

  /**
   * Lookup a protobuf message type.
   *
   * This is provided as a convenience to lookup protobuf message types for use with events and snapshots.
   *
   * @param messageType - The fully qualified name of the type to lookup
   * @returns The protobuf message type
   */
  lookupType(messageType: string): protobuf.Type {
    return this.root.lookupType(messageType);
  }

  /**
   * Set the command handlers for this action.
   *
   * @param commandHandlers - The command handlers
   * @returns This action
   */
  setCommandHandlers(commandHandlers: Action.CommandHandlers): Action {
    this.commandHandlers = commandHandlers;
    return this;
  }

  /** @internal */
  register(allComponents: ServiceMap): ActionSupport {
    actionSupport.addService(this, allComponents);
    return actionSupport;
  }
}

/**
 * @public
 */
export namespace Action {
  export interface ActionContext {
    /**
     * Whether the client is still connected.
     */
    readonly cancelled: boolean;

    /**
     * The metadata associated with the command.
     */
    readonly metadata: Metadata;

    /**
     * Register an event handler.
     *
     * @param eventType - The type of the event
     * @param callback - The callback to handle the event
     */
    on: (eventType: string, callback: Function) => void;
  }

  /**
   * Context for an action command.
   */
  export interface ActionCommandContext extends ActionContext, CommandContext {
    /**
     * Write a message.
     *
     * @param message - The protobuf message to write
     * @param metadata - The metadata associated with the message
     */
    write: (message: any, metadata?: Metadata) => void;
  }

  /**
   * Context for a unary action command.
   */
  export interface UnaryCommandContext extends ActionCommandContext {
    /** @internal */ alreadyReplied: boolean;
  }

  /**
   * Context for an action command that handles streamed messages in.
   */
  export interface StreamedInContext extends ActionCommandContext {
    /**
     * Cancel the incoming stream of messages.
     */
    cancel: () => void;
  }

  export namespace StreamedInContext {
    /**
     * A data event.
     *
     * Emitted when a new message arrives.
     *
     * @eventProperty
     */
    export const data = 'data';

    /**
     * A stream end event.
     *
     * Emitted when the input stream terminates.
     *
     * @remarks
     * If a callback is registered and that returns a Reply, then that is returned as a response from the action.
     *
     * @eventProperty
     */
    export const end = 'end';
  }

  /**
   * Context for a streamed in action command.
   */
  export interface StreamedInCommandContext extends StreamedInContext {}

  /**
   * Context for an action command that returns a streamed message out.
   */
  export interface StreamedOutContext extends ActionCommandContext {
    /**
     * Send a reply
     *
     * @param reply - The reply to send
     */
    reply: (reply: Reply) => void;

    /**
     * Terminate the outgoing stream of messages.
     */
    end: () => void;
  }

  export namespace StreamedOutContext {
    /**
     * A cancelled event.
     *
     * @eventProperty
     */
    export const cancelled = 'cancelled';
  }

  /**
   * Context for a streamed out action command.
   */
  export interface StreamedOutCommandContext extends StreamedOutContext {}

  /**
   * Context for a streamed action command.
   */
  export interface StreamedCommandContext
    extends StreamedInContext,
      StreamedOutContext {}

  /**
   * The command handlers.
   *
   * @remarks
   * The names of the properties must match the names of the service calls specified in the gRPC descriptor.
   */
  export type CommandHandlers = {
    [commandName: string]: CommandHandler;
  };

  /**
   * An action command handler.
   */
  export type CommandHandler =
    | UnaryCommandHandler
    | StreamedInCommandHandler
    | StreamedOutCommandHandler
    | StreamedCommandHandler;

  /**
   * A unary action command handler.
   *
   * @param message - The command message, this will be of the type of the gRPC service call input type
   * @param context - The command context
   * @returns The message to reply with, it must match the gRPC service call output type for
   *          this command. If replying by using context.write, undefined must be returned.
   */
  export type UnaryCommandHandler = (
    message: any,
    context: UnaryCommandContext,
  ) => Reply | any | Promise<any> | undefined;

  /**
   * A streamed in action command handler.
   *
   * @param context - The command context
   * @returns The message to reply with, it must match the gRPC service call output type for
   *          this command. If replying by using context.write, undefined must be returned.
   */
  export type StreamedInCommandHandler = (
    context: StreamedInCommandContext,
  ) => any | Promise<any> | undefined;

  /**
   * A streamed out command handler.
   *
   * @param message - The command message, this will be of the type of the gRPC service call input type
   * @param context - The command context
   */
  export type StreamedOutCommandHandler = (
    message: any,
    context: StreamedOutCommandContext,
  ) => void;

  /**
   * A streamed command handler.
   *
   * @param context - The command context
   */
  export type StreamedCommandHandler = (
    context: StreamedCommandContext,
  ) => void;

  export interface Options extends Omit<ComponentOptions, 'entityType'> {}
}
