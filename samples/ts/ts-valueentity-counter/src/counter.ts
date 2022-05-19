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
import { ValueEntity, Reply } from "@kalix-io/kalix-javascript-sdk";
import { CounterService, api, domain } from "../lib/generated/counter";

const entity: CounterService = new ValueEntity(
  ["counter_domain.proto", "counter_api.proto"],
  "com.example.CounterService",
  "counter",
  {
    includeDirs: ["./proto"]
  }
);
// end::entity-class[]

// tag::lookup-type[]
const CounterState = entity.lookupType("com.example.domain.CounterState");
// end::lookup-type[]

// tag::initial[]
entity.setInitial((entityId: string) => CounterState.create({ value: 0 }));
// end::initial[]

entity.setCommandHandlers({
  Increase: increase,
  Decrease: decrease,
  Reset: reset,
  GetCurrentCounter: getCurrentCounter
});

// tag::increase[]
function increase(
  command: api.IncreaseValue,
  counter: domain.CounterState,
  ctx: CounterService.CommandContext
): Reply<api.IEmpty> {
  if (command.value < 0) {
    return Reply.failure(`Increase requires a positive value. It was [${command.value}].`);
  }
  if (!counter.value) counter.value = 0;
  counter.value += command.value;
  ctx.updateState(counter);
  return Reply.message({});
}
// end::increase[]

function decrease(
  command: api.DecreaseValue,
  counter: domain.CounterState,
  ctx: CounterService.CommandContext
): Reply<api.IEmpty> {
  if (command.value < 0) {
    return Reply.failure(`Decrease requires a positive value. It was [${command.value}].`);
  }
  if (!counter.value) counter.value = 0;
  counter.value -= command.value;
  ctx.updateState(counter);
  return Reply.message({});
}

function reset(
  _command: api.ResetValue,
  counter: domain.CounterState,
  ctx: CounterService.CommandContext
): Reply<api.IEmpty> {
  counter.value = 0;
  ctx.updateState(counter);
  return Reply.message({});
}

// tag::get-current[]
function getCurrentCounter(
  _command: api.GetCounter,
  counter: domain.CounterState
): Reply<api.ICurrentCounter> {
  return Reply.message({ value: counter.value });
}
// end::get-current[]

export default entity;
