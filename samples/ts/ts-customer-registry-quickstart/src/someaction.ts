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

import {Action, GrpcClientCreator, GrpcClientLookup, PreStartSettings, Reply } from "@kalix-io/kalix-javascript-sdk";
import { SomeAction } from "../lib/generated/someaction";
import {CustomerService} from "../lib/generated/customer";

const action: SomeAction = new Action(
  [
    "customer_api.proto",
    "kalix_policy.proto",
    "customer_domain.proto",
    "some_action.proto"
  ],
  "customer.api.SomeAction",
  {
    includeDirs: ["./proto"]
  }
);

const originalPreStart = action.preStart.bind(action);
let entityClient: any;
action.preStart = function(settings: PreStartSettings) {
    // very messy from TS, we'll improve in a future Kalix TS SDK version
    originalPreStart(settings);
    const clientFactory = (action.clients!.customer as any).api.CustomerService as GrpcClientCreator;
    entityClient = clientFactory.createClient();
}

action.commandHandlers = {
  async SomeMethod(request, ctx) {
      let entityResponse = await entityClient.create({});
      console.log(entityResponse);
      Reply.message({});
  }
};

export default action;
