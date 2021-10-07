/* This code is managed by Akka Serverless tooling.
 * It will be re-generated to reflect any changes to your protobuf definitions.
 * DO NOT EDIT
 */

import {
  TypedAction,
  ActionCommandContext,
  StreamedInCommandContext,
  StreamedOutCommandContext
} from "../akkaserverless";
import proto from "./proto";

export type CommandHandlers = {
  AddAndReturn: (
    request: proto.com.example.IRequest,
    ctx: ActionCommandContext
  ) => proto.com.example.IResult | Promise<proto.com.example.IResult> | void | Promise<void>;
};

export type DelegatingService = TypedAction<CommandHandlers>;
