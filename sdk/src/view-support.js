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

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const debug = require('debug')('kalix-view');
// Bind to stdout
debug.log = console.log.bind(console);
const AnySupport = require('./protobuf-any');
const { Metadata } = require('./metadata');

module.exports = class ViewServices {
  constructor() {
    this.services = {};
  }

  addService(component, allComponents) {
    this.services[component.serviceName] = component;
  }

  componentType() {
    return 'kalix.component.view.Views';
  }

  register(server) {
    // Nothing to register
    const includeDirs = [
      path.join(__dirname, '..', 'proto'),
      path.join(__dirname, '..', 'protoc', 'include'),
      path.join(__dirname, '..', '..', 'proto'),
      path.join(__dirname, '..', '..', 'protoc', 'include'),
    ];
    const packageDefinition = protoLoader.loadSync(
      path.join('kalix', 'component', 'view', 'view.proto'),
      {
        includeDirs: includeDirs,
      },
    );
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const viewService = grpcDescriptor.kalix.component.view.Views.service;

    server.addService(viewService, {
      handle: this.handle.bind(this),
    });
  }

  handle(call) {
    const failAndEndCall = function (description) {
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

    call.on('data', (viewStreamIn) => {
      // FIXME: It is currently only implemented to support one request (ReceiveEvent) with one response (Upsert).
      // see https://github.com/lightbend/kalix-proxy/issues/186
      // and https://github.com/lightbend/kalix-proxy/issues/187
      if (viewStreamIn.receive) {
        const receiveEvent = viewStreamIn.receive,
          service = this.services[receiveEvent.serviceName];
        if (service) {
          const updateHandler =
            service.updateHandlers[receiveEvent.commandName];
          if (updateHandler) {
            try {
              const anySupport = new AnySupport(service.root),
                metadata = new Metadata(
                  receiveEvent.metadata ? receiveEvent.metadata.entries : [],
                ),
                payload = anySupport.deserialize(receiveEvent.payload),
                existingState = receiveEvent.bySubjectLookupResult
                  ? anySupport.deserialize(
                      receiveEvent.bySubjectLookupResult.value,
                    )
                  : undefined,
                grpcMethod = service.service.methods[receiveEvent.commandName],
                /**
                 * Context for a view update event.
                 *
                 * @interface module:kalix.View.UpdateHandlerContext
                 * @property {module:kalix.Metadata} metadata for the event
                 * @property {string} commandName
                 */
                context = {
                  viewId: service.options.viewId,
                  eventSubject: receiveEvent.metadata['ce-subject'],
                  metadata: metadata,
                  commandName: receiveEvent.commandName,
                };
              const result = updateHandler(payload, existingState, context);
              if (result) {
                const resultProto =
                    grpcMethod.resolvedResponseType.create(result),
                  resultPayload = AnySupport.serialize(
                    resultProto,
                    false,
                    false,
                  );
                call.write({
                  upsert: {
                    row: {
                      index: receiveEvent.initialTable,
                      key: receiveEvent.key,
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
            viewStreamIn.init.serviceName,
          );
          failAndEndCall(
            "Service '" + viewStreamIn.init.serviceName + "' unknown.",
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
  }
};
