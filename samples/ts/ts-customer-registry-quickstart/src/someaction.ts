/* This code was initialised by Kalix tooling.
 * As long as this file exists it will not be re-generated.
 * You are free to make changes to this file.
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
