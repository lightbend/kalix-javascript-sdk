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
// tag::entity-class[]
import akkaserverless from "@lightbend/akkaserverless-javascript-sdk";
const ValueEntity = akkaserverless.ValueEntity;

/**
 * Type definitions.
 * These types have been generated based on your proto source.
 * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
 * 
 * State; the serialisable and persistable state of the entity
 * @typedef { import("../lib/generated/counterservice").State } State
 * 
 * CounterService; a strongly typed extension of ValueEntity derived from your proto source
 * @typedef { import("../lib/generated/counterservice").CounterService } CounterService
 */

/**
 * @type CounterService
 */
const entity = new ValueEntity(
  [
    "counter_domain.proto",
    "counter_api.proto"
  ],
  "com.example.CounterService",
  "counter",
  {
    includeDirs: ["./proto"],
    serializeAllowPrimitives: true,
    serializeFallbackToJson: true
  }
);
// end::entity-class[]

// tag::lookup-type[]
const CounterState = entity.lookupType("com.example.domain.CounterState");
// end::lookup-type[]

// tag::initial[]
entity.setInitial(entityId => (CounterState.create({ value: 0 })));
// end::initial[]

entity.setCommandHandlers({
  Increase: increase,
  Decrease: decrease,
  Reset: reset,
  GetCurrentCounter: getCurrentCounter
});

// tag::increase[]
function increase(command, state, ctx) {
  if (command.value < 0) {
    ctx.fail(`Increase requires a positive value. It was [${command.value}].`);
  }
  state.value += command.value;
  ctx.updateState(state);
  return {};
}
// end::increase[]

function decrease(command, state, ctx) {
  if (command.value < 0) {
    ctx.fail(`Decrease requires a positive value. It was [${command.value}].`);
  }
  state.value -= command.value;
  ctx.updateState(state);
  return {};
}

function reset(command, state, ctx) {
  state.value = 0;
  ctx.updateState(state);
  return {};
}

// tag::get-current[]
function getCurrentCounter(command, state, ctx) {
  return { value: state.value };
}
// end::get-current[]

export default entity;