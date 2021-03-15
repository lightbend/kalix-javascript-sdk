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
const akkaserverless = require("../");

const action = new akkaserverless.Action("./test/example.proto", "com.example.ExampleService");

action.commandHandlers = {
  DoSomething: input => {
    return {field: "Received " + input.field};
  },
  StreamSomething: (input, ctx) => {
    ctx.write({field: "Received " + input.field});
    ctx.end();
  }
};


const testkit = new akkaserverless.IntegrationTestkit({
  descriptorSetPath: "integration-test/user-function.desc",
});

testkit.addComponent(action);

describe("The AkkaServerless IntegrationTestkit", function() {
  this.timeout(60000);
  before(done => testkit.start(done));
  after(done => testkit.shutdown(done));

  it("should handle actions", (done) => {
    testkit.clients.ExampleService.DoSomething({field: "hello"}, (err, msg) => {
      if (err) {
        done(err);
      } else {
        msg.field.should.equal("Received hello");
        done();
      }
    });
  });
});
