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
import EventSourcedEntity from './event-sourced-entity';
import Long from 'long';
import { ServiceMap } from './kalix';
import { Reply } from './reply';
import { Serializable } from './serializable';
import * as proto from '../proto/protobuf-bundle';

const debug = require('debug')('kalix-event-sourced-entity');
// Bind to stdout
debug.log = console.log.bind(console);

namespace protocol {
  export type Any = proto.google.protobuf.IAny;

  export type StreamIn =
    proto.kalix.component.eventsourcedentity.IEventSourcedStreamIn;

  export type Init = proto.kalix.component.eventsourcedentity.IEventSourcedInit;

  export type Snapshot =
    proto.kalix.component.eventsourcedentity.IEventSourcedSnapshot;

  export type StreamOut =
    proto.kalix.component.eventsourcedentity.IEventSourcedStreamOut;

  export type Reply =
    proto.kalix.component.eventsourcedentity.IEventSourcedReply;

  export type Call = grpc.ServerDuplexStream<StreamIn, StreamOut>;
}

interface InternalEventSourcedEntityContext extends InternalContext {
  context: EventSourcedEntity.EventSourcedEntityCommandContext;
  events: protocol.Any[];
}

class EventSourcedEntitySupport {
  readonly root: protobuf.Root;
  readonly service: protobuf.Service;
  readonly behavior?: EventSourcedEntity.BehaviorCallback;
  readonly initial?: EventSourcedEntity.InitialCallback;
  readonly options: Required<EventSourcedEntity.Options>;
  readonly anySupport: AnySupport;
  readonly allComponents: ServiceMap;

  constructor(
    root: protobuf.Root,
    service: protobuf.Service,
    behavior: EventSourcedEntity.BehaviorCallback | undefined,
    initial: EventSourcedEntity.InitialCallback | undefined,
    options: Required<EventSourcedEntity.Options>,
    allComponents: ServiceMap,
  ) {
    this.root = root;
    this.service = service;
    this.behavior = behavior;
    this.initial = initial;
    this.options = options;
    this.anySupport = new AnySupport(this.root);
    this.allComponents = allComponents;
    if (!this.options.snapshotEvery)
      console.warn(
        'Snapshotting disabled for entity ' +
          this.options.entityType +
          ', this is not recommended.',
      );
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

  create(call: protocol.Call, init: protocol.Init): EventSourcedEntityHandler {
    const handler = new EventSourcedEntityHandler(this, call, init.entityId);
    if (init.snapshot) {
      handler.handleSnapshot(init.snapshot);
    }
    return handler;
  }
}

/**
 * Handler for a single event sourced entity.
 * @private
 */
class EventSourcedEntityHandler {
  private entity: EventSourcedEntitySupport;
  private call: protocol.Call;
  private entityId: string;
  private streamId: string;
  private commandHelper: CommandHelper;
  private anyState?: protocol.Any | null;
  private sequence: number;

  constructor(
    support: EventSourcedEntitySupport,
    call: protocol.Call,
    entityId?: string | null,
  ) {
    this.entity = support;
    this.call = call;
    this.entityId = entityId ?? '';

    // The current entity state, serialized to an Any
    this.anyState = null;

    // The current sequence number
    this.sequence = 0;

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
    return this.withBehaviorAndState(
      (behavior: EventSourcedEntity.Behavior, state: any) => {
        if (behavior.commandHandlers.hasOwnProperty(commandName)) {
          return async (
            command: protobuf.Message,
            internalContext: InternalContext,
          ) => {
            const ctx = internalContext as InternalEventSourcedEntityContext;

            ctx.events = [];

            ctx.context.emit = (event: Serializable) => {
              ctx.ensureActive();

              const serEvent = this.entity.serialize(event, true);
              ctx.events.push(serEvent);
              ctx.commandDebug("Emitting event '%s'", serEvent.type_url);
            };

            const userReply = await behavior.commandHandlers[commandName](
              command,
              state,
              ctx.context,
            );

            // when not using Reply a failure is signaled by throwing, but
            // when using Reply a failed reply also means applying events & creating snapshots should be skipped
            if (!(userReply instanceof Reply) || !userReply.getFailure()) {
              // Invoke event handlers first
              let snapshot = false;
              ctx.events.forEach((event) => {
                this.handleEvent(event);
                this.sequence++;
                if (this.sequence % this.entity.options.snapshotEvery === 0) {
                  snapshot = true;
                }
              });

              if (ctx.events.length > 0) {
                ctx.commandDebug('Emitting %d events', ctx.events.length);
              }

              if (!ctx.reply) ctx.reply = {};
              const reply = ctx.reply as protocol.Reply;

              reply.events = ctx.events;

              if (snapshot) {
                ctx.commandDebug(
                  "Snapshotting current state with type '%s'",
                  this.anyState?.type_url,
                );
                reply.snapshot = this.anyState;
              }
            }
            return userReply;
          };
        } else {
          return null;
        }
      },
    );
  }

  private sequenceNumber(sequence?: Long | number | null): number {
    if (!sequence) return 0;
    else if (Long.isLong(sequence)) return sequence.toNumber();
    else return sequence;
  }

  handleSnapshot(snapshot: protocol.Snapshot): void {
    this.sequence = this.sequenceNumber(snapshot.snapshotSequence);
    this.streamDebug(
      "Handling snapshot with type '%s' at sequence %s",
      snapshot.snapshot?.type_url,
      this.sequence,
    );
    this.anyState = snapshot.snapshot;
  }

  onData(eventSourcedStreamIn: protocol.StreamIn): void {
    try {
      this.handleEventSourcedStreamIn(eventSourcedStreamIn);
    } catch (err) {
      this.streamDebug(
        'Error handling message, terminating stream: %o',
        eventSourcedStreamIn,
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

  handleEventSourcedStreamIn(eventSourcedStreamIn: protocol.StreamIn): void {
    if (eventSourcedStreamIn.event) {
      const event = eventSourcedStreamIn.event;
      this.sequence = this.sequenceNumber(event.sequence);
      this.streamDebug(
        "Received event %s with type '%s'",
        this.sequence,
        event.payload?.type_url,
      );
      this.handleEvent(event.payload);
    } else if (eventSourcedStreamIn.command) {
      this.commandHelper.handleCommand(eventSourcedStreamIn.command);
    } else if (eventSourcedStreamIn.snapshotRequest) {
      this.ensureAnyState();
      this.call.write({
        snapshotReply: {
          requestId: eventSourcedStreamIn.snapshotRequest.requestId,
          snapshot: this.anyState,
        },
      });
    } else {
      this.streamDebug(
        'Unknown event sourced stream in message: %s',
        eventSourcedStreamIn,
      );
    }
  }

  handleEvent(event?: protocol.Any | null): void {
    const deserEvent = this.entity.deserialize(event);
    this.withBehaviorAndState(
      (behavior: EventSourcedEntity.Behavior, state: any) => {
        if (!event?.type_url)
          throw Error('No type URL specified for event Any');
        const fqName = AnySupport.stripHostName(event.type_url);
        let handler: EventSourcedEntity.EventHandler | null = null;
        if (behavior.eventHandlers.hasOwnProperty(fqName)) {
          handler = behavior.eventHandlers[fqName];
        } else {
          const idx = fqName.lastIndexOf('.');
          let name;
          if (idx >= 0) {
            name = fqName.substring(idx + 1);
          } else {
            name = fqName;
          }
          if (behavior.eventHandlers.hasOwnProperty(name)) {
            handler = behavior.eventHandlers[name];
          } else {
            throw new Error("No handler found for event '" + fqName + "'");
          }
        }
        const newState = handler(deserEvent, state);
        this.updateState(newState);
        return null;
      },
    );
  }

  updateState(stateObj: any): void {
    this.anyState = this.entity.serialize(stateObj, false);
  }

  ensureAnyState(): void {
    if (this.anyState === null && this.entity.initial) {
      this.updateState(this.entity.initial(this.entityId));
    }
  }

  withBehaviorAndState(
    callback: (
      behavior: EventSourcedEntity.Behavior,
      state: any,
    ) => CommandHandler | null,
  ): CommandHandler | null {
    if (!this.entity.behavior) return null;
    this.ensureAnyState();
    const stateObj = this.entity.deserialize(this.anyState);
    const behavior = this.entity.behavior(stateObj);
    return callback(behavior, stateObj);
  }

  onEnd(): void {
    this.streamDebug('Stream terminating');
    this.call.end();
  }
}

class EventSourcedEntityServices {
  private services: { [serviceName: string]: EventSourcedEntitySupport };

  constructor() {
    this.services = {};
  }

  addService(entity: EventSourcedEntity, allComponents: ServiceMap) {
    this.services[entity.serviceName] = new EventSourcedEntitySupport(
      entity.root,
      entity.service,
      entity.behavior,
      entity.initial,
      entity.options,
      allComponents,
    );
  }

  componentType(): string {
    return 'kalix.component.eventsourcedentity.EventSourcedEntities';
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
        'eventsourcedentity',
        'event_sourced_entity.proto',
      ),
      {
        includeDirs: includeDirs,
      },
    );
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const entityService = (grpcDescriptor as any).kalix.component
      .eventsourcedentity.EventSourcedEntities.service;

    server.addService(entityService, {
      handle: this.handle.bind(this),
    });
  }

  handle(call: protocol.Call) {
    let service: EventSourcedEntityHandler;

    call.on('data', (eventSourcedStreamIn: protocol.StreamIn) => {
      if (eventSourcedStreamIn.init) {
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
          eventSourcedStreamIn.init.serviceName &&
          eventSourcedStreamIn.init.serviceName in this.services
        ) {
          service = this.services[eventSourcedStreamIn.init.serviceName].create(
            call,
            eventSourcedStreamIn.init,
          );
        } else {
          console.error(
            "Received command for unknown service: '%s'",
            eventSourcedStreamIn.init.serviceName,
          );
          call.write({
            failure: {
              description:
                "Service '" +
                eventSourcedStreamIn.init.serviceName +
                "' unknown.",
            },
          });
          call.end();
        }
      } else if (service != null) {
        service.onData(eventSourcedStreamIn);
      } else {
        console.error(
          'Unknown message received before init %o',
          eventSourcedStreamIn,
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

export = EventSourcedEntityServices;
