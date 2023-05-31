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

// tag::delegating-action[]
import { Action } from "@kalix-io/kalix-javascript-sdk";
import { replies } from '@kalix-io/kalix-javascript-sdk';
// end::delegating-action[]
// tag::public-grpc[]
import * as grpc from '@grpc/grpc-js'; // <1>

// end::public-grpc[]
// tag::delegating-action[]

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
    "com/example/counter_api.proto" // <1>
  ],
  "com.example.DelegatingService",
  {
    includeDirs: ["./proto"]
  }
);

// tag::other-component[]
action.commandHandlers = {
  async AddAndReturn(request) {
    // end::delegating-action[]
    // end::other-component[]
    {
      // FIXME not used in docs yet
      // tag::other-component[]
      const counterClient = action.clients.com.example.CounterService.createClient(); // <1>
      // end::other-component[]
    }

    {
    // tag::public-grpc[]
      const counterClient = action.clients.com.example.CounterService.createClient( // <2>
        "still-queen-1447.us-east1.apps.kalix.dev", // <3>
        grpc.credentials.createSsl() // <4>
      );
    // end::public-grpc[]
    }
    // tag::delegating-action[]
    const counterClient = action.clients.com.example.CounterService.createClient( // <2>
      "counter" // <3>
    );
    await counterClient.increase({counterId: request.counterId, value: 1}); // <4>
    const currentCounter = await counterClient.getCurrentCounter({counterId: request.counterId});
    return replies.message({value: currentCounter.value});

  }
};

export default action;
// end::delegating-action[]
