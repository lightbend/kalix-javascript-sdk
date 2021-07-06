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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);
const expect = chai.expect;
const should = chai.should();

const protobuf = require('protobufjs');
const path = require('path');
const ActionSupport = require('../src/action-support');
const AnySupport = require('../src/protobuf-any');

const root = new protobuf.Root();
root.loadSync(path.join(__dirname, 'example.proto'));
root.resolveAll();
const anySupport = new AnySupport(root);

const In = root.lookupType('com.example.In');
const Out = root.lookupType('com.example.Out');
const ExampleServiceName = 'com.example.ExampleService';
const ExampleService = root.lookupService(ExampleServiceName);

const replies = require('../src/reply');

class MockUnaryCall {
  constructor(request) {
    this.request = request;
    this.value = new Promise(
      ((resolve, reject) => {
        let resolved = false;
        this.write = (value) => {
          if (resolved) throw new Error('Can only write to unary call once');
          resolved = true;
          resolve(value);
        };
      }).bind(this),
    );
  }

  reply() {
    return this.value.then((response) => {
      return anySupport.deserialize(response.reply.payload);
    });
  }

  forward() {
    return this.value.then((response) => {
      return anySupport.deserialize(response.forward.payload);
    });
  }

  effects() {
    return this.value.then((response) => {
      return response.sideEffects.map((effect) => ({
        serviceName: effect.serviceName,
        commandName: effect.commandName,
        payload: anySupport.deserialize(effect.payload),
        synchronous: effect.synchronous,
      }));
    });
  }
}

function createAction(handler) {
  const actionSupport = new ActionSupport();
  const allComponents = {};
  allComponents[ExampleServiceName] = ExampleService;
  actionSupport.addService(
    {
      root: root,
      serviceName: ExampleServiceName,
      service: ExampleService,
      commandHandlers: {
        DoSomething: handler,
      },
      desc: 'example.proto',
      options: {
        includeDirs: ['.', './test'],
      },
    },
    allComponents,
  );
  return actionSupport;
}

function callDoSomething(action, message) {
  const command = {
    serviceName: ExampleServiceName,
    name: 'DoSomething',
    payload: AnySupport.serialize(In.create(message)),
  };
  const call = new MockUnaryCall(command);
  const callback = (error, value) => call.write(value);
  action.handleUnary(call, callback);
  return call;
}

function testActionHandler(value, handler) {
  return callDoSomething(createAction(handler), { field: value });
}

function doSomethingAsync(message) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve({ field: 'async:' + message.field }), 1);
  });
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
    return testActionHandler('value', (message) => {
      return { field: 'returned:' + message.field };
    })
      .reply()
      .should.eventually.have.property('field', 'returned:value');
  });

  it('should reply with returned Reply message', () => {
    return testActionHandler('message', (message) => {
      return replies.message({ field: 'replied:' + message.field });
    })
      .reply()
      .should.eventually.have.property('field', 'replied:message');
  });

  it('should reply with context written value (no return value)', () => {
    return testActionHandler('something', (message, context) => {
      context.write({ field: 'wrote:' + message.field });
    })
      .reply()
      .should.eventually.have.property('field', 'wrote:something');
  });

  it('should reply with empty message when no returned value or context.write', () => {
    return testActionHandler('ignored', (message) => {
      console.log('received:' + message.field);
    })
      .reply()
      .should.eventually.have.property('field', '')
      .then(() => {
        console.log.should.have.been.calledOnceWith('received:ignored');
      });
  });

  it('should forward with returned Reply forward', () => {
    return testActionHandler('message', (message) => {
      return replies.forward(ExampleService.methods.DoSomething, {
        field: 'forwarded:' + message.field,
      });
    })
      .forward()
      .should.eventually.have.property('field', 'forwarded:message');
  });

  it('should forward with (deprecated) context forwarded message (no return value)', () => {
    return testActionHandler('message', (message, context) => {
      context.forward(ExampleService.methods.DoSomething, {
        field: 'forwarded:' + message.field,
      });
    })
      .forward()
      .should.eventually.have.property('field', 'forwarded:message')
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          "WARNING: Action context 'forward' is deprecated. Please use 'ReplyFactory.forward' instead.",
        );
      });
  });

  it('should side effect with returned Reply effects', async () => {
    const call = testActionHandler('message', (message) => {
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
    const call = testActionHandler('message', (message, context) => {
      context.effect(ExampleService.methods.DoSomething, {
        field: 'side effect',
      });
      return { field: 'returned:' + message.field };
    });
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
    return testActionHandler('something', (message, context) => {
      context.write({ field: 'wrote:' + message.field });
      return { field: 'returned:' + message.field }; // not used as already sent reply with context.write
    })
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
    return testActionHandler('value', (message) => {
      return doSomethingAsync(message).then((something) => {
        return { field: 'promised:' + something.field };
      });
    })
      .reply()
      .should.eventually.have.property('field', 'promised:async:value');
  });

  it('should reply with returned async value', () => {
    return testActionHandler('value', async (message) => {
      const something = await doSomethingAsync(message);
      return { field: 'awaited:' + something.field };
    })
      .reply()
      .should.eventually.have.property('field', 'awaited:async:value');
  });

  it('should reply with returned promise with Reply message', () => {
    return testActionHandler('message', (message) => {
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
    return testActionHandler('message', async (message) => {
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
    return testActionHandler('value', (message, context) => {
      return doSomethingAsync(message).then((something) => {
        context.write({ field: 'promised:wrote:' + something.field });
      });
    })
      .reply()
      .should.eventually.have.property('field', 'promised:wrote:async:value');
  });

  it('should reply with context written value in async function', () => {
    return testActionHandler('value', async (message, context) => {
      const something = await doSomethingAsync(message);
      context.write({ field: 'awaited:wrote:' + something.field });
    })
      .reply()
      .should.eventually.have.property('field', 'awaited:wrote:async:value');
  });

  it('should reply with empty message when returned promise is fulfilled with undefined', () => {
    return testActionHandler('ignored', (message) => {
      console.log('received:' + message.field);
      return doSomethingAsync(message).then((something) => {
        console.log('then:' + something.field);
      });
    })
      .reply()
      .should.eventually.have.property('field', '')
      .then(() => {
        console.log.should.have.been.calledTwice;
        expect(console.log.firstCall).to.have.been.calledWithExactly(
          'received:ignored',
        );
        expect(console.log.secondCall).to.have.been.calledWithExactly(
          'then:async:ignored',
        );
      });
  });

  it("should reply with empty message when async function doesn't return anything", () => {
    return testActionHandler('ignored', async (message) => {
      console.log('received:' + message.field);
      const something = await doSomethingAsync(message);
      console.log('then:' + something.field);
    })
      .reply()
      .should.eventually.have.property('field', '')
      .then(() => {
        console.log.should.have.been.calledTwice;
        expect(console.log.firstCall).to.have.been.calledWithExactly(
          'received:ignored',
        );
        expect(console.log.secondCall).to.have.been.calledWithExactly(
          'then:async:ignored',
        );
      });
  });

  it('should forward with returned promise with Reply forward', () => {
    return testActionHandler('message', (message) => {
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
    return testActionHandler('message', async (message) => {
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
    return testActionHandler('message', (message, context) => {
      return doSomethingAsync(message).then((something) => {
        context.forward(ExampleService.methods.DoSomething, {
          field: 'forwarded:promised:' + something.field,
        });
      });
    })
      .forward()
      .should.eventually.have.property(
        'field',
        'forwarded:promised:async:message',
      )
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          "WARNING: Action context 'forward' is deprecated. Please use 'ReplyFactory.forward' instead.",
        );
      });
  });

  it('should forward with (deprecated) context forwarded message in async function', () => {
    return testActionHandler('message', async (message, context) => {
      const something = await doSomethingAsync(message);
      context.forward(ExampleService.methods.DoSomething, {
        field: 'forwarded:awaited:' + something.field,
      });
    })
      .forward()
      .should.eventually.have.property(
        'field',
        'forwarded:awaited:async:message',
      )
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          "WARNING: Action context 'forward' is deprecated. Please use 'ReplyFactory.forward' instead.",
        );
      });
  });

  it('should side effect with returned promise with Reply effects', async () => {
    const call = testActionHandler('message', (message) => {
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
    const call = testActionHandler('message', async (message) => {
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
    const call = testActionHandler('message', (message, context) => {
      return doSomethingAsync(message).then((something) => {
        context.effect(ExampleService.methods.DoSomething, {
          field: 'side effect',
        });
        return { field: 'promised:' + something.field };
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
    console.warn.should.have.been.calledOnceWith(
      "WARNING: Action context 'effect' is deprecated. Please use 'Reply.addEffect' instead.",
    );
  });

  it('should side effect with (deprecated) context effects in returned promise', async () => {
    const call = testActionHandler('message', async (message, context) => {
      const something = await doSomethingAsync(message);
      context.effect(ExampleService.methods.DoSomething, {
        field: 'side effect',
      });
      return { field: 'awaited:' + something.field };
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
    console.warn.should.have.been.calledOnceWith(
      "WARNING: Action context 'effect' is deprecated. Please use 'Reply.addEffect' instead.",
    );
  });

  it('should only reply with previously context written value and warn about returned value in promise', () => {
    return testActionHandler('something', (message, context) => {
      return doSomethingAsync(message).then((something) => {
        context.write({ field: 'wrote:promised:' + something.field });
        return { field: 'promised:' + something.field }; // not used as already sent reply with context.write
      });
    })
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
    return testActionHandler('something', async (message, context) => {
      const something = await doSomethingAsync(message);
      context.write({ field: 'wrote:awaited:' + something.field });
      return { field: 'promised:' + something.field }; // not used as already sent reply with context.write
    })
      .reply()
      .should.eventually.have.property('field', 'wrote:awaited:async:something')
      .then(() => {
        console.warn.should.have.been.calledOnceWith(
          'WARNING: Action handler for ExampleService.DoSomething both sent a reply through the context and returned a value, ignoring return value.',
        );
      });
  });

  it('should reply by flattening nested promises', () => {
    return testActionHandler('something', (message, context) => {
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
});
