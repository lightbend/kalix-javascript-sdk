/* This code was initialised by Akka Serverless tooling.
 * As long as this file exists it will not be re-generated.
 * You are free to make changes to this file.
 */

// tag::delegating-action[]
import { Action } from "@lightbend/akkaserverless-javascript-sdk";
import { replies } from '@lightbend/akkaserverless-javascript-sdk';
import * as grpc from '@grpc/grpc-js'; // <1>

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
    "com/example/counter_api.proto" // <2>
  ],
  "com.example.DelegatingService",
  {
    includeDirs: ["./proto"],
    serializeFallbackToJson: true
  }
);

const counterClient = new action.grpc.com.example.CounterService(
  "counter:80", // <3>
  grpc.credentials.createInsecure()); // <4>

// end::delegating-action[]
function showExternal() {
  // tag::public-grpc[]
  const counterClient = new action.grpc.com.example.CounterService(
    "public-host-name.akkaserverless.com",
    grpc.credentials.createSsl());
  // end::public-grpc[]
}
// tag::delegating-action[]


action.commandHandlers = {
  // FIXME grpc-js api-docs says there is async rpc unary method calls
  // but actually calling without callback fails on param validation in grpc-js
  // so for now we do this promise dance ourselves
  async AddAndReturn(request, ctx) {
    const increaseDone = await new Promise((resolve, reject) => {
      counterClient.increase({counterId: request.counterId, value: 1}, // <5>
        (error, emptyResult) => {
          if (error) reject(error);
          else resolve(emptyResult);
        });
    });

    const currentCounter = await new Promise((resolve, reject) => {
      counterClient.getCurrentCounter({counterId: request.counterId },
        (error, emptyResult) => {
          if (error) reject(error);
          else resolve(emptyResult);
        });
    });

    return replies.message({value: currentCounter.value });
  }
};

export default action;
// end::delegating-action[]