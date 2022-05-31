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
import * as protobuf from 'protobufjs';
import * as path from 'path';
import * as Long from 'long';
import * as replicatedData from '../src/replicated-data';
import AnySupport, { Any } from '../src/protobuf-any';
import { ReplicatedEntity } from '../src/replicated-entity';
import {
  ReplicatedEntityHandler,
  ReplicatedEntityServices,
  ReplicatedEntitySupport,
} from '../src/replicated-entity-support';
import * as protocol from '../types/protocol/replicated-entities';

const root = new protobuf.Root();
root.loadSync(path.join(__dirname, 'example.proto'));
root.resolveAll();
const anySupport = new AnySupport(root);

const In = root.lookupType('com.example.In');
const ExampleService = root.lookupService('com.example.ExampleService');

const outMsg = {
  field: 'ok',
};
const inMsg = {
  field: 'ok',
};

const service = ReplicatedEntityServices.loadProtocol();

function roundTripStreamIn(streamIn: protocol.StreamIn): protocol.StreamIn {
  return service.Handle.requestDeserialize(
    service.Handle.requestSerialize(streamIn),
  );
}

function roundTripInit(init: protocol.Init): protocol.Init {
  return (
    service.Handle.requestDeserialize(
      service.Handle.requestSerialize({ init: init }),
    ).init ?? { serviceName: '', entityId: '', delta: {} }
  );
}

function roundTripStreamOut(streamOut: protocol.StreamOut): protocol.StreamOut {
  return service.Handle.responseDeserialize(
    service.Handle.responseSerialize(streamOut),
  );
}

class MockCall {
  private written: protocol.StreamOut[] = [];

  write(msg: protocol.StreamOut): void {
    this.written.push(roundTripStreamOut(msg));
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
  delta: protocol.DeltaIn | undefined = undefined,
  otherHandlers: Handlers = {},
): ReplicatedEntityHandler {
  otherHandlers.commandHandlers = {
    DoSomething: commandHandler,
  };
  return create(otherHandlers, delta);
}

function create(
  handlers: Handlers = {},
  delta: protocol.DeltaIn | null = null,
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
    roundTripInit({
      serviceName: 'test',
      entityId: 'foo',
      delta: delta,
    }),
  );
}

async function handleCommand(
  handler: ReplicatedEntityHandler,
  command: any,
  name = 'DoSomething',
  id = 10,
): Promise<protocol.Reply | null | undefined> {
  const response = await doHandleCommand(handler, command, name, id);
  if (response?.failure) {
    throw new Error(response?.failure?.description ?? '');
  }
  const reply = response?.reply;
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
      id: Long.fromNumber(id),
      name: name,
      payload: Any.flip(AnySupport.serialize(In.create(command), false, false)),
      metadata: { entries: [] },
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
  await Promise.resolve(handler.onData(roundTripStreamIn(streamIn)));
}

function assertHasNoAction(reply?: protocol.Reply | null) {
  if (reply?.stateAction !== null) {
    should.equal(reply?.stateAction?.update, null);
    should.equal(reply?.stateAction?.delete, null);
  }
}

function toNumber(n?: Long | number | string): number {
  return Long.fromValue(n ?? 0).toNumber();
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
      .deserialize(Any.flip(reply?.clientAction?.reply?.payload))
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
          change: Long.fromNumber(5),
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
      .deserialize(Any.flip(reply?.clientAction?.reply?.payload))
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
          change: Long.fromNumber(5),
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
          change: Long.fromNumber(5),
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
          change: Long.fromNumber(2),
        },
      },
    );
    send(handler, {
      delta: {
        counter: {
          change: Long.fromNumber(5),
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
          change: Long.fromNumber(2),
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
