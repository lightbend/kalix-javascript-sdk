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

const should = require('chai').should();
import protobuf from 'protobufjs';
import path from 'path';
import Long from 'long';
import * as grpc from '@grpc/grpc-js';
import * as replicatedData from '../src/replicated-data';
import AnySupport from '../src/protobuf-any';
import { ReplicatedEntity } from '../src/replicated-entity';
import {
  ReplicatedEntityHandler,
  ReplicatedEntitySupport,
} from '../src/replicated-entity-support';
import * as proto from '../proto/protobuf-bundle';

const root = new protobuf.Root();
root.loadSync(path.join(__dirname, 'example.proto'));
root.resolveAll();
const anySupport = new AnySupport(root);

const In = root.lookupType('com.example.In');
const ExampleService = root.lookupService('com.example.ExampleService');

namespace protocol {
  export type StreamIn =
    proto.kalix.component.replicatedentity.IReplicatedEntityStreamIn;

  export const StreamIn =
    proto.kalix.component.replicatedentity.ReplicatedEntityStreamIn;

  export const Init =
    proto.kalix.component.replicatedentity.ReplicatedEntityInit;

  export type StreamOut =
    proto.kalix.component.replicatedentity.IReplicatedEntityStreamOut;

  export const StreamOut =
    proto.kalix.component.replicatedentity.ReplicatedEntityStreamOut;

  export type Reply =
    proto.kalix.component.replicatedentity.IReplicatedEntityReply;

  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;

  export type Failure = proto.kalix.component.IFailure;

  export type Call = grpc.ServerDuplexStream<StreamIn, StreamOut>;
}

const outMsg = {
  field: 'ok',
};
const inMsg = {
  field: 'ok',
};

class MockCall {
  private written: protocol.StreamOut[] = [];

  write(msg: protocol.StreamOut): void {
    this.written.push(
      protocol.StreamOut.decode(protocol.StreamOut.encode(msg).finish()),
    );
  }

  end(): void {}

  get(): protocol.StreamOut | undefined {
    if (this.written.length === 0) {
      throw new Error('No messages in call written buffer!');
    } else {
      return this.written.shift();
    }
  }

  expectNoWrites() {
    this.written.should.be.empty;
  }
}

interface Handlers {
  commandHandlers?: ReplicatedEntity.CommandHandlers;
  onStateSet?: ReplicatedEntity.OnStateSetCallback;
  defaultValue?: ReplicatedEntity.DefaultValueCallback;
}

const call = new MockCall();

function createHandler(
  commandHandler: ReplicatedEntity.CommandHandler,
  delta: protocol.Delta | undefined = undefined,
  otherHandlers: Handlers = {},
): ReplicatedEntityHandler {
  otherHandlers.commandHandlers = {
    DoSomething: commandHandler,
  };
  return create(otherHandlers, delta);
}

function create(
  handlers: Handlers = {},
  delta: protocol.Delta | undefined = undefined,
): ReplicatedEntityHandler {
  const entity = new ReplicatedEntitySupport(
    root,
    ExampleService,
    {
      ...{
        commandHandlers: {
          DoSomething: () => outMsg,
          StreamSomething: () => outMsg,
        },
        onStateSet: () => undefined,
        defaultValue: () => null,
      },
      ...handlers,
    },
    {},
  );
  return entity.create(
    call as unknown as protocol.Call,
    protocol.Init.decode(
      protocol.Init.encode({
        entityId: 'foo',
        delta: delta,
      }).finish(),
    ),
  );
}

// This ensures we have the field names right, rather than just matching them between
// the tests and the code.
function roundTripReplicatedEntityStreamIn(
  msg: protocol.StreamIn,
): protocol.StreamIn {
  return protocol.StreamIn.decode(protocol.StreamIn.encode(msg).finish());
}

async function handleCommand(
  handler: ReplicatedEntityHandler,
  command: any,
  name = 'DoSomething',
  id = 10,
): Promise<protocol.Reply | null | undefined> {
  const response = await doHandleCommand(handler, command, name, id);
  if (response?.failure !== null) {
    throw new Error(response?.failure?.description ?? '');
  }
  const reply = response.reply;
  reply?.commandId?.should.eql(Long.fromNumber(id));
  return reply;
}

async function doHandleCommand(
  handler: ReplicatedEntityHandler,
  command: any,
  name = 'DoSomething',
  id = 10,
): Promise<protocol.StreamOut | undefined> {
  await send(handler, {
    command: {
      entityId: 'foo',
      id: id,
      name: name,
      payload: AnySupport.serialize(In.create(command), false, false),
    },
  });
  return call.get();
}

async function handleFailedCommand(
  handler: ReplicatedEntityHandler,
  command: any,
  name = 'DoSomething',
  id = 10,
) {
  const response = await doHandleCommand(handler, command, name, id);
  response?.reply?.should.be.null;
  response?.failure?.should.not.be.null;
  return response?.failure;
}

async function send(
  handler: ReplicatedEntityHandler,
  streamIn: protocol.StreamIn,
): Promise<void> {
  await Promise.resolve(
    handler.onData(roundTripReplicatedEntityStreamIn(streamIn)),
  );
}

function assertHasNoAction(reply?: protocol.Reply | null) {
  if (reply?.stateAction !== null) {
    should.equal(reply?.stateAction?.update, null);
    should.equal(reply?.stateAction?.delete, null);
  }
}

function toNumber(n?: Long | number | null): number {
  return Long.isLong(n) ? n.toNumber() : n ?? 0;
}

describe('ReplicatedEntityHandler', () => {
  it('should start with no state', async () => {
    const handler = createHandler((_cmd, ctx) => {
      should.equal(ctx.state, null);
      return outMsg;
    });

    const reply = await handleCommand(handler, inMsg);
    assertHasNoAction(reply);
    anySupport
      .deserialize(reply?.clientAction?.reply?.payload)
      .field.should.equal(outMsg.field);
  });

  it('should populate state with the initial delta from init if present', async () => {
    const handler = createHandler(
      (_cmd, ctx) => {
        (ctx.state as replicatedData.ReplicatedCounter).value.should.equal(5);
        return outMsg;
      },
      {
        counter: {
          change: 5,
        },
      },
    );

    assertHasNoAction(await handleCommand(handler, inMsg));
  });

  it('should create state when a new state is set', async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.state = new replicatedData.ReplicatedCounter();
      return outMsg;
    });

    const reply = await handleCommand(handler, inMsg);
    assertHasNoAction(reply);
    anySupport
      .deserialize(reply?.clientAction?.reply?.payload)
      .field.should.equal(outMsg.field);
  });

  it('should send an update when the state is updated', async () => {
    const handler = createHandler(
      (cmd, ctx) => {
        (ctx.state as replicatedData.ReplicatedCounter).increment(3);
        return outMsg;
      },
      {
        counter: {
          change: 5,
        },
      },
    );
    const reply = await handleCommand(handler, inMsg);
    toNumber(reply?.stateAction?.update?.counter?.change).should.equal(3);
  });

  it('should set the state when it receives an initial delta', async () => {
    const handler = createHandler((cmd, ctx) => {
      (ctx.state as replicatedData.ReplicatedCounter).value.should.equal(5);
      return outMsg;
    });
    send(handler, {
      delta: {
        counter: {
          change: 5,
        },
      },
    });
    assertHasNoAction(await handleCommand(handler, inMsg));
  });

  it('should update the state when it receives a delta message', async () => {
    const handler = createHandler(
      (cmd, ctx) => {
        (ctx.state as replicatedData.ReplicatedCounter).value.should.equal(7);
        return outMsg;
      },
      {
        counter: {
          change: 2,
        },
      },
    );
    send(handler, {
      delta: {
        counter: {
          change: 5,
        },
      },
    });
    assertHasNoAction(await handleCommand(handler, inMsg));
  });

  it('should allow deleting an entity', async () => {
    const handler = createHandler(
      (cmd, ctx) => {
        ctx.delete();
        return outMsg;
      },
      {
        counter: {
          change: 2,
        },
      },
    );
    const reply = await handleCommand(handler, inMsg);
    reply?.stateAction?.delete?.should.not.be.null;
  });

  it("should not allow deleting an entity that hasn't been created", async () => {
    const handler = createHandler((cmd, ctx) => {
      ctx.delete();
      return outMsg;
    });
    await handleFailedCommand(handler, inMsg);
  });
});
