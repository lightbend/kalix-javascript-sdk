/*
 * Copyright 2021-2023 Lightbend Inc.
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

// Types that codegen will generate.

import { ValueEntity, CommandReply } from '@kalix-io/kalix-javascript-sdk';
import * as proto from '../generated/proto';

export declare namespace api {
  type In = proto.com.example.In;
  type IOut = proto.com.example.IOut;
}

export declare namespace domain {
  type ExampleState = proto.com.example.IExampleState &
    protobuf.Message<proto.com.example.IExampleState>;
}

export declare namespace ExampleValueEntityService {
  type State = domain.ExampleState;

  type CommandContext = ValueEntity.CommandContext<State>;

  type CommandHandlers = {
    DoSomethingOne: (
      command: api.In,
      state: State,
      ctx: CommandContext,
    ) => CommandReply<api.IOut> | Promise<CommandReply<api.IOut>>;
    DoSomethingTwo: (
      command: api.In,
      state: State,
      ctx: CommandContext,
    ) => CommandReply<api.IOut> | Promise<CommandReply<api.IOut>>;
    Fail: (
      command: api.In,
      state: State,
      ctx: CommandContext,
    ) => CommandReply<api.IOut> | Promise<CommandReply<api.IOut>>;
  };
}

export declare type ExampleValueEntityService = ValueEntity<
  ExampleValueEntityService.State,
  ExampleValueEntityService.CommandHandlers
>;
