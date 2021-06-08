/*
Copyright 2021 Lightbend Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import {
  TypedValueEntity,
  ValueEntityCommandContext
} from "../akkaserverless";
import proto from "./proto";

export type State = proto.com.example.domain.ICounterState;
export type Command =
  | proto.com.example.IIncreaseValue
  | proto.com.example.IDecreaseValue
  | proto.com.example.IResetValue
  | proto.com.example.IGetCounter;

export type CommandHandlers = {
  Increase: (
    command: proto.com.example.IIncreaseValue,
    state: State,
    ctx: ValueEntityCommandContext<State>
  ) => void;
  Decrease: (
    command: proto.com.example.IDecreaseValue,
    state: State,
    ctx: ValueEntityCommandContext<State>
  ) => void;
  Reset: (
    command: proto.com.example.IResetValue,
    state: State,
    ctx: ValueEntityCommandContext<State>
  ) => void;
  GetCurrentCounter: (
    command: proto.com.example.IGetCounter,
    state: State,
    ctx: ValueEntityCommandContext<State>
  ) => proto.com.example.ICurrentCounter;
};

export type CounterService = TypedValueEntity<
  State,
  CommandHandlers
>;
