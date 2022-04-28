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

import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import AnySupport from './protobuf-any';
import { CommandHandler, InternalContext } from './command';
import CommandHelper from './command-helper';
import { ServiceMap } from './kalix';
import ValueEntity from './value-entity';
import * as proto from '../proto/protobuf-bundle';

const debug = require('debug')('kalix-value-entity');
// Bind to stdout
debug.log = console.log.bind(console);

namespace protocol {
  export type Any = proto.google.protobuf.IAny;

  export type StreamIn = proto.kalix.component.valueentity.IValueEntityStreamIn;

  export type Init = proto.kalix.component.valueentity.IValueEntityInit;

  export type InitState =
    proto.kalix.component.valueentity.IValueEntityInitState;

  export type StreamOut =
    proto.kalix.component.valueentity.IValueEntityStreamOut;

  export type Reply = proto.kalix.component.valueentity.IValueEntityReply;

  export type Call = grpc.ServerDuplexStream<StreamIn, StreamOut>;
}

class ValueEntitySupport {
  readonly root: protobuf.Root;
  readonly service: protobuf.Service;
  readonly commandHandlers: ValueEntity.CommandHandlers;
  readonly initial?: ValueEntity.InitialCallback;
  readonly options: Required<ValueEntity.Options>;
  readonly anySupport: AnySupport;
  readonly allComponents: ServiceMap;

  constructor(
    root: protobuf.Root,
    service: protobuf.Service,
    commandHandlers: ValueEntity.CommandHandlers,
    initial: ValueEntity.InitialCallback | undefined,
    options: Required<ValueEntity.Options>,
    allComponents: ServiceMap,
  ) {
    this.root = root;
    this.service = service;
    this.commandHandlers = commandHandlers;
    this.initial = initial;
    this.options = options;
    this.anySupport = new AnySupport(this.root);
    this.allComponents = allComponents;
  }

  serialize(obj: any, requireJsonType?: boolean): protocol.Any {
    return AnySupport.serialize(
      obj,
      this.options.serializeAllowPrimitives,
      this.options.serializeFallbackToJson,
      requireJsonType,
    );
  }

  deserialize(any?: protocol.Any | null): any {
    return this.anySupport.deserialize(any);
  }

  create(call: protocol.Call, init: protocol.Init): ValueEntityHandler {
    return new ValueEntityHandler(this, call, init.entityId, init.state);
  }
}

/**
 * Handler for a single event sourced entity.
 * @private
 */
class ValueEntityHandler {
  private entity: ValueEntitySupport;
  private call: protocol.Call;
  private entityId: string;
  private streamId: string;
  private commandHelper: CommandHelper;
  private anyState?: protocol.Any | null;

  constructor(
    support: ValueEntitySupport,
    call: protocol.Call,
    entityId?: string | null,
    initialState?: protocol.InitState | null,
  ) {
    this.entity = support;
    this.call = call;
    this.entityId = entityId ?? '';

    // The current entity state, serialized
    if (!initialState || Object.keys(initialState).length === 0) {
      this.anyState = null;
    } else {
      this.anyState = initialState.value; // already serialized
    }

    this.streamId = Math.random().toString(16).substring(2, 7);

    this.commandHelper = new CommandHelper(
      this.entityId,
      support.service,
      this.streamId,
      call,
      this.commandHandlerFactory.bind(this),
      support.allComponents,
      debug,
    );

    this.streamDebug('Started new stream');
  }

  streamDebug(msg: string, ...args: any[]): void {
    debug('%s [%s] - ' + msg, ...[this.streamId, this.entityId].concat(args));
  }

  commandHandlerFactory(commandName: string): CommandHandler | null {
    return this.withState((state) => {
      if (this.entity.commandHandlers.hasOwnProperty(commandName)) {
        return async (command: protobuf.Message, ctx: InternalContext) => {
          let updatedAnyState = null as protocol.Any | null;
          let deleted = false;

          const context = ctx.context as ValueEntity.ValueEntityCommandContext;

          context.updateState = (newState) => {
            ctx.ensureActive();
            if (newState === null)
              throw new Error("Entity state cannot be set to 'null'");
            if (deleted) deleted = false; // update after delete cancels delete
            updatedAnyState = this.entity.serialize(newState, true);
          };

          context.deleteState = () => {
            ctx.ensureActive();
            deleted = true;
          };

          const userReply = await this.entity.commandHandlers[commandName](
            command,
            state,
            context,
          );

          if (!ctx.reply) ctx.reply = {};
          const reply = ctx.reply as protocol.Reply;

          if (deleted) {
            reply.stateAction = { delete: {} };
            this.anyState = null;
            ctx.commandDebug("Deleting state '%s'", this.entityId);
          } else if (updatedAnyState !== null) {
            reply.stateAction = {
              update: {
                value: updatedAnyState,
              },
            };
            this.anyState = updatedAnyState; // already serialized
            ctx.commandDebug("Updating state '%s'", updatedAnyState.type_url);
          }

          return userReply;
        };
      } else {
        return null;
      }
    });
  }

  onData(valueEntityStreamIn: protocol.StreamIn): void {
    try {
      if (valueEntityStreamIn.command) {
        this.commandHelper.handleCommand(valueEntityStreamIn.command);
      } else {
        throw new Error('Unknown message in value entity stream.');
      }
    } catch (err) {
      this.streamDebug(
        'Error handling message, terminating stream: %o',
        valueEntityStreamIn,
      );
      console.error(err);
      this.call.write({
        failure: {
          commandId: 0,
          description:
            'Fatal error handling message, check user container logs.',
        },
      });
      this.call.end();
    }
  }

  updateState(stateObj: any): void {
    const serialized = this.entity.serialize(stateObj, false);
    this.anyState = serialized;
  }

  withState(
    callback: (state: any) => CommandHandler | null,
  ): CommandHandler | null {
    if (this.anyState === null && this.entity.initial) {
      const initial = this.entity.initial(this.entityId);
      if (initial === null)
        throw new Error("Initial entity state must not be 'null'");
      this.updateState(initial);
    }
    // serialize/deserialize makes sure only ctx.update(state) makes changes
    // visible for subsequent commands
    const stateObj = this.entity.deserialize(this.anyState);
    return callback(stateObj);
  }

  onEnd() {
    this.streamDebug('Stream terminating');
    this.call.end();
  }
}

class ValueEntityServices {
  private services: { [serviceName: string]: ValueEntitySupport };

  constructor() {
    this.services = {};
  }

  addService(entity: ValueEntity, allComponents: ServiceMap): void {
    this.services[entity.serviceName] = new ValueEntitySupport(
      entity.root,
      entity.service,
      entity.commandHandlers,
      entity.initial,
      entity.options,
      allComponents,
    );
  }

  componentType(): string {
    return 'kalix.component.valueentity.ValueEntities';
  }

  register(server: grpc.Server): void {
    const includeDirs = [
      path.join(__dirname, '..', 'proto'),
      path.join(__dirname, '..', 'protoc', 'include'),
      path.join(__dirname, '..', '..', 'proto'),
      path.join(__dirname, '..', '..', 'protoc', 'include'),
    ];
    const packageDefinition = protoLoader.loadSync(
      path.join('kalix', 'component', 'valueentity', 'value_entity.proto'),
      {
        includeDirs: includeDirs,
      },
    );
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const entityService = (grpcDescriptor as any).kalix.component.valueentity
      .ValueEntities.service;

    server.addService(entityService, {
      handle: this.handle.bind(this),
    });
  }

  handle(call: protocol.Call): void {
    let service: ValueEntityHandler;

    call.on('data', (valueEntityStreamIn: protocol.StreamIn) => {
      if (valueEntityStreamIn.init) {
        if (service != null) {
          service.streamDebug(
            'Terminating entity due to duplicate init message.',
          );
          console.error('Terminating entity due to duplicate init message.');
          call.write({
            failure: {
              description: 'Init message received twice.',
            },
          });
          call.end();
        } else if (
          valueEntityStreamIn.init.serviceName &&
          valueEntityStreamIn.init.serviceName in this.services
        ) {
          service = this.services[valueEntityStreamIn.init.serviceName].create(
            call,
            valueEntityStreamIn.init,
          );
        } else {
          console.error(
            "Received command for unknown service: '%s'",
            valueEntityStreamIn.init.serviceName,
          );
          call.write({
            failure: {
              description:
                "Service '" +
                valueEntityStreamIn.init.serviceName +
                "' unknown.",
            },
          });
          call.end();
        }
      } else if (service != null) {
        service.onData(valueEntityStreamIn);
      } else {
        console.error(
          'Unknown message received before init %o',
          valueEntityStreamIn,
        );
        call.write({
          failure: {
            description: 'Unknown message received before init',
          },
        });
        call.end();
      }
    });

    call.on('end', () => {
      if (service != null) {
        service.onEnd();
      } else {
        call.end();
      }
    });
  }
}

export = ValueEntityServices;
