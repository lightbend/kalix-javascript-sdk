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
import util from 'util';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import AnySupport from './protobuf-any';
import { CommandHandler, InternalContext } from './command';
import CommandHelper from './command-helper';
import * as replicatedData from './replicated-data';
import { ReplicatedEntity } from './replicated-entity';
import { ServiceMap } from './kalix';
import * as proto from '../proto/protobuf-bundle';

const debug = require('debug')('kalix-replicated-entity');

namespace protocol {
  export type StreamIn =
    proto.kalix.component.replicatedentity.IReplicatedEntityStreamIn;
  export const StreamIn =
    proto.kalix.component.replicatedentity.ReplicatedEntityStreamIn;

  export type Init =
    proto.kalix.component.replicatedentity.IReplicatedEntityInit;

  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;
  export const Delta =
    proto.kalix.component.replicatedentity.ReplicatedEntityDelta;

  export type StreamOut =
    proto.kalix.component.replicatedentity.IReplicatedEntityStreamOut;

  export type Reply =
    proto.kalix.component.replicatedentity.IReplicatedEntityReply;

  export type Call = grpc.ServerDuplexStream<StreamIn, StreamOut>;
}

interface ReplicatedEntityHandlers {
  commandHandlers: ReplicatedEntity.CommandHandlers;
  onStateSet: ReplicatedEntity.OnStateSetCallback;
  defaultValue: ReplicatedEntity.DefaultValueCallback;
}

interface InternalReplicatedEntityContext extends InternalContext {
  context: ReplicatedEntity.ReplicatedEntityCommandContext;
  deleted: boolean;
  noState: boolean;
  defaultValue: boolean;
  reply: protocol.Reply;
}

export class ReplicatedEntityServices {
  private services: { [serviceName: string]: ReplicatedEntitySupport };

  constructor() {
    this.services = {};
  }

  addService(entity: ReplicatedEntity, allComponents: ServiceMap) {
    this.services[entity.serviceName] = new ReplicatedEntitySupport(
      entity.root,
      entity.service,
      {
        commandHandlers: entity.commandHandlers,
        onStateSet: entity.onStateSet,
        defaultValue: entity.defaultValue,
      },
      allComponents,
    );
  }

  componentType(): string {
    return 'kalix.component.replicatedentity.ReplicatedEntities';
  }

  register(server: grpc.Server): void {
    const includeDirs = [
      path.join(__dirname, '..', 'proto'),
      path.join(__dirname, '..', 'protoc', 'include'),
      path.join(__dirname, '..', '..', 'proto'),
      path.join(__dirname, '..', '..', 'protoc', 'include'),
    ];
    const packageDefinition = protoLoader.loadSync(
      path.join(
        'kalix',
        'component',
        'replicatedentity',
        'replicated_entity.proto',
      ),
      {
        includeDirs: includeDirs,
      },
    );
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const entityService = (grpcDescriptor as any).kalix.component
      .replicatedentity.ReplicatedEntities.service;

    server.addService(entityService, {
      handle: this.handle.bind(this),
    });
  }

  handle(call: protocol.Call): void {
    let service: ReplicatedEntityHandler;

    call.on('data', (streamIn: protocol.StreamIn) => {
      // cycle through the ReplicatedEntityStreamIn type, this will ensure default values are initialised
      const replicatedEntityStreamIn = protocol.StreamIn.fromObject(streamIn);

      if (replicatedEntityStreamIn.init) {
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
          replicatedEntityStreamIn.init.serviceName &&
          replicatedEntityStreamIn.init.serviceName in this.services
        ) {
          service = this.services[
            replicatedEntityStreamIn.init.serviceName
          ].create(call, replicatedEntityStreamIn.init);
        } else {
          console.error(
            "Received command for unknown Replicated Entity service: '%s'",
            replicatedEntityStreamIn.init.serviceName,
          );
          call.write({
            failure: {
              description:
                "Replicated Entity service '" +
                replicatedEntityStreamIn.init.serviceName +
                "' unknown.",
            },
          });
          call.end();
        }
      } else if (service != null) {
        service.onData(replicatedEntityStreamIn);
      } else {
        console.error(
          'Unknown message received before init %o',
          replicatedEntityStreamIn,
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

export class ReplicatedEntitySupport {
  readonly root: protobuf.Root;
  readonly service: protobuf.Service;
  readonly anySupport: AnySupport;
  readonly commandHandlers: ReplicatedEntity.CommandHandlers;
  readonly onStateSet: ReplicatedEntity.OnStateSetCallback;
  readonly defaultValue: ReplicatedEntity.DefaultValueCallback;
  readonly allComponents: ServiceMap;

  constructor(
    root: protobuf.Root,
    service: protobuf.Service,
    handlers: ReplicatedEntityHandlers,
    allComponents: ServiceMap,
  ) {
    this.root = root;
    this.service = service;
    this.anySupport = new AnySupport(this.root);
    this.commandHandlers = handlers.commandHandlers;
    this.onStateSet = handlers.onStateSet;
    this.defaultValue = handlers.defaultValue;
    this.allComponents = allComponents;
  }

  create(call: protocol.Call, init: protocol.Init): ReplicatedEntityHandler {
    if (!init.entityId) throw Error('Entity id is required');
    const handler = new ReplicatedEntityHandler(this, call, init.entityId);
    if (init.delta) {
      handler.handleInitialDelta(init.delta);
    }
    return handler;
  }
}

/*
 * Handler for a single Replicated Entity.
 */
export class ReplicatedEntityHandler {
  private entity: ReplicatedEntitySupport;
  private call: protocol.Call;
  private entityId: string;
  private streamId: string;
  private commandHelper: CommandHelper;
  private currentState: replicatedData.ReplicatedData | null;

  constructor(
    support: ReplicatedEntitySupport,
    call: protocol.Call,
    entityId: string,
  ) {
    this.entity = support;
    this.call = call;
    this.entityId = entityId;

    this.currentState = null;

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

  commandHandlerFactory(commandName: string): CommandHandler | null {
    if (this.entity.commandHandlers.hasOwnProperty(commandName)) {
      return async (
        command: protobuf.Message,
        internalContext: InternalContext,
      ) => {
        const ctx = internalContext as InternalReplicatedEntityContext;

        this.addStateManagementToContext(ctx);

        const userReply = await this.entity.commandHandlers[commandName](
          command,
          ctx.context,
        );

        this.setStateActionOnReply(ctx);

        return userReply;
      };
    } else {
      return null;
    }
  }

  setStateActionOnReply(ctx: InternalReplicatedEntityContext) {
    if (ctx.deleted) {
      ctx.commandDebug('Deleting entity');
      ctx.reply.stateAction = {
        delete: {},
      };
      this.currentState = null;
    } else if (this.currentState !== null) {
      const delta = this.currentState.getAndResetDelta();
      if (delta != null) {
        ctx.commandDebug('Updating entity');
        ctx.reply.stateAction = {
          update: delta,
        };
      }
    }
  }

  addStateManagementToContext(ctx: InternalReplicatedEntityContext) {
    ctx.deleted = false;
    ctx.noState = this.currentState === null;
    ctx.defaultValue = false;
    if (ctx.noState) {
      this.currentState = this.entity.defaultValue(this.entityId);
      if (this.currentState !== null) {
        this.entity.onStateSet(this.currentState, this.entityId);
        ctx.defaultValue = true;
      }
    }

    ctx.context.delete = (): void => {
      ctx.ensureActive();
      if (this.currentState === null) {
        throw new Error("Can't delete entity that hasn't been created.");
      } else if (ctx.noState) {
        this.currentState = null;
      } else {
        ctx.deleted = true;
      }
    };

    Object.defineProperty(ctx.context, 'state', {
      get: () => {
        ctx.ensureActive();
        return this.currentState;
      },
      set: (state: replicatedData.ReplicatedData) => {
        ctx.ensureActive();
        if (this.currentState !== null) {
          throw new Error(
            "Cannot create a new Replicated Entity state after it's been created.",
          );
        } else if (typeof state.getAndResetDelta !== 'function') {
          throw new Error(
            util.format('%o is not a Replicated Data type', state),
          );
        } else {
          this.currentState = state;
          this.entity.onStateSet(this.currentState, this.entityId);
        }
      },
    });
  }

  streamDebug(msg: string, ...args: any[]): void {
    debug('%s [%s] - ' + msg, ...[this.streamId, this.entityId].concat(args));
  }

  handleInitialDelta(delta: protocol.Delta): void {
    this.streamDebug(
      'Handling initial delta for Replicated Data type %s',
      protocol.Delta.fromObject(delta).delta,
    );
    if (this.currentState === null) {
      this.currentState = replicatedData.createForDelta(delta);
    }
    this.currentState.applyDelta(
      delta,
      this.entity.anySupport,
      replicatedData.createForDelta,
    );
    this.entity.onStateSet(this.currentState, this.entityId);
  }

  async onData(replicatedEntityStreamIn: protocol.StreamIn): Promise<void> {
    try {
      await this.handleReplicatedEntityStreamIn(replicatedEntityStreamIn);
    } catch (err) {
      this.streamDebug(
        'Error handling message, terminating stream: %o',
        replicatedEntityStreamIn,
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

  async handleReplicatedEntityStreamIn(
    replicatedEntityStreamIn: protocol.StreamIn,
  ): Promise<void> {
    if (replicatedEntityStreamIn.delta && this.currentState === null) {
      this.handleInitialDelta(replicatedEntityStreamIn.delta);
    } else if (replicatedEntityStreamIn.delta) {
      this.streamDebug(
        'Received delta for Replicated Data type %s',
        protocol.Delta.fromObject(replicatedEntityStreamIn.delta).delta,
      );
      if (this.currentState)
        this.currentState.applyDelta(
          replicatedEntityStreamIn.delta,
          this.entity.anySupport,
          replicatedData.createForDelta,
        );
    } else if (replicatedEntityStreamIn.delete) {
      this.streamDebug('Received Replicated Entity delete');
      this.currentState = null;
    } else if (replicatedEntityStreamIn.command) {
      await this.commandHelper.handleCommand(replicatedEntityStreamIn.command);
    } else {
      this.call.write({
        failure: {
          commandId: 0,
          description: util.format(
            'Unknown message: %o',
            replicatedEntityStreamIn,
          ),
        },
      });
      this.call.end();
    }
  }

  onEnd() {
    this.streamDebug('Stream terminating');
    this.call.end();
  }
}
