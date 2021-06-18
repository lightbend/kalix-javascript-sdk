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
const replies = require("@lightbend/akkaserverless-javascript-sdk").replies;

const tckModel = new ValueEntity(
  ["proto/value_entity.proto"],
  "akkaserverless.tck.model.valueentity.ValueEntityTckModel",
  "value-entity-tck-model"
);

const Response = tckModel.lookupType("akkaserverless.tck.model.Response")
const Persisted = tckModel.lookupType("akkaserverless.tck.model.Persisted")

tckModel.initial = entityId => Persisted.create({ value: "" });

tckModel.commandHandlers = {
  Process: process
};

function process(request, state, context) {
  let reply = undefined,
    effects = []
  request.actions.forEach(action => {
    if (action.update) {
      // state update is not emitted immediately, so we also update the function local state directly for responses
      state = Persisted.create({ value: action.update.value })
      context.updateState(state)
    } else if (action.delete) {
      context.deleteState()
      state = {}
    } else if (action.forward) {
      reply = replies.forward(two.service.methods.Call, { id: action.forward.id })
    } else if (action.effect) {
      effects.push(action.effect)
    } else if (action.fail) {
      reply = replies.failure(action.fail.message)
    }
  });
  if (!reply) reply = replies.message(Response.create(state.value ? { message: state.value } : {}))
  effects.forEach(effect =>
    reply.addEffect(two.service.methods.Call, { id: effect.id }, effect.synchronous)
  )

  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(reply), 10);
  });
}

const two = new ValueEntity(
  ["proto/value_entity.proto"],
  "akkaserverless.tck.model.valueentity.ValueEntityTwo",
  "value-entity-tck-model-two"
);

two.initial = entityId => Persisted.create({ value: "" });
two.commandHandlers = {
  Call: request => Response.create({})
};

const configured = new ValueEntity(
  ["proto/value_entity.proto"],
  "akkaserverless.tck.model.valueentity.ValueEntityConfigured",
  "value-entity-configured",
  {
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
