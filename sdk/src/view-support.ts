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

import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import AnySupport from './protobuf-any';
import { Metadata } from './metadata';
import { ServiceMap } from './kalix';
import { View } from './view';
import * as protocol from '../types/protocol/views';

const debug = require('debug')('kalix-view');
// Bind to stdout
debug.log = console.log.bind(console);

/** @internal */
export default class ViewServices {
  private services: { [serviceName: string]: View };

  constructor() {
    this.services = {};
  }

  addService(component: View, _allComponents: ServiceMap): void {
    this.services[component.serviceName] = component;
  }

  componentType(): string {
    return 'kalix.component.view.Views';
  }

  static loadProtocol() {
    const packageDefinition = protoLoader.loadSync(
      path.join('kalix', 'component', 'view', 'view.proto'),
      {
        includeDirs: [path.join(__dirname, '..', 'proto')],
        defaults: true,
      },
    );

    const descriptor = grpc.loadPackageDefinition(
      packageDefinition,
    ) as unknown as protocol.Descriptor;

    return descriptor.kalix.component.view.Views.service;
  }

  register(server: grpc.Server): void {
    const service = ViewServices.loadProtocol();

    const handlers: protocol.Handlers = {
      Handle: this.handle,
    };

    server.addService(service, handlers);
  }

  handle: protocol.Handle = (call) => {
    const failAndEndCall = function (_description: string): void {
      // FIXME no failure reporting in protocol and this does not reach the proxy as a failure
      /*
      call.write({
        failure: {
          description: description
        }
      })
      */
      call.end();
    };

    call.on('data', (viewStreamIn: protocol.StreamIn) => {
      // FIXME: It is currently only implemented to support one request (ReceiveEvent) with one response (Upsert).
      // see https://github.com/lightbend/kalix-proxy/issues/186
      // and https://github.com/lightbend/kalix-proxy/issues/187
      if (viewStreamIn.receive?.serviceName) {
        const receiveEvent = viewStreamIn.receive,
          service = this.services[viewStreamIn.receive.serviceName];
        if (service && service.updateHandlers && receiveEvent.commandName) {
          const updateHandler =
            service.updateHandlers[receiveEvent.commandName];
          if (updateHandler) {
            try {
              const anySupport = new AnySupport(service.root),
                metadata = Metadata.fromProtocol(receiveEvent.metadata),
                payload = anySupport.deserialize(receiveEvent.payload),
                existingState = receiveEvent.bySubjectLookupResult
                  ? anySupport.deserialize(
                      receiveEvent.bySubjectLookupResult.value,
                    )
                  : undefined,
                grpcMethod = service.service.methods[receiveEvent.commandName],
                context: View.UpdateHandlerContext = {
                  viewId: service.options.viewId,
                  eventSubject: metadata.cloudevent.subject,
                  metadata: metadata,
                  commandName: receiveEvent.commandName,
                };
              const result = updateHandler(payload, existingState, context);
              if (result) {
                const resultProto =
                    grpcMethod.resolvedResponseType!.create(result),
                  resultPayload = AnySupport.serialize(
                    resultProto,
                    false,
                    false,
                  );
                call.write({
                  upsert: {
                    row: {
                      value: resultPayload,
                    },
                  },
                });
              } else {
                call.write({
                  upsert: {
                    row: null,
                  },
                });
              }
              call.end();
            } catch (err) {
              console.error(
                'Error handling event, terminating stream: %o',
                viewStreamIn,
              );
              console.error(err);
              failAndEndCall(
                'Fatal error handling event, check user container logs.',
              );
            }
          } else {
            console.error(
              "No handler defined for commandName: '%s', view will not be updated and event stream will be stuck.",
              receiveEvent.commandName,
            );
            failAndEndCall(
              "No handler defined for commandName '" +
                receiveEvent.commandName +
                "'.",
            );
          }
        } else {
          console.error(
            "Received event for unknown service: '%s'",
            viewStreamIn.receive.serviceName,
          );
          failAndEndCall(
            "Service '" + viewStreamIn.receive.serviceName + "' unknown.",
          );
        }
      } else {
        console.error('Unknown view message received %o', viewStreamIn);
        failAndEndCall('Unknown view message received');
      }
    });

    call.on('end', () => {
      call.end();
    });
  };
}
