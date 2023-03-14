/*
 * Copyright 2021-2023 Lightbend Inc.
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
import { CommandContext, CommandReply } from './command';
import { GrpcClientLookup, GrpcUtil } from './grpc-util';
import { Metadata } from './metadata';
import { Reply } from './reply';
import {
  Component,
  ComponentOptions,
  ServiceMap,
  PreStartSettings,
} from './kalix';

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
export class Action<
  CommandHandlers extends Action.CommandHandlers = Action.CommandHandlers,
> implements Component
{
  readonly serviceName: string;
  readonly service: protobuf.Service;
  readonly options: Required<Action.Options>;
  clients?: GrpcClientLookup;

  /** @internal */ readonly root: protobuf.Root;
  /** @internal */ readonly grpc: grpc.GrpcObject;

  /**
   * The command handlers.
   *
   * @remarks
   * The names of the properties must match the names of the service calls specified in the gRPC descriptor.
   */
  commandHandlers: CommandHandlers;

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

    this.clients = undefined;

    this.commandHandlers = {} as CommandHandlers;
  }

  preStart(settings: PreStartSettings): void {
    this.clients = GrpcUtil.clientCreators(
      this.root,
      this.grpc,
      settings.proxyHostname,
      settings.proxyPort,
      settings.identificationInfo,
    );
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
  setCommandHandlers(
    commandHandlers: CommandHandlers,
  ): Action<CommandHandlers> {
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
     * @returns nothing or a Reply for {@link StreamedInContext.end} events
     */
    on(eventType: string, callback: (...args: any[]) => Reply | void): void;
  }

  /**
   * Context for an action command.
   *
   * @typeParam Response - The type of the response message
   */
  export interface ActionCommandContext<Response extends object = any>
    extends ActionContext,
      CommandContext {
    /**
     * Write a message.
     *
     * @param message - The protobuf message to write
     * @param metadata - The metadata associated with the message
     */
    write: (message: Response, metadata?: Metadata) => void;
  }

  /**
   * Context for a unary action command.
   *
   * @typeParam Response - The type of the response message
   */
  export interface UnaryCommandContext<Response extends object = any>
    extends ActionCommandContext<Response> {
    /** @internal */ alreadyReplied: boolean;
  }

  /**
   * Context for an action command that handles streamed messages in.
   *
   * @typeParam Request - The type of the request message
   * @typeParam Response - The type of the response message
   */
  export interface StreamedInContext<
    Request extends object = any,
    Response extends object = any,
  > extends ActionCommandContext<Response> {
    /**
     * Cancel the incoming stream of messages.
     */
    cancel: () => void;

    /**
     * Register an event handler for {@link StreamedInContext.data} events.
     *
     * @param eventType - 'data'
     * @param callback - the callback for each new message
     * @see {@link StreamedInContext.data}
     */
    on(eventType: 'data', callback: (message: Request) => void): void;

    /**
     * Register an event handler for {@link StreamedInContext.end} events.
     *
     * @param eventType - 'end'
     * @param callback - the callback for when the input stream ends
     * @returns nothing or a Reply that is returned as the response from the action
     * @see {@link StreamedInContext.end}
     */
    on(eventType: 'end', callback: () => Reply<Response> | void): void;
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
   *
   * @typeParam Request - The type of the request message
   * @typeParam Response - The type of the response message
   */
  export interface StreamedInCommandContext<
    Request extends object = any,
    Response extends object = any,
  > extends StreamedInContext<Request, Response> {}

  /**
   * Context for an action command that returns a streamed message out.
   *
   * @typeParam Response - The type of the response message
   */
  export interface StreamedOutContext<Response extends object = any>
    extends ActionCommandContext<Response> {
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

    /**
     * Register an event handler for {@link StreamedOutContext.cancelled} events.
     *
     * @param eventType - 'cancelled'
     * @param callback - the callback for when the stream is cancelled
     * @see {@link StreamedInContext.cancelled}
     */
    on(eventType: 'cancelled', callback: () => void): void;
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
   *
   * @typeParam Response - The type of the response message
   */
  export interface StreamedOutCommandContext<Response extends object = any>
    extends StreamedOutContext<Response> {}

  /**
   * Context for a streamed action command.
   *
   * @typeParam Request - The type of the request message
   * @typeParam Response - The type of the response message
   */
  export interface StreamedCommandContext<
    Request extends object = any,
    Response extends object = any,
  > extends StreamedInContext<Request, Response>,
      StreamedOutContext<Response> {
    /**
     * Register an event handler for {@link StreamedInContext.data} events.
     *
     * @param eventType - 'data'
     * @param callback - the callback for each new message
     * @see {@link StreamedInContext.data}
     */
    on(eventType: 'data', callback: (message: Request) => void): void;

    /**
     * Register an event handler for {@link StreamedInContext.end} events.
     *
     * @param eventType - 'end'
     * @param callback - the callback for when the input stream ends
     * @returns nothing or a Reply that is returned as the response from the action
     * @see {@link StreamedInContext.end}
     */
    on(eventType: 'end', callback: () => Reply<Response> | void): void;

    /**
     * Register an event handler for {@link StreamedOutContext.cancelled} events.
     *
     * @param eventType - 'cancelled'
     * @param callback - the callback for when the stream is cancelled
     * @see {@link StreamedInContext.cancelled}
     */
    on(eventType: 'cancelled', callback: () => void): void;
  }

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
   * @typeParam Request - The type of the request message
   * @typeParam Response - The type of the response message
   * @param message - The command message, this will be of the type of the gRPC service call input type
   * @param context - The command context
   * @returns The message to reply with, it must match the gRPC service call output type for
   *          this command. If replying by using context.write, undefined must be returned.
   */
  export type UnaryCommandHandler<
    Request extends object = any,
    Response extends object = any,
  > = (
    message: Request,
    context: UnaryCommandContext<Response>,
  ) => Promise<CommandReply<Response>> | CommandReply<Response>;

  /**
   * A streamed in action command handler.
   *
   * @typeParam Request - The type of the request message
   * @typeParam Response - The type of the response message
   * @param context - The command context
   * @returns The message to reply with, it must match the gRPC service call output type for
   *          this command. If replying by using context.write, undefined must be returned.
   */
  export type StreamedInCommandHandler<
    Request extends object = any,
    Response extends object = any,
  > = (
    context: StreamedInCommandContext<Request, Response>,
  ) => Promise<CommandReply<Response>> | CommandReply<Response>;

  /**
   * A streamed out command handler.
   *
   * @typeParam Request - The type of the request message
   * @typeParam Response - The type of the response message
   * @param message - The command message, this will be of the type of the gRPC service call input type
   * @param context - The command context
   */
  export type StreamedOutCommandHandler<
    Request extends object = any,
    Response extends object = any,
  > = (message: Request, context: StreamedOutCommandContext<Response>) => void;

  /**
   * A streamed command handler.
   *
   * @typeParam Request - The type of the request message
   * @typeParam Response - The type of the response message
   * @param context - The command context
   */
  export type StreamedCommandHandler<
    Request extends object = any,
    Response extends object = any,
  > = (context: StreamedCommandContext<Request, Response>) => void;

  export interface Options extends Omit<ComponentOptions, 'entityType'> {}
}
