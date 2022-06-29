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

import { IntegrationTestkit } from "@kalix-io/testkit";
import { expect } from "chai";
import customer from "../src/customer.js";

const testkit = new IntegrationTestkit();
testkit.addComponent(customer);

const client = () => testkit.clients.CustomerService;

describe("CustomerService", function () {
  this.timeout(60000);

  before((done) => testkit.start(done));
  after((done) => testkit.shutdown(done));

  it("should create a new customer", async () => {
    await client().createAsync({
      customerId: "abc123",
      email: "foo@example.com",
      name: "Foo Bar",
      address: { street: "42 Something St", city: "Somewhere City" },
    });

    {
      const customer = await client().getCustomerAsync({ customerId: "abc123" });
      expect(customer.name).to.equal("Foo Bar");
      expect(customer.email).to.equal("foo@example.com");
      expect(customer.address).to.deep.equal({ street: "42 Something St", city: "Somewhere City" });
    }
  });

  it("should change the name of a customer", async () => {
    await client().createAsync({
      customerId: "abc123",
      email: "foo@example.com",
      name: "Foo Bar",
      address: { street: "42 Something St", city: "Somewhere City" },
    });

    {
      const customer = await client().getCustomerAsync({ customerId: "abc123" });
      expect(customer.name).to.equal("Foo Bar");
    }

    await client().changeNameAsync({
      customerId: "abc123",
      newName: "Baz Qux",
    });

    {
      const customer = await client().getCustomerAsync({ customerId: "abc123" });
      expect(customer.name).to.equal("Baz Qux");
    }
  });

  it("should change the address of a customer", async () => {
    await client().createAsync({
      customerId: "abc123",
      email: "foo@example.com",
      name: "Foo Bar",
      address: { street: "42 Something St", city: "Somewhere City" },
    });

    {
      const customer = await client().getCustomerAsync({ customerId: "abc123" });
      expect(customer.address).to.deep.equal({ street: "42 Something St", city: "Somewhere City" });
    }

    await client().changeAddressAsync({
      customerId: "abc123",
      newAddress: { street: "123 Awesome Street", city: "New City" },
    });

    {
      const customer = await client().getCustomerAsync({ customerId: "abc123" });
      expect(customer.address).to.deep.equal({ street: "123 Awesome Street", city: "New City" });
    }
  });
});
