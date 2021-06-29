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

const Action = require("@lightbend/akkaserverless-javascript-sdk").Action
const { replies } = require("@lightbend/akkaserverless-javascript-sdk");

const tckModel = new Action(
  "proto/action.proto",
  "akkaserverless.tck.model.action.ActionTckModel"
);

const Response = tckModel.lookupType("akkaserverless.tck.model.action.Response");

tckModel.commandHandlers = {
  ProcessUnary: processUnary,
  ProcessStreamedIn: processStreamedIn,
  ProcessStreamedOut: processStreamedOut,
  ProcessStreamed: processStreamed
};

function processUnary(request, context) {
  return createReplyForGroup(request.groups[0]);
}

/**
 * @param {module:akkaserverless.Action.StreamedInContext} context
 */
function processStreamedIn(context) {
  let reply = replies.noReply()
  context.on("data", request => {
    const replyForThisRequest = createReplyForGroup(request.groups[0])
    if (!replyForThisRequest.isEmpty()) {
      // keep the last type of reply but pass along the effects
      if (reply.effects) replyForThisRequest.addEffects(reply.effects)
      reply = replyForThisRequest
    } else if (replyForThisRequest.effects) {
      // pass along the effects from empty reply, but keep the previous non-empty reply
      reply.addEffects(replyForThisRequest.effects)
    }
  })
  // last callback return value is sent back for stream in, if it is a Reply
  context.on("end", () => reply)
}

/**
 * @param {object} request
 * @param {module:akkaserverless.Action.StreamedOutContext} context
 */
function processStreamedOut(request, context) {
  createReplies(request).forEach(reply => {
    // imperative send of Reply (since we could have 1:* for the incoming, and they can happen async?)
    context.reply(reply)
  });
  context.end()
}

/**
 * @param {module:akkaserverless.Action.StreamedCommandContext} context
 */
function processStreamed(context) {
  context.on("data", request => {
    createReplies(request).forEach(reply =>
      // imperative send of Reply (since we could have 1:* for the incoming, and they can happen async?)
      context.reply(reply)
    )
  })
  context.on("end", () => context.end())
}

// Reply API
/**
 * @param request
 * @return {module:akkaserverless.replies.Reply[]} one reply for each request group
 */
function createReplies(request) {
  return request.groups.map(createReplyForGroup)
}

/**
 * Process the steps in one group into a single reply
 * @return {module:akkaserverless.replies.Reply}
 */
function createReplyForGroup(group) {
  let reply = replies.noReply()
  group.steps.forEach(step => {
    if (step.reply) {
      reply = replies.message(Response.create({ message: step.reply.message }))
    } else if (step.forward) {
      reply = replies.forward(two.service.methods.Call, { id: step.forward.id })
    } else if (step.effect) {
      reply.addEffect(two.service.methods.Call, { id: step.effect.id }, step.effect.synchronous)
    } else if (step.fail) {
      reply = replies.failure(step.fail.message)
    }
  })
  return reply
}

const two = new Action(
  "proto/action.proto",
  "akkaserverless.tck.model.action.ActionTwo"
);

two.commandHandlers = {
  Call: request => Response.create()
};

module.exports.tckModel = tckModel;
module.exports.two = two;
