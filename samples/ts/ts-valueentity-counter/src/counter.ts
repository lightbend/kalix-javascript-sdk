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
import { ValueEntity, replies } from "@lightbend/akkaserverless-javascript-sdk";
import * as proto from "../lib/generated/proto";

type Context            = ValueEntity.ValueEntityCommandContext;

type State              = proto.com.example.domain.CounterState;

type IncreaseValue      = proto.com.example.IncreaseValue;
type DecreaseValue      = proto.com.example.DecreaseValue;
type ResetValue         = proto.com.example.ResetValue;
type GetCounter         = proto.com.example.GetCounter;

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
const entity: ValueEntity = new ValueEntity(
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

const CounterState = entity.lookupType("com.example.domain.CounterState");

entity.setInitial((entityId: string) => CounterState.create({ value: 0 }));

entity.setCommandHandlers({
  Increase: increase,
  Decrease: decrease,
  Reset: reset,
  GetCurrentCounter: getCurrentCounter
});

function increase(command: IncreaseValue, counter: State, ctx: Context): replies.Reply {
  if (command.value < 0) {
    return replies.failure(`Increase requires a positive value. It was [${command.value}].`);
  }
  counter.value += command.value;
  ctx.updateState(counter);
  return replies.message({});
}

function decrease(command: DecreaseValue, counter: State, ctx: Context): replies.Reply {
  if (command.value < 0) {
    return replies.failure(`Decrease requires a positive value. It was [${command.value}].`);
  }
  counter.value -= command.value;
  ctx.updateState(counter);
  return replies.message({});
}

function reset(command: ResetValue, counter: State, ctx: Context): replies.Reply {
  counter.value = 0;
  ctx.updateState(counter);
  return replies.message({});
}

function getCurrentCounter(command: GetCounter, counter: State): replies.Reply {
  return replies.message({value: counter.value});
}

export default entity;