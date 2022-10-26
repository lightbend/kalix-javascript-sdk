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

import { LocalServicePrincipal } from '@kalix-io/kalix-javascript-sdk';

require('chai').should();
import { IntegrationTestkit } from '../src';
import action from '../example/src/action';
import actionWithAcl from '../example/src/action-with-acl';
import valueEntity from '../example/src/value-entity';
import eventSourcedEntity from '../example/src/event-sourced-entity';
import { ServiceError } from '@grpc/grpc-js';
import * as proto from '../example/generated/proto';

type Out = proto.com.example.IOut;

const testkit = new IntegrationTestkit({
  descriptorSetPath: 'example/generated/user-function.desc',
  aclCheckingEnabled: false,
});

testkit.addComponent(action);
testkit.addComponent(valueEntity);
testkit.addComponent(eventSourcedEntity);
testkit.addComponent(actionWithAcl);

describe('The Kalix IntegrationTestkit', function () {
  this.timeout(60000);
  before((done) => testkit.start(done));
  after((done) => testkit.shutdown(done));

  it('should handle actions', (done) => {
    testkit.clients.ExampleActionService.DoSomething(
      { field: 'hello' },
      (err: any, msg: Out) => {
        if (err) {
          done(err);
        } else {
          msg.field?.should.equal('Received: hello');
          done();
        }
      },
    );
  });

  it('should allow actions to fail with custom code', (done) => {
    testkit.clients.ExampleActionService.Fail(
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

  it('should handle actions with acl', (done) => {
    testkit
      .clientsForPrincipal(new LocalServicePrincipal('other'))
      .ExampleActionWithACLService.OnlyFromOtherService(
        { field: 'hello' },
        (err: any, msg: Out) => {
          if (err) {
            done(err);
          } else {
            msg.field?.should.equal('Received: hello, principals: other');
            done();
          }
        },
      );
  });

  it('should handle self-delegating actions (with acl)', (done) => {
    // Note: not really a test of the testkit but that the SDK sets inter-component calls up right
    testkit.clients.ExampleActionWithACLService.DelegateToSelf(
      { field: 'hello' },
      (err: any, msg: Out) => {
        if (err) {
          done(err);
        } else {
          msg.field?.should.equal(
            'OnlyFromSelf Received: hello, principals: self',
          );
          done();
        }
      },
    );
  });

  it('should handle value entities sync handlers', (done) => {
    testkit.clients.ExampleValueEntityService.DoSomethingOne(
      { field: 'hello' },
      (_err: any, msg: Out) => {
        msg.field?.should.equal('ValueEntity received: hello');
        done();
      },
    );
  });

  it('should handle value entities async handlers', (done) => {
    testkit.clients.ExampleValueEntityService.DoSomethingTwo(
      { field: 'hello' },
      (_err: any, msg: Out) => {
        msg.field?.should.equal('ValueEntity async received: hello');
        done();
      },
    );
  });

  it('should allow value entities to fail with custom code', (done) => {
    testkit.clients.ExampleValueEntityService.Fail(
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
    testkit.clients.ExampleEventSourcedEntityService.DoSomethingOne(
      { field: 'hello' },
      (_err: any, msg: Out) => {
        msg.field?.should.equal('EventSourcedEntity received: hello');
        done();
      },
    );
  });

  it('should handle event sourced entities async handlers', (done) => {
    testkit.clients.ExampleEventSourcedEntityService.DoSomethingTwo(
      { field: 'hello' },
      (_err: any, msg: Out) => {
        msg.field?.should.equal('EventSourcedEntity async received: hello');
        done();
      },
    );
  });

  it('should allow event sourced entities to fail with custom code', (done) => {
    testkit.clients.ExampleEventSourcedEntityService.Fail(
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
