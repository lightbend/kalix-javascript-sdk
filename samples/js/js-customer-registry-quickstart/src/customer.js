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

import { ValueEntity, Reply } from "@kalix-io/kalix-javascript-sdk";

/**
 * Type definitions.
 * These types have been generated based on your proto source.
 * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
 *
 * CustomerService; a strongly typed extension of ValueEntity derived from your proto source
 * @typedef { import("../lib/generated/customer").CustomerService } CustomerService
 */

/**
 * @type CustomerService
 */
const entity = new ValueEntity(
  [
    "customer_api.proto",
    "customer_domain.proto",
    "kalix_policy.proto",
  ],
  "customer.api.CustomerService",
  "customers",
  {
    includeDirs: ["./proto"]
  }
);

const CustomerState = entity.lookupType("customer.domain.CustomerState");

entity.setInitial(entityId => CustomerState.create({}));

entity.setCommandHandlers({
  // tag::create[]
  Create(customer, _customerState, ctx) {
    // API and domain messages have the same fields so conversion is easy
    const customerState = CustomerState.create(customer);
    ctx.updateState(customerState);
    return Reply.message({});
  },
  // end::create[]

  // tag::getCustomer[]
  GetCustomer(getCustomerRequest, customerState) {
    if (!customerState.customerId) {
      const id = getCustomerRequest.customerId;
      return Reply.failure(`Customer ${id} has not been created.`);
    } else {
      // API and domain messages have the same fields so conversion is easy
      return Reply.message(customerState);
    }
  },
  // end::getCustomer[]

  ChangeName(changeNameRequest, customerState, ctx) {
    if (!customerState.name && !customerState.email) {
      return Reply.failure("Customer must be created before name can be changed.");
    } else {
      customerState.name = changeNameRequest.newName;
      ctx.updateState(customerState);
      return Reply.message({});
    }
  },

  ChangeAddress(changeAddressRequest, customerState, ctx) {
    if (!customerState.name) {
      return Reply.failure("Customer must be created before address can be changed.");
    } else {
      customerState.address = changeAddressRequest.newAddress;
      ctx.updateState(customerState);
      return Reply.message({});
    }
  },
});

export default entity;
