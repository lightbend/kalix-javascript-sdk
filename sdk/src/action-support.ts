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

import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Action } from './action';
import AnySupport from './protobuf-any';
import { Message } from './command';
import { EffectMethod } from './effect';
import EffectSerializer from './effect-serializer';
import { ServiceMap } from './kalix';
import { GrpcStatus } from './grpc-status';
import { Metadata } from './metadata';
import { Reply } from './reply';
import * as proto from '../proto/protobuf-bundle';

const debug = require('debug')('kalix-action');
// Bind to stdout
debug.log = console.log.bind(console);

/** @internal */
namespace protocol {
  export type Command = proto.kalix.component.action.IActionCommand;
  export type Response = proto.kalix.component.action.IActionResponse;
  export type Metadata = proto.kalix.component.IMetadata;
  export type SideEffect = proto.kalix.component.ISideEffect;
  export type Failure = proto.kalix.component.IFailure;
}

/** @internal */
export type Call = UnaryCall | StreamedInCall | StreamedOutCall | StreamedCall;

/** @internal */
export type UnaryCall = grpc.ServerUnaryCall<
  protocol.Command,
  protocol.Response
>;

/** @internal */
export type UnaryCallback = grpc.sendUnaryData<protocol.Response>;

/** @internal */
export type StreamedInCall = grpc.ServerReadableStream<
  protocol.Command,
  protocol.Response
>;

/** @internal */
export type StreamedOutCall = grpc.ServerWritableStream<
  protocol.Command,
  protocol.Response
>;

/** @internal */
export type StreamedCall = grpc.ServerDuplexStream<
  protocol.Command,
  protocol.Response
>;

/** @internal */
class ActionService {
  readonly root: protobuf.Root;
  readonly service: protobuf.Service;
  readonly commandHandlers: Action.CommandHandlers;
  readonly anySupport: AnySupport;
  readonly effectSerializer: EffectSerializer;

  constructor(
    root: protobuf.Root,
    service: protobuf.Service,
    commandHandlers: Action.CommandHandlers,
    allComponents: ServiceMap,
  ) {
    this.root = root;
    this.service = service;
    this.commandHandlers = commandHandlers;
    this.anySupport = new AnySupport(root);
    this.effectSerializer = new EffectSerializer(allComponents);
  }
}

/** @internal */
class ActionHandler {
  private actionService: ActionService;
  private grpcMethod: protobuf.Method;
  private commandHandler: Action.CommandHandler;
  private call: Call;
  private grpcCallback: UnaryCallback | null;

  private streamId: string;
  private supportedEvents: string[];
  private callbacks: { [eventType: string]: Function };

  private ctx:
    | Action.ActionContext
    | Action.UnaryCommandContext
    | Action.StreamedInCommandContext
    | Action.StreamedOutCommandContext
    | Action.StreamedCommandContext;

  constructor(
    actionService: ActionService,
    grpcMethod: protobuf.Method,
    commandHandler: Action.CommandHandler,
    call: Call,
    grpcCallback: UnaryCallback | null,
    metadata?: protocol.Metadata | null,
  ) {
    this.actionService = actionService;
    this.grpcMethod = grpcMethod;
    this.commandHandler = commandHandler;
    this.call = call;
    this.grpcCallback = grpcCallback;

    this.streamId = Math.random().toString(16).substring(2, 7);
    this.streamDebug('Started new call');
    this.supportedEvents = [];
    this.callbacks = {};
    this.ctx = this.createContext(metadata);
  }

  streamDebug(msg: string, ...args: any[]): void {
    debug(
      '%s [%s.%s] - ' + msg,
      ...[
        this.streamId,
        this.actionService.service.name,
        this.grpcMethod.name,
      ].concat(args),
    );
  }

  createContext(metadata?: protocol.Metadata | null): Action.ActionContext {
    const call = this.call;
    const metadataObject = Metadata.fromProtocol(metadata);
    const ctx: Action.ActionContext = {
      get cancelled() {
        return call.cancelled;
      },
      get metadata() {
        return metadataObject;
      },
      on: (eventType: string, callback: Function): void => {
        if (this.supportedEvents.includes(eventType)) {
          this.callbacks[eventType] = callback;
        } else {
          throw new Error('Unknown event type: ' + eventType);
        }
      },
    };
    return ctx;
  }

  invokeCallback(eventType: string, ...args: any[]): any {
    if (this.callbacks.hasOwnProperty(eventType)) {
      return this.invokeUserCallback(
        eventType + ' event',
        this.callbacks[eventType],
        ...args,
      );
    }
  }

  ensureNotCancelled() {
    if (this.call.cancelled) {
      throw new Error(
        'Already replied to unary command, cannot interact further.',
      );
    }
  }

  passReplyThroughContext(
    ctx: Action.ActionCommandContext,
    reply: Reply,
  ): void {
    // effects need to go first to end up in reply
    if (reply.getEffects()) {
      reply.getEffects().forEach(function (effect) {
        ctx.effect(
          effect.method,
          effect.message,
          effect.synchronous,
          effect.metadata,
          true,
        );
      });
    }
    if (reply.getFailure()) {
      ctx.fail(
        reply.getFailure()?.getDescription() ?? '',
        reply.getFailure()?.getStatus(),
      );
    } else if (reply.getMessage()) {
      ctx.write(reply.getMessage(), reply.getMetadata());
    } else if (reply.getForward() && reply.getForward()?.getMethod()) {
      ctx.forward(
        reply.getForward()?.getMethod()!,
        reply.getForward()?.getMessage(),
        reply.getForward()?.getMetadata(),
        true,
      );
    } else {
      // no reply
      ctx.write(reply);
    }
  }

  handleSingleReturn(value: any): void {
    const ctx = this.ctx as Action.UnaryCommandContext;
    if (value) {
      if (ctx.alreadyReplied) {
        console.warn(
          `WARNING: Action handler for ${this.actionService.service.name}.${this.grpcMethod.name} both sent a reply through the context and returned a value, ignoring return value.`,
        );
      } else if (value instanceof Reply) {
        this.passReplyThroughContext(ctx, value);
      } else if (typeof value.then === 'function') {
        value.then(this.handleSingleReturn.bind(this), ctx.fail);
      } else {
        ctx.write(value);
      }
    } else if (!ctx.alreadyReplied) {
      ctx.write({}); // empty reply, resolved to response type
    }
  }

  handleUnary() {
    this.setupUnaryOutContext();
    const call = this.call as UnaryCall;
    const deserializedCommand = this.actionService.anySupport.deserialize(
      call.request.payload,
    );
    const userReturn = this.invokeUserCallback(
      'command',
      this.commandHandler,
      deserializedCommand,
      this.ctx,
    );
    this.handleSingleReturn(userReturn);
  }

  handleStreamedIn() {
    this.setupUnaryOutContext();
    this.setupStreamedInContext();
    const userReturn = this.invokeUserCallback(
      'command',
      this.commandHandler,
      this.ctx,
    );
    if (userReturn !== undefined) {
      if (this.call.cancelled) {
        this.streamDebug(
          'Streamed command handler for command %s.%s both sent a reply through the context and returned a value, ignoring return value.',
          this.actionService.service.name,
          this.grpcMethod.name,
        );
      } else {
        const ctx = this.ctx as Action.ActionCommandContext;
        if (typeof userReturn.then === 'function') {
          userReturn.then(ctx.write, ctx.fail);
        } else {
          ctx.write(userReturn);
        }
      }
    }
  }

  handleStreamedOut() {
    this.setupStreamedOutContext();
    const call = this.call as StreamedOutCall;
    const deserializedCommand = this.actionService.anySupport.deserialize(
      call.request.payload,
    );
    this.invokeUserCallback(
      'command',
      this.commandHandler,
      deserializedCommand,
      this.ctx,
    );
  }

  handleStreamed() {
    this.setupStreamedInContext();
    this.setupStreamedOutContext();
    this.invokeUserCallback('command', this.commandHandler, this.ctx);
  }

  private serializeResponse(method: protobuf.Method, message: any): any {
    if (
        method.resolvedResponseType!.fullName ===
        '.google.protobuf.Any'
    ) {
      // special handling to emit JSON to topics by defining return type as proto Any
      return AnySupport.serialize(message, false, true);
    } else {
      const messageProto =
          this.grpcMethod!.resolvedResponseType!.create(message);
      return AnySupport.serialize(messageProto, false, false);
    }
  }

  setupUnaryOutContext() {
    const ctx = this.ctx as Action.UnaryCommandContext;

    const effects: protocol.SideEffect[] = [];

    // FIXME: remove for version 0.8 (https://github.com/lightbend/kalix-proxy/issues/410)
    ctx.thenForward = (
      method: EffectMethod,
      message: Message,
      metadata?: Metadata,
    ): void => {
      console.warn(
        "WARNING: Action context 'thenForward' is deprecated. Please use 'forward' instead.",
      );
      ctx.forward(method, message, metadata, true);
    };

    ctx.forward = (
      method: EffectMethod,
      message: Message,
      metadata?: Metadata,
      internalCall?: boolean,
    ): void => {
      this.ensureNotCancelled();
      this.streamDebug('Forwarding to %s', method);
      ctx.alreadyReplied = true;
      if (!internalCall)
        console.warn(
          "WARNING: Action context 'forward' is deprecated. Please use 'replies.forward' instead.",
        );
      const forward = this.actionService.effectSerializer.serializeEffect(
        method,
        message,
        metadata,
      );
      this.grpcCallback!(null, {
        forward: forward,
        sideEffects: effects,
      });
    };

    ctx.write = (message: any, metadata?: Metadata): void => {
      this.ensureNotCancelled();
      this.streamDebug('Sending reply');
      ctx.alreadyReplied = true;
      if (message != null) {
        let replyPayload = this.serializeResponse(this.grpcMethod!, message);
        let replyMetadata = null;
        if (metadata && metadata.entries) {
          replyMetadata = {
            entries: metadata.entries,
          };
        }
        this.grpcCallback!(null, {
          reply: {
            payload: replyPayload,
            metadata: replyMetadata,
          },
          sideEffects: effects,
        });
      } else {
        // empty reply
        this.grpcCallback!(null, {
          sideEffects: effects,
        });
      }
    };

    ctx.effect = (
      method: EffectMethod,
      message: Message,
      synchronous: boolean,
      metadata?: Metadata,
      internalCall?: boolean,
    ): void => {
      this.ensureNotCancelled();
      if (!internalCall)
        console.warn(
          "WARNING: Action context 'effect' is deprecated. Please use 'Reply.addEffect' instead.",
        );
      this.streamDebug('Emitting effect to %s', method);
      effects.push(
        this.actionService.effectSerializer.serializeSideEffect(
          method,
          message,
          synchronous,
          metadata,
        ),
      );
    };

    ctx.fail = (description: string, status?: GrpcStatus): void => {
      this.ensureNotCancelled();
      this.streamDebug('Failing with %s', description);
      ctx.alreadyReplied = true;
      this.grpcCallback!(null, {
        failure: this.createFailure(description, status),
        sideEffects: effects,
      });
    };
  }

  setupStreamedOutContext() {
    const ctx = this.ctx as Action.StreamedOutContext;
    const call = this.call as StreamedOutCall | StreamedCall;

    let effects: protocol.SideEffect[] = [];

    this.supportedEvents.push(Action.StreamedOutContext.cancelled);

    this.call.on('cancelled', () => {
      this.streamDebug('Received stream cancelled');
      this.invokeCallback(Action.StreamedOutContext.cancelled, ctx);
    });

    ctx.reply = (reply: Reply): void => {
      this.passReplyThroughContext(ctx, reply);
    };

    ctx.end = (): void => {
      if (call.cancelled) {
        this.streamDebug('end invoked when already cancelled.');
      } else {
        this.streamDebug('Ending stream out');
        call.end();
      }
    };

    // FIXME: remove for version 0.8 (https://github.com/lightbend/kalix-proxy/issues/410)
    ctx.thenForward = (
      method: EffectMethod,
      message: Message,
      metadata?: Metadata,
    ): void => {
      console.warn(
        "WARNING: Action context 'thenForward' is deprecated. Please use 'forward' instead.",
      );
      ctx.forward(method, message, metadata);
    };

    ctx.forward = (
      method: EffectMethod,
      message: Message,
      metadata?: Metadata,
      internalCall?: boolean,
    ): void => {
      this.ensureNotCancelled();
      this.streamDebug('Forwarding to %s', method);
      const forward = this.actionService.effectSerializer.serializeEffect(
        method,
        message,
        metadata,
      );
      call.write({
        forward: forward,
        sideEffects: effects,
      });
      effects = []; // clear effects after each streamed write
    };

    ctx.write = (message: any, metadata?: Metadata): void => {
      this.ensureNotCancelled();
      this.streamDebug('Sending reply');
      if (message != null) {
        let replyPayload = this.serializeResponse(this.grpcMethod!, message);
        let replyMetadata = null;
        if (metadata && metadata.entries) {
          replyMetadata = {
            entries: metadata.entries,
          };
        }
        call.write({
          reply: {
            payload: replyPayload,
            metadata: replyMetadata,
          },
          sideEffects: effects,
        });
      } else {
        // empty reply
        call.write({
          sideEffects: effects,
        });
      }
      effects = []; // clear effects after each streamed write
    };

    ctx.effect = (
      method: EffectMethod,
      message: Message,
      synchronous: boolean,
      metadata?: Metadata,
      internalCall?: boolean,
    ): void => {
      this.ensureNotCancelled();
      if (!internalCall)
        console.warn(
          "WARNING: Action context 'effect' is deprecated. Please use 'Reply.addEffect' instead.",
        );
      this.streamDebug('Emitting effect to %s', method);
      effects.push(
        this.actionService.effectSerializer.serializeSideEffect(
          method,
          message,
          synchronous,
          metadata,
        ),
      );
    };

    ctx.fail = (description: string, status?: GrpcStatus): void => {
      this.ensureNotCancelled();
      this.streamDebug('Failing with %s', description);
      call.write({
        failure: this.createFailure(description, status),
        sideEffects: effects,
      });
      effects = []; // clear effects after each streamed write
    };
  }

  setupStreamedInContext() {
    const ctx = this.ctx as Action.StreamedInContext;
    const call = this.call as StreamedInCall | StreamedCall;

    this.supportedEvents.push(Action.StreamedInContext.data);
    this.supportedEvents.push(Action.StreamedInContext.end);

    this.call.on('data', (data) => {
      this.streamDebug('Received data in');
      const deserializedCommand = this.actionService.anySupport.deserialize(
        data.payload,
      );
      this.invokeCallback(
        Action.StreamedInContext.data,
        deserializedCommand,
        this.ctx,
      );
    });

    this.call.on('end', () => {
      this.streamDebug('Received stream end');
      const userReturn = this.invokeCallback(
        Action.StreamedInContext.end,
        this.ctx,
      );
      if (userReturn instanceof Reply) {
        this.passReplyThroughContext(ctx, userReturn);
      } else {
        this.streamDebug(
          'Ignored unknown (non Reply) return value from end callback',
        );
      }
    });

    ctx.cancel = () => {
      if (call.cancelled) {
        this.streamDebug('cancel invoked when already cancelled.');
      } else {
        // FIXME: there doesn't seem to be any server-side cancel, only client-side, so what was this doing before?
        // call.cancel();
      }
    };
  }

  invokeUserCallback(
    callbackName: string,
    callback: Function,
    ...args: any[]
  ): any {
    try {
      return callback.apply(null, args);
    } catch (err) {
      const error = 'Error handling ' + callbackName;
      this.streamDebug(error);
      console.error(err);
      if (!this.call.cancelled) {
        const failure: protocol.Response = {
          failure: {
            description: error,
          },
        };
        if (this.grpcCallback != null) {
          this.grpcCallback(null, failure);
        } else if ('write' in this.call) {
          this.call.write(failure);
          this.call.end();
        }
      }
    }
  }

  createFailure(
    description: string,
    grpcStatus?: GrpcStatus,
  ): protocol.Failure {
    const failure: protocol.Failure = {
      description: description,
    };
    if (grpcStatus !== undefined) {
      if (grpcStatus === 0) {
        throw new Error('gRPC failure status code must not be OK');
      }
      if (grpcStatus < 0 || grpcStatus > 16) {
        throw new Error('Invalid gRPC status code: ' + grpcStatus);
      }
      failure.grpcStatusCode = grpcStatus;
    }
    return failure;
  }
}

/** @internal */
export default class ActionSupport {
  private actionServices: { [serviceName: string]: ActionService };

  constructor() {
    this.actionServices = {};
  }

  addService(component: Action, allComponents: ServiceMap) {
    this.actionServices[component.serviceName] = new ActionService(
      component.root,
      component.service,
      component.commandHandlers,
      allComponents,
    );
  }

  componentType() {
    return 'kalix.component.action.Actions';
  }

  register(server: grpc.Server) {
    const includeDirs = [
      path.join(__dirname, '..', 'proto'),
      path.join(__dirname, '..', 'protoc', 'include'),
      path.join(__dirname, '..', '..', 'proto'),
      path.join(__dirname, '..', '..', 'protoc', 'include'),
    ];
    const packageDefinition = protoLoader.loadSync(
      path.join('kalix', 'component', 'action', 'action.proto'),
      {
        includeDirs: includeDirs,
      },
    );
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const actionService: grpc.ServiceDefinition = (grpcDescriptor as any).kalix
      .component.action.Actions.service;

    server.addService(actionService, {
      handleUnary: this.handleUnary.bind(this),
      handleStreamedIn: this.handleStreamedIn.bind(this),
      handleStreamedOut: this.handleStreamedOut.bind(this),
      handleStreamed: this.handleStreamed.bind(this),
    });
  }

  createHandler(
    call: Call,
    callback: UnaryCallback | null,
    data: protocol.Command,
  ): ActionHandler | undefined {
    if (data.serviceName && data.name) {
      const actionService = this.actionServices[data.serviceName];
      if (
        actionService &&
        actionService.service.methods.hasOwnProperty(data.name)
      ) {
        if (actionService.commandHandlers.hasOwnProperty(data.name)) {
          return new ActionHandler(
            actionService,
            actionService.service.methods[data.name],
            actionService.commandHandlers[data.name],
            call,
            callback,
            data.metadata,
          );
        } else {
          this.reportError(
            `Service call ${data.serviceName}.${data.name} not implemented`,
            call,
            callback,
          );
          return undefined;
        }
      } else {
        this.reportError(
          `No service call named ${data.serviceName}.${data.name} found`,
          call,
          callback,
        );
        return undefined;
      }
    } else {
      this.reportError('Missing service or method name', call, callback);
      return undefined;
    }
  }

  reportError(error: string, call: Call, callback: UnaryCallback | null): void {
    console.warn(error);
    const failure: protocol.Response = {
      failure: {
        description: error,
      },
    };
    if (callback !== null) {
      callback(null, failure);
    } else if ('write' in call) {
      call.write(failure);
      call.end();
    }
  }

  handleStreamed(call: StreamedCall): void {
    let initial = true;
    call.on('data', (data) => {
      if (initial) {
        initial = false;
        const handler = this.createHandler(call, null, data);
        if (handler) {
          handler.handleStreamed();
        }
      } // ignore the remaining data here, subscribed in setupStreamedInContext
    });
  }

  handleStreamedOut(call: StreamedOutCall): void {
    const handler = this.createHandler(call, null, call.request);
    if (handler) {
      handler.handleStreamedOut();
    }
  }

  handleStreamedIn(call: StreamedInCall, callback: UnaryCallback) {
    let initial = true;
    call.on('data', (data) => {
      if (initial) {
        initial = false;
        const handler = this.createHandler(call, callback, data);
        if (handler) {
          handler.handleStreamedIn();
        }
      } // ignore the remaining data here, subscribed in setupStreamedInContext
    });
  }

  handleUnary(call: UnaryCall, callback: UnaryCallback) {
    const handler = this.createHandler(call, callback, call.request);
    if (handler) {
      handler.handleUnary();
    }
  }
}
