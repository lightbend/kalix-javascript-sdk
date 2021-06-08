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

const should = require("chai").should();
const protobuf = require("protobufjs");
const path = require("path");
const Long = require("long");
const support = require("../src/replicated-entity-support");
const replicatedData = require("../src/replicated-data");
const AnySupport = require("../src/protobuf-any");
const protobufHelper = require("../src/protobuf-helper");

const root = new protobuf.Root();
root.loadSync(path.join(__dirname, "example.proto"));
root.resolveAll();
const anySupport = new AnySupport(root);

const In = root.lookupType("com.example.In");
const Out = root.lookupType("com.example.Out");
const ExampleService = root.lookupService("com.example.ExampleService");

const ReplicatedEntityStreamIn = protobufHelper.moduleRoot.akkaserverless.component.replicatedentity.ReplicatedEntityStreamIn;
const ReplicatedEntityStreamOut = protobufHelper.moduleRoot.akkaserverless.component.replicatedentity.ReplicatedEntityStreamOut;
const ReplicatedEntityInit = protobufHelper.moduleRoot.akkaserverless.component.replicatedentity.ReplicatedEntityInit;

const outMsg = {
  field: "ok"
};
const inMsg = {
  field: "ok"
};

class MockCall {
  constructor() {
    this.written = [];
    this.ended = false;
  }

  write(msg) {
    this.written.push(ReplicatedEntityStreamOut.decode(ReplicatedEntityStreamOut.encode(msg).finish()));
  }

  end() {
    this.ended = true;
  }

  get() {
    if (this.written.length === 0) {
      throw new Error("No messages in call written buffer!");
    } else {
      return this.written.shift();
    }
  }

  expectNoWrites() {
    this.written.should.be.empty;
  }
}

const call = new MockCall();
function createHandler(commandHandler, delta = undefined, otherHandlers = {}) {
  otherHandlers.commandHandlers = {
    DoSomething: commandHandler
  };
  return create(otherHandlers, delta);
}
function create(handlers = {}, delta = undefined) {
  const entity = new support.ReplicatedEntitySupport(root, ExampleService, {
    ...{
      commandHandlers: {
        DoSomething: () => outMsg,
        StreamSomething: () => outMsg
      },
      onStateSet: () => undefined,
      defaultValue: () => null,
      onStateChange: () => undefined,
      onStreamCancelled: () => undefined
    },
    ...handlers
  }, {});
  return entity.create(call, ReplicatedEntityInit.decode(ReplicatedEntityInit.encode({
    entityId: "foo",
    delta: delta
  }).finish()));
}

// This ensures we have the field names right, rather than just matching them between
// the tests and the code.
function roundTripReplicatedEntityStreamIn(msg) {
  return ReplicatedEntityStreamIn.decode(ReplicatedEntityStreamIn.encode(msg).finish());
}

async function handleCommand(handler, command, name = "DoSomething", id = 10, streamed = false) {
  const response = await doHandleCommand(handler, command, name, id, streamed);
  if (response.failure !== null) {
    throw new Error(response.failure.description)
  }
  const reply = response.reply;
  reply.commandId.should.eql(Long.fromNumber(id));
  return reply;
}

async function doHandleCommand(handler, command, name = "DoSomething", id = 10, streamed = false) {
  await send(handler, {
    command: {
      entityId: "foo",
      id: id,
      name: name,
      payload: AnySupport.serialize(In.create(command)),
      streamed: streamed
    }
  });
  return call.get();
}

async function handleFailedCommand(handler, command, name = "DoSomething", id = 10, streamed = false) {
  const response = await doHandleCommand(handler, command, name, id, streamed);
  if (response.failure !== null) {
    return response.failure;
  } else {
    response.reply.should.be.null;
    response.failure.should.not.be.null;
  }
}

function expectFailure() {
  const response = call.get();
  response.failure.should.not.be.null;
  return response.failure;
}

async function send(handler, streamIn) {
  await Promise.resolve(handler.onData(roundTripReplicatedEntityStreamIn(streamIn)));
}

function assertHasNoAction(reply) {
  if (reply.stateAction !== null) {
    should.equal(reply.stateAction.update, null);
    should.equal(reply.stateAction.delete, null);
  }
}

describe("ReplicatedEntityHandler", () => {

  it("should start with no state", async () => {
    const handler = createHandler((cmd, ctx) => {
      should.equal(ctx.state, null);
      return outMsg;
    });

    const reply = await handleCommand(handler, inMsg);
    assertHasNoAction(reply);
    anySupport.deserialize(reply.clientAction.reply.payload).field.should.equal(outMsg.field);
  });

  it("should populate state with the initial delta from init if present", async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.state.value.should.equal(5);
      return outMsg;
    }, {
      gcounter: {
        increment: 5
      }
    });

    assertHasNoAction(await handleCommand(handler, inMsg));
  });

  it("should create state when a new state is set", async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.state = new replicatedData.GCounter();
      return outMsg;
    });

    const reply = await handleCommand(handler, inMsg);
    assertHasNoAction(reply);
    anySupport.deserialize(reply.clientAction.reply.payload).field.should.equal(outMsg.field);
  });

  it("should send an update when the state is updated", async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.state.increment(3);
      return outMsg;
    }, {
      gcounter: {
        increment: 5
      }
    });
    const reply = await handleCommand(handler, inMsg);
    reply.stateAction.update.gcounter.increment.toNumber().should.equal(3);
  });

  it("should set the state when it receives an initial delta", async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.state.value.should.equal(5);
      return outMsg;
    });
    send(handler, {
      delta: {
        gcounter: {
          increment: 5
        }
      }
    });
    assertHasNoAction(await handleCommand(handler, inMsg));
  });

  it("should update the state when it receives a delta message", async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.state.value.should.equal(7);
      return outMsg;
    }, {
      gcounter: {
        increment: 2
      }
    });
    send(handler, {
      delta: {
        gcounter: {
          increment: 5
        }
      }
    });
    assertHasNoAction(await handleCommand(handler, inMsg));
  });

  it("should allow deleting an entity", async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.delete();
      return outMsg;
    }, {
      gcounter: {
        increment: 2
      }
    });
    const reply = await handleCommand(handler, inMsg);
    reply.stateAction.delete.should.not.be.null;
  });

  it("should not allow deleting an entity that hasn't been created", async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.delete();
      return outMsg;
    });
    await handleFailedCommand(handler, inMsg);
  });

  it("should allow streaming", async () => {
    const handler = create({
      commandHandlers: {
        StreamSomething: (cmd, ctx) => {
          ctx.streamed.should.equal(true);
          ctx.onStateChange = (state, ctx) => {
            ctx.state.value.should.equal(5);
            return {field: "pushed"};
          };
          return outMsg;
        }
      },
    }, {
      gcounter: {
        increment: 2
      }
    });

    const reply = await handleCommand(handler, inMsg, "StreamSomething", 5, true);
    reply.streamed.should.be.true;
    await send(handler, {
      delta: {
        gcounter: {
          increment: 3
        }
      }
    });
    const streamed = call.get().streamedMessage;
    streamed.commandId.toNumber().should.equal(5);
    anySupport.deserialize(streamed.clientAction.reply.payload).field.should.equal("pushed");
  });

  it("should not allow subscribing a non streamed command", async () => {
    const handler = create({
      commandHandlers: {
        StreamSomething: (cmd, ctx) => {
          ctx.streamed.should.equal(false);
          ctx.onStateChange = () => undefined;
          return outMsg;
        }
      }
    });

    await handleFailedCommand(handler, inMsg, "StreamSomething", 5, false);
  });

  it("should not allow not subscribing to a streamed command", async () => {
    const handler = create({
      commandHandlers: {
        StreamSomething: (cmd, ctx) => {
          ctx.streamed.should.equal(true);
          return outMsg;
        }
      }
    });

    const reply = await handleCommand(handler, inMsg, "StreamSomething", 5, true);
    reply.streamed.should.be.false;
  });

  it("should allow closing a stream", async () => {
    let ended = false;

    const handler = create({
      commandHandlers: {
        StreamSomething: (cmd, ctx) => {
          ctx.onStateChange = (state, ctx) => {
            if (!ended) {
              ctx.end();
            } else {
              throw new Error("Invoked!")
            }
          };
          return outMsg;
        }
      },
    }, {
      gcounter: {
        value: 2
      }
    });

    await handleCommand(handler, inMsg, "StreamSomething", 5, true);
    await send(handler, {
      delta: {
        gcounter: {
          increment: 3
        }
      }
    });

    const streamed = call.get().streamedMessage;
    streamed.endStream.should.be.true;
    await send(handler, {
      delta: {
        gcounter: {
          increment: 3
        }
      }
    });
    call.expectNoWrites();
  });

  it("should handle stream cancelled events", async () => {
    const handler = create({
      commandHandlers: {
        StreamSomething: (cmd, ctx) => {
          ctx.onStreamCancel = (state, ctx) => {
            state.value.should.equal(2);
            state.increment(3);
          };
          return outMsg;
        }
      }
    }, {
      gcounter: {
        increment: 2
      }
    });

    await handleCommand(handler, inMsg, "StreamSomething", 5, true);
    await send(handler, {
      streamCancelled: {
        id: 5
      }
    });
    const response = call.get();
    response.streamCancelledResponse.commandId.toNumber().should.equal(5);
    response.streamCancelledResponse.stateAction.update.gcounter.increment.toNumber().should.equal(3);

  });

});
