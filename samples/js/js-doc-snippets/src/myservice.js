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

import { Action } from "@lightbend/akkaserverless-javascript-sdk";
import { replies } from '@lightbend/akkaserverless-javascript-sdk';
import * as grpc from '@grpc/grpc-js';

/**
 * Type definitions.
 * These types have been generated based on your proto source.
 * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
 *
 * DelegatingService; a strongly typed extension of Action derived from your proto source
 * @typedef { import("../lib/generated/json/myservice").MyService } MyService
 */

/**
 * @type MyService
 */
const action = new Action(
  [
    "com/example/json/json_api.proto",
  ],
  "com.example.json.MyService",
  {
    includeDirs: ["./proto"]
  }
);

action.commandHandlers = {
  async Consume(request) {
    console.log(request);
    return replies.noReply();
  },
  // tag::produce[]
  async Produce(request) {
    return replies.message({ // <2>
      arbitrary: "json"
    })
  }
  // end::produce[]
};

export default action;

