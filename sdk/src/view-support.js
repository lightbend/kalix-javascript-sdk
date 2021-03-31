/*
 * Copyright 2019 Lightbend Inc.
 */

const path = require("path");
const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");

const debug = require("debug")("akkaserverless-view");
// Bind to stdout
debug.log = console.log.bind(console);
const AnySupport = require("./protobuf-any");
const Metadata = require("./metadata");


module.exports = class ViewServices {

  constructor() {
    this.services = {};
  }

  addService(component, allComponents) {
    this.services[component.serviceName] = component;
  }

  componentType() {
    return "akkaserverless.component.view.Views";
  }

  register(server) {
    // Nothing to register
    const includeDirs = [
      path.join(__dirname, "..", "proto"),
      path.join(__dirname, "..", "protoc", "include")
    ];
    const packageDefinition = protoLoader.loadSync(path.join("akkaserverless", "component", "view", "view.proto"), {
      includeDirs: includeDirs
    });
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const viewService = grpcDescriptor.akkaserverless.component.view.Views.service;

    server.addService(viewService, {
      handle: this.handle.bind(this)
    });
  }

  handle(call) {
    const failAndEndCall = function(description) {
      call.write({
        failure: {
          description: description
        }
      })
      call.end()
    }

    call.on("data", viewStreamIn => {
      // FIXME: It is currently only implemented to support one request (ReceiveEvent) with one response (Upsert).
      // see https://github.com/lightbend/akkaserverless-framework/issues/186
      // and https://github.com/lightbend/akkaserverless-framework/issues/187
      if (viewStreamIn.receive) {
        const receiveEvent = viewStreamIn.receive,
          service = this.services[receiveEvent.serviceName]
        if (service) {
          const updateHandler = service.updateHandlers[receiveEvent.commandName]
          if (updateHandler) {
            try {
              const anySupport = new AnySupport(service.root),
                  metadata = new Metadata(receiveEvent.metada ? receiveEvent.metadata.entries : []),
                  payload = anySupport.deserialize(receiveEvent.payload),
                  existingState = (receiveEvent.bySubjectLookupResult ? anySupport.deserialize(receiveEvent.bySubjectLookupResult.value) : undefined),
                  grpcMethod = service.service.methods[receiveEvent.commandName],
                  /**
                   * Context for a view update event.
                   *
                   * @interface module:akkaserverless.View.ViewHandlerContext
                   * @property {String} sourceEntityId The entity id that the update came from
                   * @property {module:akkaserverless.Metadata} metadata for the event
                   * @property {String} commandName
                   */
                  context = {
                    "viewId": service.viewId,
                    "sourceEntityId": receiveEvent.metadata["ce-subject"],
                    "metadata": metadata,
                    "commandName": receiveEvent.commandName
                 }
              const result = updateHandler(payload, existingState, context)
              if (result) {
                const resultProto = grpcMethod.resolvedResponseType.create(result),
                  resultPayload = AnySupport.serialize(resultProto, false, false);
                call.write({
                  upsert: {
                    row: {
                      table: receiveEvent.initialTable,
                      key: receiveEvent.key,
                      value: resultPayload
                    }
                  }
                });
              } else {
                // FIXME support signalling not doing any update at all rather than write original state back
                console.log("no state back from user function")
                call.write({
                  upsert: {
                    row: receiveEvent.bySubjectLookupResult
                  }
                });
              }
              call.end();
            } catch (err) {
              console.error("Error handling event, terminating stream: %o", viewStreamIn);
              console.error(err);
              failAndEndCall("Fatal error handling event, check user container logs.");
            }
          } else {
            console.error("No handler defined for commandName: '%s'", receiveEvent.commandName);
            failAndEndCall("No handler defined for commandName '" + receiveEvent.commandName + "'.")
          }
        } else {
          console.error("Received event for unknown service: '%s'", viewStreamIn.init.serviceName);
          failAndEndCall("Service '" + viewStreamIn.init.serviceName + "' unknown.");
        }
      } else {
        console.error("Unknown view message received %o", viewStreamIn);
        failAndEndCall("Unknown view message received")
      }
    });

    call.on("end", () => {
      call.end();
    });
  }
};
