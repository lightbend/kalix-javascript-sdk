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

// Types that codegen will generate.

import { Action, CommandReply } from '@kalix-io/kalix-javascript-sdk';
import * as proto from '../generated/proto';

export declare namespace api {
  type In = proto.com.example.In;
  type IOut = proto.com.example.IOut;
  type IAny = proto.google.protobuf.IAny;
}

export declare namespace ExampleActionService {
  type CommandHandlers = {
    DoSomething: (
      command: api.In,
      ctx: Action.UnaryCommandContext<api.IOut>,
    ) => CommandReply<api.IOut> | Promise<CommandReply<api.IOut>>;
    StreamSomething: (
      command: api.In,
      ctx: Action.StreamedOutCommandContext<api.IOut>,
    ) => void;
    Fail: (
      command: api.In,
      ctx: Action.UnaryCommandContext<api.IOut>,
    ) => CommandReply<api.IOut> | Promise<CommandReply<api.IOut>>;
  };
}

export declare namespace ExampleActionWithAclService {
  type CommandHandlers = {
    Public: (
      command: api.In,
      ctx: Action.UnaryCommandContext<api.IOut>,
    ) => CommandReply<api.IOut> | Promise<CommandReply<api.IOut>>;
    OnlyFromOtherService: (
      command: api.In,
      ctx: Action.UnaryCommandContext<api.IOut>,
    ) => CommandReply<api.IOut> | Promise<CommandReply<api.IOut>>;
  };
}

export declare type ExampleActionService =
  Action<ExampleActionService.CommandHandlers>;

export declare type ExampleActionWithAclService =
  Action<ExampleActionWithAclService.CommandHandlers>;
