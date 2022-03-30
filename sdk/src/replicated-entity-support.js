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
const debug = require('debug')('kalix-replicated-entity');
const util = require('util');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const protoHelper = require('./protobuf-helper');
const AnySupport = require('./protobuf-any');
const replicatedData = require('./replicated-data');
const CommandHelper = require('./command-helper');
const { Metadata } = require('./metadata');

class ReplicatedEntityServices {
  constructor() {
    this.services = {};
    this.includeDirs = [
      path.join(__dirname, '..', 'proto'),
      path.join(__dirname, '..', 'protoc', 'include'),
      path.join(__dirname, '..', '..', 'proto'),
      path.join(__dirname, '..', '..', 'protoc', 'include'),
    ];
  }

  addService(entity, allComponents) {
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

  componentType() {
    return 'kalix.component.replicatedentity.ReplicatedEntities';
  }

  register(server) {
    const packageDefinition = protoLoader.loadSync(
      path.join(
        'kalix',
        'component',
        'replicatedentity',
        'replicated_entity.proto',
      ),
      {
        includeDirs: this.includeDirs,
      },
    );
    const grpcDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const entityService =
      grpcDescriptor.kalix.component.replicatedentity.ReplicatedEntities
        .service;

    server.addService(entityService, {
      handle: this.handle.bind(this),
    });
  }

  handle(call) {
    let service;

    call.on('data', (replicatedEntityStreamIn) => {
      // cycle through the ReplicatedEntityStreamIn type, this will ensure default values are initialised
      replicatedEntityStreamIn =
        protoHelper.moduleRoot.kalix.component.replicatedentity.ReplicatedEntityStreamIn.fromObject(
          replicatedEntityStreamIn,
        );

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
        } else if (replicatedEntityStreamIn.init.serviceName in this.services) {
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

class ReplicatedEntitySupport {
  constructor(root, service, handlers, allComponents) {
    this.root = root;
    this.service = service;
    this.anySupport = new AnySupport(this.root);
    this.commandHandlers = handlers.commandHandlers;
    this.onStateSet = handlers.onStateSet;
    this.defaultValue = handlers.defaultValue;
    this.allComponents = allComponents;
  }

  create(call, init) {
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
class ReplicatedEntityHandler {
  constructor(support, call, entityId) {
    this.entity = support;
    this.call = call;
    this.entityId = entityId;

    this.currentState = null;

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

  commandHandlerFactory(commandName, grpcMethod) {
    if (this.entity.commandHandlers.hasOwnProperty(commandName)) {
      return async (command, ctx) => {
        /**
         * Context for a Replicated Entity command handler.
         *
         * @interface module:kalix.replicatedentity.ReplicatedEntityCommandContext
         * @extends module:kalix.replicatedentity.StateManagementContext
         * @extends module:kalix.CommandContext
         * @extends module:kalix.EntityContext
         */

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

  setStateActionOnReply(ctx) {
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

  addStateManagementToContext(ctx) {
    ctx.deleted = false;
    ctx.noState = this.currentState === null;
    ctx.defaultValue = false;
    if (ctx.noState) {
      this.currentState = this.entity.defaultValue();
      if (this.currentState !== null) {
        this.entity.onStateSet(this.currentState, this.entityId);
        ctx.defaultValue = true;
      }
    }

    /**
     * Context that allows managing a Replicated Entity's state.
     *
     * @interface module:kalix.replicatedentity.StateManagementContext
     */

    /**
     * Delete this Replicated Entity.
     *
     * @function module:kalix.replicatedentity.StateManagementContext#delete
     */
    ctx.context.delete = () => {
      ctx.ensureActive();
      if (this.currentState === null) {
        throw new Error("Can't delete entity that hasn't been created.");
      } else if (ctx.noState) {
        this.currentState = null;
      } else {
        ctx.deleted = true;
      }
    };

    /**
     * The Replicated Data state for a Replicated Entity.
     * It may only be set once, if it's already set, an error will be thrown.
     *
     * @name module:kalix.replicatedentity.StateManagementContext#state
     * @type {module:kalix.replicatedentity.ReplicatedData}
     */
    Object.defineProperty(ctx.context, 'state', {
      get: () => {
        ctx.ensureActive();
        return this.currentState;
      },
      set: (state) => {
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

  streamDebug(msg, ...args) {
    debug('%s [%s] - ' + msg, ...[this.streamId, this.entityId].concat(args));
  }

  handleInitialDelta(delta) {
    this.streamDebug(
      'Handling initial delta for Replicated Data type %s',
      delta.delta,
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

  async onData(replicatedEntityStreamIn) {
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

  async handleReplicatedEntityStreamIn(replicatedEntityStreamIn) {
    if (replicatedEntityStreamIn.delta && this.currentState === null) {
      await this.handleInitialDelta(replicatedEntityStreamIn.delta);
    } else if (replicatedEntityStreamIn.delta) {
      this.streamDebug(
        'Received delta for Replicated Data type %s',
        replicatedEntityStreamIn.delta.delta,
      );
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

module.exports = {
  ReplicatedEntityServices: ReplicatedEntityServices,
  ReplicatedEntitySupport: ReplicatedEntitySupport,
  ReplicatedEntityHandler: ReplicatedEntityHandler,
};
