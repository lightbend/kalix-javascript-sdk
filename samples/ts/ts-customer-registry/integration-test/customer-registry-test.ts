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

// tag::client[]
import { IntegrationTestkit } from "@kalix-io/kalix-javascript-sdk";
import { expect } from "chai";
import customerValueEntity from "../src/customer-value-entity";
import customerValueEntityView from "../src/customer-value-entity-view";
import { customer as customerApi } from "../lib/generated/customer_api";
import { customer as customerView } from "../lib/generated/customer_view";

type CustomerService = customerApi.api.CustomerService;
type CustomersResponseByName = customerView.view.CustomersResponseByName;

type CustomerServiceAsync = {
  [K in keyof CustomerService as `${K}Async`]: CustomerService[K];
};

type CustomersResponseByNameAsync = {
  [K in keyof CustomersResponseByName as `${K}Async`]: CustomersResponseByName[K];
};

const testkit = new IntegrationTestkit()
  .addComponent(customerValueEntity)
  .addComponent(customerValueEntityView);

function client(): CustomerServiceAsync {
  // @ts-ignore
  return testkit.clients.CustomerService;
}
// end::client[]

// tag::view[]
function view(): CustomersResponseByNameAsync {
  // @ts-ignore
  return testkit.clients.CustomersResponseByName;
}

describe("Customer registry service", function () {
  this.timeout(60000);

  before(done => testkit.start(done));
  after(done => testkit.shutdown(done));

  this.retries(10); // in case view has not updated yet
  beforeEach(function (done) {
    // add a delay between retries
    // @ts-ignore
    if (this.currentTest.currentRetry() > 0) {
      // add a delay between retries
      // @ts-ignore
      setTimeout(done, this.currentTest.currentRetry() * 1000);
    } else {
      done();
    }
  });
  // end::view[]

  // tag::data[]
  const alice = {
    customerId: "alice",
    email: "alice@example.com",
    name: "Alice",
    address: { street: "The Street", city: "The Big City" }
  };
  const bob = {
    customerId: "bob",
    email: "bob@somewhere.com",
    name: "Bob",
    address: { street: "The Road", city: "The Small City" }
  };
  const alice2 = {
    customerId: "alice2",
    email: "alice@somewhere.com",
    name: "Alice",
    address: { street: "The Avenue", city: "The Big City" }
  };
  const otherAlice = {
    customerId: "alice2",
    email: "alice@somewhere.com",
    name: "Other Alice",
    address: { street: "The Avenue", city: "The Big City" }
  };
  // end::data[]

  it("should create customers", async () => {
    await client().createAsync(alice);
    await client().createAsync(bob);
    await client().createAsync(alice2);
  });

  // tag::exercise[]
  it("should get existing customers", async () => {
    expect(
      await client().getCustomerAsync({ customerId: "alice" })
    ).to.deep.equal(alice);
    expect(
      await client().getCustomerAsync({ customerId: "bob" })
    ).to.deep.equal(bob);
    expect(
      await client().getCustomerAsync({ customerId: "alice2" })
    ).to.deep.equal(alice2);
  });

  it("should lookup customers by name", async () => {
    expect(
      await view().getCustomersAsync({ customerName: "Alice" })
    ).to.deep.equal({ results: [alice, alice2] });
    expect(
      await view().getCustomersAsync({ customerName: "Bob" })
    ).to.deep.equal({ results: [bob] });
  });
  // end::exercise[]

  it("should change customer names", async () => {
    await client().changeNameAsync({
      customerId: "alice2",
      newName: "Other Alice"
    });
    // the above call is eventually consistent, so let's wait some time until the change is applied
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(
      await view().getCustomersAsync({ customerName: "Alice" })
    ).to.deep.equal({ results: [alice] });
    expect(
      await view().getCustomersAsync({ customerName: "Other Alice" })
    ).to.deep.equal({ results: [otherAlice] });
  });
});
