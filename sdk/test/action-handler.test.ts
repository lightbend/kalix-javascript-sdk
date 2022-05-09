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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(chaiAsPromised);
chai.use(sinonChai);
const expect = chai.expect;
chai.should();

import * as protobuf from 'protobufjs';
import * as path from 'path';
import { Action } from '../src/action';
import ActionSupport, { UnaryCall, UnaryCallback } from '../src/action-support';
import AnySupport from '../src/protobuf-any';
import { Message } from '../src/command';
import { ServiceMap } from '../src/kalix';

const root = new protobuf.Root();
const desc = path.join(__dirname, 'example.proto');
root.loadSync(desc);
root.resolveAll();
const anySupport = new AnySupport(root);

type In = {
  field: string;
};

const In = root.lookupType('com.example.In');
const ExampleServiceName = 'com.example.ExampleService';
const ExampleService = root.lookupService(ExampleServiceName);

import * as replies from '../src/reply';
import _stableJsonStringify from 'json-stable-stringify';
import * as proto from '../proto/protobuf-bundle';

namespace protocol {
  export type Command = proto.kalix.component.action.IActionCommand;
  export type Response = proto.kalix.component.action.IActionResponse;
}

class MockUnaryCall {
  request: protocol.Command;
  value: Promise<protocol.Response>;

  write?: (value: protocol.Response) => void;

  constructor(request: protocol.Command) {
    this.request = request;
    this.value = new Promise(
      ((
        resolve: (value: protocol.Response) => void,
        _reject: (reason?: any) => void,
      ) => {
        let resolved = false;
        this.write = (value: protocol.Response) => {
          if (resolved) throw new Error('Can only write to unary call once');
          resolved = true;
          resolve(value);
        };
      }).bind(this),
    );
  }

  async reply(): Promise<any> {
    const value = await this.value;
    return anySupport.deserialize(value.reply?.payload);
  }

  async forward(): Promise<any> {
    const value = await this.value;
    return anySupport.deserialize(value.forward?.payload);
  }

  async effects(): Promise<
    {
      serviceName: string;
      commandName: string;
      payload: any;
      synchronous: boolean;
    }[]
  > {
    const value = await this.value;
    return (value.sideEffects ?? []).map((effect) => ({
      serviceName: effect.serviceName ?? '',
      commandName: effect.commandName ?? '',
      payload: anySupport.deserialize(effect.payload),
      synchronous: effect.synchronous ?? false,
    }));
  }
}

function createAction(handler: Action.CommandHandler): ActionSupport {
  const actionSupport = new ActionSupport();
  const allComponents: ServiceMap = {};
  allComponents[ExampleServiceName] = ExampleService;
  const action = new Action(desc, ExampleServiceName).setCommandHandlers({
    DoSomething: handler,
    PublishJsonToTopic: handler,
  });
  actionSupport.addService(action, allComponents);
  return actionSupport;
}

function callDoSomething(action: ActionSupport, message: Message) {
  const command: protocol.Command = {
    serviceName: ExampleServiceName,
    name: 'DoSomething',
    payload: AnySupport.serialize(In.create(message), false, false),
  };
  const call = new MockUnaryCall(command);
  const callback = (_error: any, value: protocol.Response) =>
    call.write!(value);
  action.handleUnary(call as unknown as UnaryCall, callback as UnaryCallback);
  return call;
}

function callPublishJsonToTopic(action: ActionSupport, message: Message) {
  const command: protocol.Command = {
    serviceName: ExampleServiceName,
    name: 'PublishJsonToTopic',
    payload: AnySupport.serialize(In.create(message), false, false),
  };
  const call = new MockUnaryCall(command);
  const callback = (_error: any, value: protocol.Response) =>
    call.write!(value);
  action.handleUnary(call as unknown as UnaryCall, callback as UnaryCallback);
  return call;
}

function testActionHandler(value: string, handler: Action.CommandHandler) {
  return callDoSomething(createAction(handler), { field: value });
}

function doSomethingAsync(message: In) {
  return new Promise(
    (resolve: (value: In) => void, _reject: (reason?: any) => void) => {
      setTimeout(() => resolve({ field: 'async:' + message.field }), 1);
    },
  );
}

describe('ActionHandler', () => {
  beforeEach(function () {
    sinon.stub(console, 'log');
    sinon.stub(console, 'warn');
  });

  afterEach(function () {
    sinon.restore();
  });

  // synchronous handlers

  it('should reply with returned value', () => {
    return testActionHandler('value', (message: In) => {
      return { field: 'returned:' + message.field };
    })
      .reply()
      .should.eventually.have.property('field', 'returned:value');
  });

  it('should reply with returned Reply message', () => {
    return testActionHandler('message', (message: In) => {
      return replies.message({ field: 'replied:' + message.field });
    })
      .reply()
      .should.eventually.have.property('field', 'replied:message');
  });

  it('should reply with context written value (no return value)', () => {
    return testActionHandler(
      'something',
      (message: In, context: Action.UnaryCommandContext) => {
        context.write({ field: 'wrote:' + message.field });
      },
    )
      .reply()
      .should.eventually.have.property('field', 'wrote:something');
  });

  it('should reply with empty message when no returned value or context.write', () => {
    return testActionHandler('ignored', (message: In) => {
      console.log('received:' + message.field);
    })
      .reply()
      .should.eventually.have.property('field', '')
      .then(() => {
        console.log.should.have.been.calledOnceWith('received:ignored');
      });
  });

  it('should forward with returned Reply forward', () => {
    return testActionHandler('message', (message: In) => {
      return replies.forward(ExampleService.methods.DoSomething, {
        field: 'forwarded:' + message.field,
      });
    })
      .forward()
      .should.eventually.have.property('field', 'forwarded:message');
  });

  it('should forward with (deprecated) context forwarded message (no return value)', () => {
    return testActionHandler(
      'message',
      (message: In, context: Action.UnaryCommandContext) => {
        context.forward(ExampleService.methods.DoSomething, {
          field: 'forwarded:' + message.field,
        });
      },
    )
      .forward()
      .should.eventually.have.property('field', 'forwarded:message')
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          "WARNING: Action context 'forward' is deprecated. Please use 'replies.forward' instead.",
        );
      });
  });

  it('should side effect with returned Reply effects', async () => {
    const call = testActionHandler('message', (message: In) => {
      return replies
        .message({ field: 'replied:' + message.field })
        .addEffect(ExampleService.methods.DoSomething, {
          field: 'side effect',
        });
    });
    (await call.reply()).should.have.property('field', 'replied:message');
    (await call.effects()).should.have.deep.members([
      {
        serviceName: 'com.example.ExampleService',
        commandName: 'DoSomething',
        payload: In.create({ field: 'side effect' }),
        synchronous: false,
      },
    ]);
    console.warn.should.not.have.been.called;
  });

  it('should side effect with (deprecated) context effects', async () => {
    const call = testActionHandler(
      'message',
      (message: In, context: Action.UnaryCommandContext) => {
        context.effect(ExampleService.methods.DoSomething, {
          field: 'side effect',
        });
        return { field: 'returned:' + message.field };
      },
    );
    (await call.reply()).should.have.property('field', 'returned:message');
    (await call.effects()).should.have.deep.members([
      {
        serviceName: 'com.example.ExampleService',
        commandName: 'DoSomething',
        payload: In.create({ field: 'side effect' }),
        synchronous: false,
      },
    ]);
    console.warn.should.have.been.calledOnceWith(
      "WARNING: Action context 'effect' is deprecated. Please use 'Reply.addEffect' instead.",
    );
  });

  it('should only reply with previously context written value and warn about returned value', () => {
    return testActionHandler(
      'something',
      (message: In, context: Action.UnaryCommandContext) => {
        context.write({ field: 'wrote:' + message.field });
        return { field: 'returned:' + message.field }; // not used as already sent reply with context.write
      },
    )
      .reply()
      .should.eventually.have.property('field', 'wrote:something')
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          'WARNING: Action handler for ExampleService.DoSomething both sent a reply through the context and returned a value, ignoring return value.',
        );
      });
  });

  // asynchronous handlers

  it('should reply with returned promise value', () => {
    return testActionHandler('value', (message: In) => {
      return doSomethingAsync(message).then((something) => {
        return { field: 'promised:' + something.field };
      });
    })
      .reply()
      .should.eventually.have.property('field', 'promised:async:value');
  });

  it('should reply with returned async value', () => {
    return testActionHandler('value', async (message: In) => {
      const something = await doSomethingAsync(message);
      return { field: 'awaited:' + something.field };
    })
      .reply()
      .should.eventually.have.property('field', 'awaited:async:value');
  });

  it('should reply with returned promise with Reply message', () => {
    return testActionHandler('message', (message: In) => {
      return doSomethingAsync(message).then((something) => {
        return replies.message({
          field: 'promised:replied:' + something.field,
        });
      });
    })
      .reply()
      .should.eventually.have.property(
        'field',
        'promised:replied:async:message',
      );
  });

  it('should reply with returned async Reply message', () => {
    return testActionHandler('message', async (message: In) => {
      const something = await doSomethingAsync(message);
      return replies.message({ field: 'awaited:replied:' + something.field });
    })
      .reply()
      .should.eventually.have.property(
        'field',
        'awaited:replied:async:message',
      );
  });

  it('should reply with context written value in returned promise', () => {
    return testActionHandler(
      'value',
      (message: In, context: Action.UnaryCommandContext) => {
        return doSomethingAsync(message).then((something) => {
          context.write({ field: 'promised:wrote:' + something.field });
        });
      },
    )
      .reply()
      .should.eventually.have.property('field', 'promised:wrote:async:value');
  });

  it('should reply with context written value in async function', () => {
    return testActionHandler(
      'value',
      async (message: In, context: Action.UnaryCommandContext) => {
        const something = await doSomethingAsync(message);
        context.write({ field: 'awaited:wrote:' + something.field });
      },
    )
      .reply()
      .should.eventually.have.property('field', 'awaited:wrote:async:value');
  });

  it('should reply with empty message when returned promise is fulfilled with undefined', () => {
    return testActionHandler('ignored', (message: In) => {
      console.log('received:' + message.field);
      return doSomethingAsync(message).then((something) => {
        console.log('then:' + something.field);
      });
    })
      .reply()
      .should.eventually.have.property('field', '')
      .then(() => {
        console.log.should.have.been.calledTwice;
        expect((console.log as any).firstCall).to.have.been.calledWithExactly(
          'received:ignored',
        );
        expect((console.log as any).secondCall).to.have.been.calledWithExactly(
          'then:async:ignored',
        );
      });
  });

  it("should reply with empty message when async function doesn't return anything", () => {
    return testActionHandler('ignored', async (message: In) => {
      console.log('received:' + message.field);
      const something = await doSomethingAsync(message);
      console.log('then:' + something.field);
    })
      .reply()
      .should.eventually.have.property('field', '')
      .then(() => {
        console.log.should.have.been.calledTwice;
        expect((console.log as any).firstCall).to.have.been.calledWithExactly(
          'received:ignored',
        );
        expect((console.log as any).secondCall).to.have.been.calledWithExactly(
          'then:async:ignored',
        );
      });
  });

  it('should forward with returned promise with Reply forward', () => {
    return testActionHandler('message', (message: In) => {
      return doSomethingAsync(message).then((something) => {
        return replies.forward(ExampleService.methods.DoSomething, {
          field: 'forwarded:promised:' + something.field,
        });
      });
    })
      .forward()
      .should.eventually.have.property(
        'field',
        'forwarded:promised:async:message',
      );
  });

  it('should forward with returned async Reply forward', () => {
    return testActionHandler('message', async (message: In) => {
      const something = await doSomethingAsync(message);
      return replies.forward(ExampleService.methods.DoSomething, {
        field: 'forwarded:awaited:' + something.field,
      });
    })
      .forward()
      .should.eventually.have.property(
        'field',
        'forwarded:awaited:async:message',
      );
  });

  it('should forward with (deprecated) context forwarded message in returned promise', () => {
    return testActionHandler(
      'message',
      (message: In, context: Action.UnaryCommandContext) => {
        return doSomethingAsync(message).then((something) => {
          context.forward(ExampleService.methods.DoSomething, {
            field: 'forwarded:promised:' + something.field,
          });
        });
      },
    )
      .forward()
      .should.eventually.have.property(
        'field',
        'forwarded:promised:async:message',
      )
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          "WARNING: Action context 'forward' is deprecated. Please use 'replies.forward' instead.",
        );
      });
  });

  it('should forward with (deprecated) context forwarded message in async function', () => {
    return testActionHandler(
      'message',
      async (message: In, context: Action.UnaryCommandContext) => {
        const something = await doSomethingAsync(message);
        context.forward(ExampleService.methods.DoSomething, {
          field: 'forwarded:awaited:' + something.field,
        });
      },
    )
      .forward()
      .should.eventually.have.property(
        'field',
        'forwarded:awaited:async:message',
      )
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          "WARNING: Action context 'forward' is deprecated. Please use 'replies.forward' instead.",
        );
      });
  });

  it('should side effect with returned promise with Reply effects', async () => {
    const call = testActionHandler('message', (message: In) => {
      return doSomethingAsync(message).then((something) => {
        return replies
          .message({ field: 'promised:' + something.field })
          .addEffect(ExampleService.methods.DoSomething, {
            field: 'side effect',
          });
      });
    });
    (await call.reply()).should.have.property(
      'field',
      'promised:async:message',
    );
    (await call.effects()).should.have.deep.members([
      {
        serviceName: 'com.example.ExampleService',
        commandName: 'DoSomething',
        payload: In.create({ field: 'side effect' }),
        synchronous: false,
      },
    ]);
    console.warn.should.not.have.been.called;
  });

  it('should side effect with returned async Reply effects', async () => {
    const call = testActionHandler('message', async (message: In) => {
      const something = await doSomethingAsync(message);
      return replies
        .message({ field: 'awaited:' + something.field })
        .addEffect(ExampleService.methods.DoSomething, {
          field: 'side effect',
        });
    });
    (await call.reply()).should.have.property('field', 'awaited:async:message');
    (await call.effects()).should.have.deep.members([
      {
        serviceName: 'com.example.ExampleService',
        commandName: 'DoSomething',
        payload: In.create({ field: 'side effect' }),
        synchronous: false,
      },
    ]);
    console.warn.should.not.have.been.called;
  });

  it('should side effect with (deprecated) context effects in returned promise', async () => {
    const call = testActionHandler(
      'message',
      (message: In, context: Action.UnaryCommandContext) => {
        return doSomethingAsync(message).then((something) => {
          context.effect(ExampleService.methods.DoSomething, {
            field: 'side effect',
          });
          return { field: 'promised:' + something.field };
        });
      },
    );
    (await call.reply()).should.have.property(
      'field',
      'promised:async:message',
    );
    (await call.effects()).should.have.deep.members([
      {
        serviceName: 'com.example.ExampleService',
        commandName: 'DoSomething',
        payload: In.create({ field: 'side effect' }),
        synchronous: false,
      },
    ]);
    console.warn.should.have.been.calledOnceWith(
      "WARNING: Action context 'effect' is deprecated. Please use 'Reply.addEffect' instead.",
    );
  });

  it('should side effect with (deprecated) context effects in returned promise', async () => {
    const call = testActionHandler(
      'message',
      async (message: In, context: Action.UnaryCommandContext) => {
        const something = await doSomethingAsync(message);
        context.effect(ExampleService.methods.DoSomething, {
          field: 'side effect',
        });
        return { field: 'awaited:' + something.field };
      },
    );
    (await call.reply()).should.have.property('field', 'awaited:async:message');
    (await call.effects()).should.have.deep.members([
      {
        serviceName: 'com.example.ExampleService',
        commandName: 'DoSomething',
        payload: In.create({ field: 'side effect' }),
        synchronous: false,
      },
    ]);
    console.warn.should.have.been.calledOnceWith(
      "WARNING: Action context 'effect' is deprecated. Please use 'Reply.addEffect' instead.",
    );
  });

  it('should only reply with previously context written value and warn about returned value in promise', () => {
    return testActionHandler(
      'something',
      (message: In, context: Action.UnaryCommandContext) => {
        return doSomethingAsync(message).then((something) => {
          context.write({ field: 'wrote:promised:' + something.field });
          return { field: 'promised:' + something.field }; // not used as already sent reply with context.write
        });
      },
    )
      .reply()
      .should.eventually.have.property(
        'field',
        'wrote:promised:async:something',
      )
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          'WARNING: Action handler for ExampleService.DoSomething both sent a reply through the context and returned a value, ignoring return value.',
        );
      });
  });

  it('should only reply with previously context written value and warn about returned async value', () => {
    return testActionHandler(
      'something',
      async (message: In, context: Action.UnaryCommandContext) => {
        const something = await doSomethingAsync(message);
        context.write({ field: 'wrote:awaited:' + something.field });
        return { field: 'promised:' + something.field }; // not used as already sent reply with context.write
      },
    )
      .reply()
      .should.eventually.have.property('field', 'wrote:awaited:async:something')
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          'WARNING: Action handler for ExampleService.DoSomething both sent a reply through the context and returned a value, ignoring return value.',
        );
      });
  });

  it('should reply by flattening nested promises', () => {
    return testActionHandler('something', (message: In) => {
      return doSomethingAsync(message).then((something) => {
        return doSomethingAsync(something).then((nested) => {
          return { field: 'nested:promised:' + nested.field };
        });
      });
    })
      .reply()
      .should.eventually.have.property(
        'field',
        'nested:promised:async:async:something',
      );
  });

  it('should reply with Kalix JSON for unary methods returning Any', () => {
    let expectedReply = { arbitrary: 'object' };
    return callPublishJsonToTopic(
      createAction((_message: In) => {
        return replies.message(expectedReply);
      }),
      { field: 'whatever' },
    )
      .value.then((response) => {
        const payload = response.reply?.payload;
        payload?.should.have.property('type_url', 'json.kalix.io/object');
        return JSON.parse(
          AnySupport.deserializePrimitive(
            payload?.value || Buffer.alloc(0),
            'string',
          ) as string,
        );
      })
      .should.eventually.deep.equal(expectedReply);
  });
});
