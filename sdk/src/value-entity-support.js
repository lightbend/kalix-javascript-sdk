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

const debug = require('debug')('kalix-value-entity');
// Bind to stdout
debug.log = console.log.bind(console);
const AnySupport = require('./protobuf-any');
const CommandHelper = require('./command-helper');

/**
 * @private
 */
class ValueEntitySupport {
  constructor(root, service, commandHandlers, initial, options, allComponents) {
    this.root = root;
    this.service = service;
    this.commandHandlers = commandHandlers;
    this.initial = initial;
    this.options = options;
    this.anySupport = new AnySupport(this.root);
    this.allComponents = allComponents;
  }

  serialize(obj, requireJsonType) {
    return AnySupport.serialize(
      obj,
      this.options.serializeAllowPrimitives,
      this.options.serializeFallbackToJson,
      requireJsonType,
    );
  }

  deserialize(any) {
    return this.anySupport.deserialize(any);
  }

  /**
   * @param call
   * @param init
   * @returns {ValueEntityHandler}
   * @private
   */
  create(call, init) {
    return new ValueEntityHandler(this, call, init.entityId, init.state);
  }
}

/**
 * Handler for a single event sourced entity.
 * @private
 */
class ValueEntityHandler {
  /**
   * @param {ValueEntitySupport} support
   * @param call
   * @param entityId
   * @param initialState
   * @private
   */
  constructor(support, call, entityId, initialState) {
    this.entity = support;
    this.call = call;
    this.entityId = entityId;

    // The current entity state, serialized
    if (!initialState || Object.keys(initialState).length === 0) {
      this.anyState = null;
    } else {
      this.anyState = initialState.value; // already serialized
    }

    this.streamId = Math.random().toString(16).substr(2, 7);

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

  streamDebug(msg, ...args) {
    debug('%s [%s] - ' + msg, ...[this.streamId, this.entityId].concat(args));
  }

  commandHandlerFactory(commandName) {
    return this.withState((state) => {
      if (this.entity.commandHandlers.hasOwnProperty(commandName)) {
        return async (command, ctx) => {
          let updatedAnyState = null,
            deleted = false;

          /**
           * Context for an value entity command.
           *
           * @interface module:kalix.ValueEntity.ValueEntityCommandContext
           * @extends module:kalix.CommandContext
           * @extends module:kalix.EntityContext
           */

          /**
           * Persist the updated state.
           *
           * The state won't be persisted until the reply is sent to the proxy. Then, the state will be persisted
           * before the reply is sent back to the client.
           *
           * @function module:kalix.ValueEntity.ValueEntityCommandContext#updateState
           * @param {module:kalix.Serializable} newState The state to store.
           */
          ctx.context.updateState = (newState) => {
            ctx.ensureActive();
            if (newState === null)
              throw new Error("Entity state cannot be set to 'null'");
            if (deleted) deleted = false; // update after delete cancels delete
            updatedAnyState = this.entity.serialize(newState, true);
          };

          /**
           * Delete this entity.
           *
           * @function module:kalix.ValueEntity.ValueEntityCommandContext#deleteState
           */
          ctx.context.deleteState = () => {
            ctx.ensureActive();
            deleted = true;
          };

          const userReply = await this.entity.commandHandlers[commandName](
            command,
            state,
            ctx.context,
          );

          if (deleted) {
            ctx.reply.stateAction = { delete: {} };
            this.anyState = null;
            ctx.commandDebug("Deleting state '%s'", this.entityId);
          } else if (updatedAnyState !== null) {
            ctx.reply.stateAction = {
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

  onData(valueEntityStreamIn) {
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

  updateState(stateObj) {
    const serialized = this.entity.serialize(stateObj, false);
    this.anyState = serialized;
  }

  withState(callback) {
    if (this.anyState === null) {
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

module.exports = class ValueEntityServices {
  constructor() {
    this.services = {};
  }

  addService(entity, allComponents) {
    this.services[entity.serviceName] = new ValueEntitySupport(
      entity.root,
      entity.service,
      entity.commandHandlers,
      entity.initial,
      entity.options,
      allComponents,
    );
  }

  componentType() {
    return 'kalix.component.valueentity.ValueEntities';
  }

  register(server) {
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

    const entityService =
      grpcDescriptor.kalix.component.valueentity.ValueEntities.service;

    server.addService(entityService, {
      handle: this.handle.bind(this),
    });
  }

  handle(call) {
    let service;

    call.on('data', (valueEntityStreamIn) => {
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
        } else if (valueEntityStreamIn.init.serviceName in this.services) {
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
};
