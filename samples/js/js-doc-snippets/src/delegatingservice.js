/* This code was initialised by Akka Serverless tooling.
 * As long as this file exists it will not be re-generated.
 * You are free to make changes to this file.
 */

// tag::delegating-action[]
import { Action } from "@lightbend/akkaserverless-javascript-sdk";
import { replies } from '@lightbend/akkaserverless-javascript-sdk';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ProtoGrpcType } from "../lib/generated/proto";

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
    "actions/delegating_service.proto",
    "counter_api.proto"
  ],
  "com.example.DelegatingService",
  {
    includeDirs: ["./proto"],
    serializeFallbackToJson: true
  }
);

// FIXME provide more of this infra out of the box
const packageDefinition = protoLoader.load("../proto/counter_api.proto");
const proto = grpc.loadPackageDefinition(packageDefinition);
const counterClient = new proto.com.example.CounterService("counter:80", grpc.credentials.createInsecure());

// FIXME sample waited for client to be ready?

action.commandHandlers = {
  async AddAndReturn(request, ctx) {
    const empty = await counterClient.increase({counter_id: request.counter_id, value: 1});
    const currentCounter = await counterClient.getCurrentCounter({counter_id: request.counter_id});
    return replies.message({ value: currentCounter.value });
  }
};

export default action;
// end::delegating-action[]