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

/* This code was initialised by Akka Serverless tooling.
 * As long as this file exists it will not be re-generated.
 * You are free to make changes to this file.
 */

// tag::delegating-action[]
import { Action } from "@lightbend/akkaserverless-javascript-sdk";
import { replies } from '@lightbend/akkaserverless-javascript-sdk';
import * as grpc from '@grpc/grpc-js'; // <1>
import { GrpcUtil } from '@lightbend/akkaserverless-javascript-sdk'; // <2>

/**
 * Type definitions.
 * These types have been generated based on your proto source.
 * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
 * 
 * DelegatingService; a strongly typed extension of Action derived from your proto source
 * @typedef { import("../lib/generated/delegatingservice").DelegatingService } DelegatingService
 */

/**
 * @type DelegatingService
 */
const action = new Action(
  [
    "com/example/delegating_service.proto",
    "com/example/counter_api.proto" // <3>
  ],
  "com.example.DelegatingService",
  {
    includeDirs: ["./proto"],
    serializeFallbackToJson: true
  }
);

const counterClient = GrpcUtil.promisifyClient(new action.grpc.com.example.CounterService( // <4>
  "counter:80", // <5>
  grpc.credentials.createInsecure())); // <6>

// end::delegating-action[]
function showExternal() {
  // tag::public-grpc[]
  const counterClient = GrpcUtil.promisifyClient(new action.grpc.com.example.CounterService(
    "still-queen-1447.us-east1.apps.akkaserverless.dev",
    grpc.credentials.createSsl());
  // end::public-grpc[]
}
// tag::delegating-action[]


action.commandHandlers = {
  async AddAndReturn(request, ctx) {
    await counterClient.increase({counterId: request.counterId, value: 1}); // <7>
    const currentCounter = await counterClient.getCurrentCounter({counterId: request.counterId });
    return replies.message({value: currentCounter.value });
  }
};

export default action;
// end::delegating-action[]