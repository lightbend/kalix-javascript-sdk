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

import { MockValueEntity } from "@kalix-io/testkit";
import { expect } from "chai";
import customer from "../src/customer";

const CustomerState = customer.lookupType("customer.domain.CustomerState");

describe("CustomerService", () => {
  const entityId = "entityId";

  describe("Create", () => {
    it("should create a new customer", async () => {
      const entity = new MockValueEntity(customer, entityId);

      const response = await entity.handleCommand("Create", {
        customerId: "abc123",
        email: "foo@example.com",
        name: "Foo Bar",
        address: { street: "42 Something St", city: "Somewhere City" },
      });

      expect(response).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(
        CustomerState.create({
          customerId: "abc123",
          email: "foo@example.com",
          name: "Foo Bar",
          address: { street: "42 Something St", city: "Somewhere City" },
        }),
      );
    });
  });

  describe("GetCustomer", () => {
    it("should get an existing customer", async () => {
      const entity = new MockValueEntity(customer, entityId);

      await entity.handleCommand("Create", {
        customerId: "abc123",
        email: "foo@example.com",
        name: "Foo Bar",
        address: { street: "42 Something St", city: "Somewhere City" },
      });

      expect(entity.state).to.deep.equal(
        CustomerState.create({
          customerId: "abc123",
          email: "foo@example.com",
          name: "Foo Bar",
          address: { street: "42 Something St", city: "Somewhere City" },
        }),
      );

      const response = await entity.handleCommand("GetCustomer", { customerId: "abc123" });

      expect(response).to.deep.equal({
        customerId: "abc123",
        email: "foo@example.com",
        name: "Foo Bar",
        address: { street: "42 Something St", city: "Somewhere City" },
      });
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(
        CustomerState.create({
          customerId: "abc123",
          email: "foo@example.com",
          name: "Foo Bar",
          address: { street: "42 Something St", city: "Somewhere City" },
        }),
      );
    });

    it("should fail to get a non-existing customer", async () => {
      const entity = new MockValueEntity(customer, entityId);

      const response = await entity.handleCommand("GetCustomer", { customerId: "abc123" });

      expect(response).to.be.undefined;
      expect(entity.error).to.be.equal("Customer abc123 has not been created.");
      expect(entity.state).to.deep.equal(CustomerState.create({}));
    });
  });

  describe("ChangeName", () => {
    it("should change the name of an existing customer", async () => {
      const entity = new MockValueEntity(customer, entityId);

      await entity.handleCommand("Create", {
        customerId: "abc123",
        email: "foo@example.com",
        name: "Foo Bar",
        address: { street: "42 Something St", city: "Somewhere City" },
      });

      expect(entity.state).to.deep.equal(
        CustomerState.create({
          customerId: "abc123",
          email: "foo@example.com",
          name: "Foo Bar",
          address: { street: "42 Something St", city: "Somewhere City" },
        }),
      );

      const response = await entity.handleCommand("ChangeName", {
        customerId: "abc123",
        newName: "Baz Qux",
      });

      expect(response).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(
        CustomerState.create({
          customerId: "abc123",
          email: "foo@example.com",
          name: "Baz Qux",
          address: { street: "42 Something St", city: "Somewhere City" },
        }),
      );
    });

    it("should fail to change the name of a non-existing customer", async () => {
      const entity = new MockValueEntity(customer, entityId);

      const response = await entity.handleCommand("ChangeName", {
        customerId: "abc123",
        newName: "Baz Qux",
      });

      expect(response).to.be.undefined;
      expect(entity.error).to.be.equal("Customer must be created before name can be changed.");
      expect(entity.state).to.deep.equal(CustomerState.create({}));
    });
  });

  describe("ChangeAddress", () => {
    it("should change the address of an existing customer", async () => {
      const entity = new MockValueEntity(customer, entityId);

      await entity.handleCommand("Create", {
        customerId: "abc123",
        email: "foo@example.com",
        name: "Foo Bar",
        address: { street: "42 Something St", city: "Somewhere City" },
      });

      expect(entity.state).to.deep.equal(
        CustomerState.create({
          customerId: "abc123",
          email: "foo@example.com",
          name: "Foo Bar",
          address: { street: "42 Something St", city: "Somewhere City" },
        }),
      );

      const response = await entity.handleCommand("ChangeAddress", {
        customerId: "abc123",
        newAddress: { street: "123 Awesome Street", city: "New City" },
      });

      expect(response).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(
        CustomerState.create({
          customerId: "abc123",
          email: "foo@example.com",
          name: "Foo Bar",
          address: { street: "123 Awesome Street", city: "New City" },
        }),
      );
    });

    it("should fail to change the address of a non-existing customer", async () => {
      const entity = new MockValueEntity(customer, entityId);

      const response = await entity.handleCommand("ChangeAddress", {
        customerId: "abc123",
        newAddress: { street: "123 Awesome Street", city: "New City" },
      });

      expect(response).to.be.undefined;
      expect(entity.error).to.be.equal("Customer must be created before address can be changed.");
      expect(entity.state).to.deep.equal(CustomerState.create({}));
    });
  });
});
