/*
 * Copyright 2019 Lightbend Inc.
 */

const Action = require("@kalix-io/sdk").Action

const tckModel = new Action(
  "proto/action.proto",
  "kalix.tck.model.action.ActionTckModel"
);

const Response = tckModel.lookupType("kalix.tck.model.action.Response");

tckModel.commandHandlers = {
  ProcessUnary: processUnary,
  ProcessStreamedIn: processStreamedIn,
  ProcessStreamedOut: processStreamedOut,
  ProcessStreamed: processStreamed
};

function processUnary(request, context) {
  respondWith(singleResponse(createResponses(request)), context);
}

function processStreamedIn(context) {
  const responses = [];
  context.on("data", request => responses.push(...createResponses(request)));
  context.on("end", () => respondWith(singleResponse(responses), context));
}

function processStreamedOut(request, context) {
  createResponses(request).forEach(response => respondWith(response, context));
  context.end();
}

function processStreamed(context) {
  context.on("data", request => createResponses(request).forEach(response => respondWith(response, context)));
  context.on("end", () => context.end());
}

function respondWith(response, context) {
  // need to accumulate effects, before replying, forwarding, or failing
  response.effects.forEach(effect => context.effect(two.service.methods.Call, { id: effect.id }, effect.synchronous));
  if (response.fail) context.fail(
      response.fail,
      9, // optional parameter, sets the gRPC status code to 9 - FAILED_PRECONDITION
  );
  else if (response.forward) context.forward(two.service.methods.Call, { id: response.forward });
  else if (response.reply) context.write(Response.create({ message: response.reply }));
  else context.write(); // empty message
}

function createResponses(request) {
  return request.groups.map(createResponse);
}

function createResponse(group) {
  const response = {
    effects: []
  };
  group.steps.forEach(step => {
    if (step.reply) {
      response.reply = step.reply.message;
    } else if (step.forward) {
      response.forward = step.forward.id;
    } else if (step.effect) {
      response.effects.push({ id: step.effect.id, synchronous: step.effect.synchronous });
    } else if (step.fail) {
      response.fail = step.fail.message;
    }
  });
  return response;
}

function singleResponse(responses) {
  return responses.reduce((response, next) => ({
    reply: next.reply || response.reply,
    forward: next.forward || response.forward,
    fail: next.fail || response.fail,
    effects: response.effects.concat(next.effects)
  }), { effects: [] });
}

const two = new Action(
  "proto/action.proto",
  "kalix.tck.model.action.ActionTwo"
);

two.commandHandlers = {
  Call: request => Response.create()
};
