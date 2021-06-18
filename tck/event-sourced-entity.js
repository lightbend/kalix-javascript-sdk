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

const EventSourcedEntity = require("@lightbend/akkaserverless-javascript-sdk").EventSourcedEntity;
const replies = require("@lightbend/akkaserverless-javascript-sdk").replies;

const tckModel = new EventSourcedEntity(
  ["proto/event_sourced_entity.proto"],
  "akkaserverless.tck.model.eventsourcedentity.EventSourcedTckModel",
  "event-sourced-tck-model",
  {
    snapshotEvery: 5
  }
);

const Response = tckModel.lookupType("akkaserverless.tck.model.eventsourcedentity.Response")
const Persisted = tckModel.lookupType("akkaserverless.tck.model.eventsourcedentity.Persisted")

tckModel.initial = entityId => Persisted.create({ value: "" });

tckModel.behavior = state => {
  return {
    commandHandlers: {
      Process: process
    },
    eventHandlers: {
      Persisted: persisted
    }
  };
};

function process(request, state, context) {
  let reply = null,
    effects = []
  request.actions.forEach(action => {
    if (action.emit) {
      const event = Persisted.create({ value: action.emit.value })
      context.emit(event);
      // events are not emitted immediately, so we also update the function local state directly for responses
      state = persisted(event, state);
    } else if (action.forward) {
      reply = replies.forward(two.service.methods.Call, { id: action.forward.id })
    } else if (action.effect) {
      effects.push(action.effect)
    } else if (action.fail) {
      reply = replies.failure(action.fail.message)
    }
  })
  // if we don't already have a reply from the actions
  if (!reply) reply = replies.message(Response.create((state.value ? { message: state.value } : {})))
  if (effects)
    effects.forEach(effect =>
      reply.addEffect(two.service.methods.Call, { id: effect.id }, effect.synchronous)
    )

  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(reply), 10);
  });
}

function persisted(event, state) {
  state.value += event.value;
  return state;
}

const two = new EventSourcedEntity(
  ["proto/event_sourced_entity.proto"],
  "akkaserverless.tck.model.eventsourcedentity.EventSourcedTwo",
  "event-sourced-tck-model-2"
);

two.initial = entityId => Persisted.create({ value: "" });

two.behavior = state => {
  return {
    commandHandlers: {
      Call: request => replies.message(Response.create())
    }
  };
};

const configured = new EventSourcedEntity(
  ["proto/event_sourced_entity.proto"],
  "akkaserverless.tck.model.eventsourcedentity.EventSourcedConfigured",
  "event-sourced-configured",
  {
    entityPassivationStrategy: {
      timeout: 100 // milliseconds
    }
  }
);

configured.initial = entityId => Persisted.create({ value: "" });

configured.behavior = state => {
  return {
    commandHandlers: {
      Call: request => replies.message(Response.create())
    }
  };
};

module.exports.tckModel = tckModel;
module.exports.two = two;
module.exports.configured = configured;
