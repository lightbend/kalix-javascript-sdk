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

const ValueEntity = require("@lightbend/akkaserverless-javascript-sdk").ValueEntity;

const tckModel = new ValueEntity(
  ["proto/value_entity.proto"],
  "akkaserverless.tck.model.valueentity.ValueEntityTckModel",
  {
    entityType: "value-entity-tck-model"
  }
);

const Response = tckModel.lookupType("akkaserverless.tck.model.Response")
const Persisted = tckModel.lookupType("akkaserverless.tck.model.Persisted")

tckModel.initial = entityId => Persisted.create({ value: "" });

tckModel.commandHandlers = {
  Process: process
};

function process(request, state, context) {
  var forwarding = false;
  request.actions.forEach(action => {
    if (action.update) {
      // FIXME: state update is not emitted immediately, so we also update the function local state directly for responses
      state = Persisted.create({ value: action.update.value });
      context.updateState(state);
    } else if (action.delete) {
      context.deleteState();
      state = {};
    } else if (action.forward) {
      forwarding = true;
      context.thenForward(two.service.methods.Call, { id: action.forward.id });
    } else if (action.effect) {
      context.effect(two.service.methods.Call, { id: action.effect.id }, action.effect.synchronous);
    } else if (action.fail) {
      context.fail(action.fail.message);
    }
  });
  if (forwarding) return {}
  else return Response.create(state.value ? { message: state.value } : {});
}

const two = new ValueEntity(
  ["proto/value_entity.proto"],
  "akkaserverless.tck.model.valueentity.ValueEntityTwo",
  {
    entityType: "value-entity-tck-model-two"
  }
);

two.initial = entityId => Persisted.create({ value: "" });
two.commandHandlers = {
  Call: request => Response.create({})
};

const configured = new ValueEntity(
  ["proto/value_entity.proto"],
  "akkaserverless.tck.model.valueentity.ValueEntityConfigured",
  {
    entityType: "value-entity-configured",
    entityPassivationStrategy: {
      timeout: 100 // milliseconds
    }
  }
);

configured.initial = entityId => Persisted.create({ value: "" });
configured.commandHandlers = {
  Call: request => Response.create({})
}

module.exports.tckModel = tckModel;
module.exports.two = two;
module.exports.configured = configured;
