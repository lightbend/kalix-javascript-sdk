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

require('chai').should();
import {
  Action,
  EventSourcedEntity,
  Reply,
  ValueEntity,
} from '@kalix-io/kalix-javascript-sdk';
import { IntegrationTestkit } from '../src/integration-testkit';
import { ServiceError } from '@grpc/grpc-js';
import * as proto from './proto';

type Example = proto.com.example.IExample & protobuf.Message;
type In = proto.com.example.IIn;
type Out = proto.com.example.IOut;

const action = new Action(
  './integration-test/example.proto',
  'com.example.ExampleService',
);

action.commandHandlers = {
  DoSomething: (input: In) => {
    return { field: 'Received ' + input.field };
  },
  StreamSomething: (input: In, ctx: Action.StreamedOutCommandContext) => {
    ctx.write({ field: 'Received ' + input.field });
    ctx.end();
  },
  Fail: (_input: In, ctx: Action.UnaryCommandContext) => {
    ctx.fail('some-error', 6);
  },
};

const value_entity = new ValueEntity<Example>(
  './integration-test/example.proto',
  'com.example.ExampleServiceTwo',
  'value-entity-example-service',
);

value_entity.setInitial(() =>
  value_entity.lookupType('com.example.Example').create({}),
);

value_entity.commandHandlers = {
  DoSomethingOne: (input: In) => {
    return { field: 'ValueEntity Received ' + input.field };
  },
  DoSomethingTwo: (input: In) => {
    return new Promise((resolve) => {
      setTimeout(
        () => resolve({ field: 'ValueEntityAsync Received ' + input.field }),
        1000,
      );
    });
  },
  Fail: () => Reply.failure('some-error', 6),
};

const entity = new EventSourcedEntity<Example>(
  './integration-test/example.proto',
  'com.example.ExampleServiceThree',
  'event-sourced-entity-example-service',
);

entity.setInitial(() => entity.lookupType('com.example.Example').create({}));

entity.setBehavior(() => {
  return {
    commandHandlers: {
      DoSomethingOne: (input: In) => {
        return { field: 'EventSourcedEntity Received ' + input.field };
      },
      DoSomethingTwo: (input: In) => {
        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                field: 'EventSourcedEntityAsync Received ' + input.field,
              }),
            1000,
          );
        });
      },
      Fail: () => Reply.failure('some-error', 6),
    },
    eventHandlers: {},
  };
});

const testkit = new IntegrationTestkit({
  descriptorSetPath: 'integration-test/user-function.desc',
});

testkit.addComponent(action);
testkit.addComponent(value_entity);
testkit.addComponent(entity);

describe('The Kalix IntegrationTestkit', function () {
  this.timeout(60000);
  before((done) => testkit.start(done));
  after((done) => testkit.shutdown(done));

  it('should handle actions', (done) => {
    testkit.clients.ExampleService.DoSomething(
      { field: 'hello' },
      (err: any, msg: Out) => {
        if (err) {
          done(err);
        } else {
          msg.field?.should.equal('Received hello');
          done();
        }
      },
    );
  });

  it('should allow actions to fail with custom code', (done) => {
    testkit.clients.ExampleService.Fail(
      { field: 'hello' },
      (err: ServiceError, _msg: Out) => {
        err.should.not.be.undefined;
        // Unfortunately, this appears to be the only way the JS library offers to read the error description,
        // by reading this unspecified message string.
        err.message.should.be.eq('6 ALREADY_EXISTS: some-error');
        err.code.should.be.eq(6);
        done();
      },
    );
  });

  it('should handle value entities sync handlers', (done) => {
    testkit.clients.ExampleServiceTwo.DoSomethingOne(
      { field: 'hello' },
      (_err: any, msg: Out) => {
        msg.field?.should.equal('ValueEntity Received hello');
        done();
      },
    );
  });

  it('should handle value entities async handlers', (done) => {
    testkit.clients.ExampleServiceTwo.DoSomethingTwo(
      { field: 'hello' },
      (_err: any, msg: Out) => {
        msg.field?.should.equal('ValueEntityAsync Received hello');
        done();
      },
    );
  });

  it('should allow value entities to fail with custom code', (done) => {
    testkit.clients.ExampleServiceTwo.Fail(
      { field: 'hello' },
      (err: ServiceError, _msg: Out) => {
        err.should.not.be.undefined;
        err.message.should.be.eq('6 ALREADY_EXISTS: some-error');
        err.code.should.be.eq(6);
        done();
      },
    );
  });

  it('should handle event sourced entities sync handlers', (done) => {
    testkit.clients.ExampleServiceThree.DoSomethingOne(
      { field: 'hello' },
      (_err: any, msg: Out) => {
        msg.field?.should.equal('EventSourcedEntity Received hello');
        done();
      },
    );
  });

  it('should handle event sourced entities async handlers', (done) => {
    testkit.clients.ExampleServiceThree.DoSomethingTwo(
      { field: 'hello' },
      (_err: any, msg: Out) => {
        msg.field?.should.equal('EventSourcedEntityAsync Received hello');
        done();
      },
    );
  });

  it('should allow event sourced entities to fail with custom code', (done) => {
    testkit.clients.ExampleServiceThree.Fail(
      { field: 'hello' },
      (err: ServiceError, _msg: Out) => {
        err.should.not.be.undefined;
        err.message.should.be.eq('6 ALREADY_EXISTS: some-error');
        err.code.should.be.eq(6);
        done();
      },
    );
  });
});
