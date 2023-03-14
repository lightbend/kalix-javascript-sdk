/*
 * Copyright 2021-2023 Lightbend Inc.
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

// tag::client[]
const { IntegrationTestkit } = require("@kalix-io/testkit");
const should = require("chai").should();

const testkit = new IntegrationTestkit();
testkit.addComponent(require("../customer-value-entity"))
testkit.addComponent(require("../customer-value-entity-view"))

function client() {
  return testkit.clients.CustomerService;
}
// end::client[]

// tag::view[]
function view() {
  return testkit.clients.CustomersResponseByName;
}

describe("Customer registry service", function() {

  this.timeout(60000);

  before(done => testkit.start(done));
  after(done => testkit.shutdown(done));

  this.retries(10); // in case view has not updated yet
  beforeEach(function(done) { // add a delay between retries
    if (this.currentTest.currentRetry() > 0) {
      setTimeout(done, this.currentTest.currentRetry() * 1000);
    } else {
      done();
    }
  });
// end::view[]

  // tag::data[]
  const alice = {customerId: "alice", email: "alice@example.com", name: "Alice", address: {street: "The Street", city: "The Big City"}};
  const bob = {customerId: "bob", email: "bob@somewhere.com", name: "Bob", address: {street: "The Road", city: "The Small City"}};
  const alice2 = {customerId: "alice2", email: "alice@somewhere.com", name: "Alice", address: {street: "The Avenue", city: "The Big City"}};
  const otherAlice = {customerId: "alice2", email: "alice@somewhere.com", name: "Other Alice", address: {street: "The Avenue", city: "The Big City"}};
  // end::data[]

  it("should create customers", async () => {
    await client().createAsync(alice);
    await client().createAsync(bob);
    await client().createAsync(alice2);
  });

  // tag::exercise[]
  it("should get existing customers", async () => {
    (await client().getCustomerAsync({customerId: "alice"})).should.deep.equal(alice);
    (await client().getCustomerAsync({customerId: "bob"})).should.deep.equal(bob);
    (await client().getCustomerAsync({customerId: "alice2"})).should.deep.equal(alice2);
  });

  it("should lookup customers by name", async () => {
    (await view().getCustomersAsync({customerName: "Alice"})).results.should.have.deep.members([alice, alice2]);
    (await view().getCustomersAsync({customerName: "Bob"})).results.should.have.deep.members([bob]);
  });
  // end::exercise[]

  it("should change customer names", async () => {
    await client().changeNameAsync({customerId: "alice2", newName: "Other Alice"});
    (await view().getCustomersAsync({customerName: "Alice"})).results.should.have.deep.members([alice]);
    (await view().getCustomersAsync({customerName: "Other Alice"})).results.should.have.deep.members([otherAlice]);
  });

});
