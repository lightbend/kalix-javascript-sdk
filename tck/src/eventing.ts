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

import {
  Action,
  EventSourcedEntity,
  ValueEntity,
} from '@kalix-io/kalix-javascript-sdk';
import protocol from '../generated/tck';

type EmitEventRequest = protocol.kalix.tck.model.eventing.EmitEventRequest;
type JsonEvent = protocol.kalix.tck.model.eventing.JsonEvent;
type UpdateValueRequest = protocol.kalix.tck.model.eventing.UpdateValueRequest;
type JsonValue = protocol.kalix.tck.model.eventing.JsonValue;
type EventOne = protocol.kalix.tck.model.eventing.EventOne;
type EventTwo = protocol.kalix.tck.model.eventing.EventTwo;
type ValueOne = protocol.kalix.tck.model.eventing.ValueOne;
type ValueTwo = protocol.kalix.tck.model.eventing.ValueTwo;
type EffectRequest = protocol.kalix.tck.model.eventing.EffectRequest;
type IProcessStep = protocol.kalix.tck.model.eventing.IProcessStep;

const { Response } = protocol.kalix.tck.model.eventing;

export const eventSourcedEntityOne = new EventSourcedEntity(
  ['proto/local_persistence_eventing.proto'],
  'kalix.tck.model.eventing.EventSourcedEntityOne',
  'eventlogeventing-one',
);

const Empty = eventSourcedEntityOne
  .lookupType('google.protobuf.Empty')
  .create();

eventSourcedEntityOne.initial = () => Empty;

eventSourcedEntityOne.behavior = () => ({
  commandHandlers: {
    EmitEvent: emitEvent,
  },
  eventHandlers: {
    EventOne: () => Empty,
    EventTwo: () => Empty,
  },
});

function emitEvent(
  request: EmitEventRequest,
  _state: any,
  context: EventSourcedEntity.EventSourcedEntityCommandContext,
) {
  context.emit(request.eventOne ? request.eventOne : request.eventTwo ?? {});
  return Empty;
}

export const eventSourcedEntityTwo = new EventSourcedEntity(
  ['proto/local_persistence_eventing.proto'],
  'kalix.tck.model.eventing.EventSourcedEntityTwo',
  'eventlogeventing-two',
  {
    serializeFallbackToJson: true,
  },
);

eventSourcedEntityTwo.initial = () => Empty;

eventSourcedEntityTwo.behavior = () => ({
  commandHandlers: {
    EmitJsonEvent: emitJsonEvent,
  },
  eventHandlers: {
    JsonMessage: () => Empty,
  },
});

function emitJsonEvent(
  event: JsonEvent,
  _state: any,
  context: EventSourcedEntity.EventSourcedEntityCommandContext,
) {
  context.emit({
    type: 'JsonMessage',
    message: event.message,
  });
  return Empty;
}

export const valueEntityOne = new ValueEntity(
  ['proto/local_persistence_eventing.proto'],
  'kalix.tck.model.eventing.ValueEntityOne',
  'valuechangeseventing-one',
);

valueEntityOne.initial = () => Empty;

valueEntityOne.commandHandlers = {
  UpdateValue: updateValue,
};

function updateValue(
  request: UpdateValueRequest,
  _state: any,
  context: ValueEntity.ValueEntityCommandContext,
) {
  context.updateState(
    request.valueOne ? request.valueOne : request.valueTwo ?? {},
  );
  return Empty;
}

export const valueEntityTwo = new ValueEntity(
  ['proto/local_persistence_eventing.proto'],
  'kalix.tck.model.eventing.ValueEntityTwo',
  'valuechangeseventing-two',
  {
    serializeFallbackToJson: true,
  },
);

valueEntityTwo.initial = () => Empty;

valueEntityTwo.commandHandlers = {
  UpdateJsonValue: updateJsonValue,
};

function updateJsonValue(
  request: JsonValue,
  _state: any,
  context: ValueEntity.ValueEntityCommandContext,
) {
  context.updateState({
    type: 'JsonMessage',
    message: request.message,
  });
  return Empty;
}

export const localPersistenceSubscriber = new Action(
  ['proto/local_persistence_eventing.proto'],
  'kalix.tck.model.eventing.LocalPersistenceSubscriberModel',
);

localPersistenceSubscriber.commandHandlers = {
  ProcessEventOne: processEventOne,
  ProcessEventTwo: processEventTwo,
  ProcessAnyEvent: processAnyEvent,
  ProcessValueOne: processValueOne,
  ProcessValueTwo: processValueTwo,
  ProcessAnyValue: processAnyValue,
  Effect: effect,
};

function processEventOne(
  event: EventOne,
  context: Action.ActionCommandContext,
) {
  process(event.step, context);
}

function processEventTwo(
  event: EventTwo,
  context: Action.ActionCommandContext,
) {
  event.step.forEach((step) => process(step, context));
}

function processAnyEvent(event: any, context: Action.ActionCommandContext) {
  return Response.create({
    id: context.metadata.getSubject()?.toString(),
    message: event.message,
  });
}

function processValueOne(
  value: ValueOne,
  context: Action.ActionCommandContext,
) {
  process(value.step, context);
}

function processValueTwo(
  value: ValueTwo,
  context: Action.ActionCommandContext,
) {
  value.step.forEach((step) => process(step, context));
}

function processAnyValue(value: any, context: Action.ActionCommandContext) {
  return Response.create({
    id: context.metadata.getSubject()?.toString(),
    message: value.message,
  });
}

function effect(request: EffectRequest) {
  return Response.create({ id: request.id, message: request.message });
}

function process(
  step: IProcessStep | null | undefined,
  context: Action.ActionCommandContext,
) {
  if (step) {
    const id = context.metadata.getSubject()?.toString();
    if (step.reply)
      context.write(Response.create({ id: id, message: step.reply.message }));
    else if (step.forward)
      context.forward(localPersistenceSubscriber.service.methods.Effect, {
        id: id,
        message: step.forward.message,
      });
  }
}
