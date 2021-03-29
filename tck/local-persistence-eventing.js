/*
 * Copyright 2019 Lightbend Inc.
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

const Action = require("@lightbend/akkaserverless-javascript-sdk").Action;
const EventSourced = require("@lightbend/akkaserverless-javascript-sdk").EventSourced;
const ValueEntity = require("@lightbend/akkaserverless-javascript-sdk").ValueEntity;

const eventSourcedEntityOne = new EventSourced(
  ["proto/local_persistence_eventing.proto"],
  "akkaserverless.tck.model.eventing.EventSourcedEntityOne",
  "eventlogeventing-one"
);

const Empty = eventSourcedEntityOne.lookupType("google.protobuf.Empty").create();

eventSourcedEntityOne.initial = entityId => Empty;

eventSourcedEntityOne.behavior = state => {
  return {
    commandHandlers: {
      EmitEvent: emitEvent
    },
    eventHandlers: {
      EventOne: () => Empty,
      EventTwo: () => Empty
    }
  };
};

function emitEvent(request, state, context) {
  context.emit(request.eventOne ? request.eventOne : request.eventTwo);
  return Empty;
}

const eventSourcedEntityTwo = new EventSourced(
  ["proto/local_persistence_eventing.proto"],
  "akkaserverless.tck.model.eventing.EventSourcedEntityTwo",
  "eventlogeventing-two",
  {
    serializeFallbackToJson: true
  }
);

eventSourcedEntityTwo.initial = entityId => Empty;

eventSourcedEntityTwo.behavior = state => {
  return {
    commandHandlers: {
      EmitJsonEvent: emitJsonEvent
    },
    eventHandlers: {
      JsonMessage: () => Empty
    }
  };
};

function emitJsonEvent(event, state, context) {
  context.emit({
    type: "JsonMessage",
    message: event.message
  });
  return Empty;
}

const valueEntityOne = new ValueEntity(
    ["proto/local_persistence_eventing.proto"],
    "akkaserverless.tck.model.eventing.ValueEntityOne",
    "valuechangeseventing-one"
);

valueEntityOne.initial = entityId => Empty;

valueEntityOne.commandHandlers = {
  UpdateValue: updateValue
};

function updateValue(request, state, context) {
  context.updateState(request.valueOne ? request.valueOne : request.valueTwo);
  return Empty;
}

const valueEntityTwo = new ValueEntity(
    ["proto/local_persistence_eventing.proto"],
    "akkaserverless.tck.model.eventing.ValueEntityTwo",
    "valuechangeseventing-two",
    {
      serializeFallbackToJson: true
    }
);

valueEntityTwo.initial = entityId => Empty;

valueEntityTwo.commandHandlers = {
  UpdateJsonValue: updateJsonValue
};

function updateJsonValue(request, state, context) {
  context.updateState({
    type: "JsonMessage",
    message: request.message
  });
  return Empty;
}

const localPersistenceSubscriber = new Action(
    ["proto/local_persistence_eventing.proto"],
    "akkaserverless.tck.model.eventing.LocalPersistenceSubscriberModel",
);

const Response = localPersistenceSubscriber.lookupType("akkaserverless.tck.model.eventing.Response");

localPersistenceSubscriber.commandHandlers = {
  ProcessEventOne: processEventOne,
  ProcessEventTwo: processEventTwo,
  ProcessAnyEvent: processAnyEvent,
  ProcessValueOne: processValueOne,
  ProcessValueTwo: processValueTwo,
  ProcessAnyValue: processAnyValue,
  Effect: effect
};

function processEventOne(event, context) {
  process(event.step, context);
}

function processEventTwo(event, context) {
  event.step.forEach(step => process(step, context));
}

function processAnyEvent(event, context) {
  return Response.create({ id: context.cloudevent.subject, message: event.message });
}

function processValueOne(value, context) {
  process(value.step, context);
}

function processValueTwo(value, context) {
  value.step.forEach(step => process(step, context));
}

function processAnyValue(value, context) {
  return Response.create({ id: context.cloudevent.subject, message: value.message });
}

function effect(request, context) {
  return Response.create({ id: request.id, message: request.message });
}

function process(step, context) {
  const id = context.cloudevent.subject;
  if (step.reply)
    context.write(Response.create({ id: id, message: step.reply.message }));
  else if (step.forward)
    context.thenForward(localPersistenceSubscriber.service.methods.Effect, { id: id, message: step.forward.message });
}

module.exports.eventSourcedEntityOne = eventSourcedEntityOne;
module.exports.eventSourcedEntityTwo = eventSourcedEntityTwo;
module.exports.valueEntityOne = valueEntityOne;
module.exports.valueEntityTwo = valueEntityTwo;
module.exports.localPersistenceSubscriber = localPersistenceSubscriber;
