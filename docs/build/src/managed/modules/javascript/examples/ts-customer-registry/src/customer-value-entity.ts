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
import { customer as customerApi, google } from "../lib/generated/customer_api";
import { customer as customerDomain } from "../lib/generated/customer_domain";

type Context = ValueEntity.CommandContext<State>;

type State = customerDomain.domain.ICustomerState & protobuf.Message;

type Customer = customerApi.api.Customer;
type ChangeNameRequest = customerApi.api.ChangeNameRequest;
type ChangeAddressRequest = customerApi.api.ChangeAddressRequest;
type GetCustomerRequest = customerApi.api.GetCustomerRequest;

type Empty = google.protobuf.Empty;

const entity: ValueEntity<State> = new ValueEntity(
  ["customer_api.proto", "customer_domain.proto"],
  "customer.api.CustomerService",
  "customers"
);

const domainPkg = "customer.domain.";
const domain = {
  CustomerState: entity.lookupType(domainPkg + "CustomerState"),
  Address: entity.lookupType(domainPkg + "Address")
};

const api = {
  Customer: customerApi.api.Customer
};

entity.setInitial(customerId =>
  domain.CustomerState.create({ customerId: customerId })
);

entity.setCommandHandlers({
  Create: create,
  ChangeName: changeName,
  ChangeAddress: changeAddress,
  GetCustomer: getCustomer
});

function create(
  customerRequest: Customer,
  customer: State,
  ctx: Context
): Reply<Empty> {
  const domainCustomer = apiCustomerToCustomerState(customerRequest);
  ctx.updateState(domainCustomer);
  return Reply.message({});
}

function changeName(
  changeNameRequest: ChangeNameRequest,
  customer: State,
  ctx: Context
): Reply<Empty> {
  if (!customer.name && !customer.email) {
    return Reply.failure(
      "Customer must be created before name can be changed."
    );
  } else {
    customer.name = changeNameRequest.newName;
    ctx.updateState(customer);
    return Reply.message({});
  }
}

function changeAddress(
  changeAddressRequest: ChangeAddressRequest,
  customer: State,
  ctx: Context
): Reply<Empty> {
  if (!customer.name) {
    return Reply.failure(
      "Customer must be created before address can be changed."
    );
  } else {
    customer.address = changeAddressRequest.newAddress;
    ctx.updateState(customer);
    return Reply.message({});
  }
}

function getCustomer(
  getCustomerRequest: GetCustomerRequest,
  state: State
): Reply<Customer> {
  const apiCustomer = customerStateToApiCustomer(state);
  return Reply.message(apiCustomer);
}

function apiCustomerToCustomerState(apiCustomer: Customer) {
  // right now these two have the same fields so conversion is easy
  return domain.CustomerState.create(apiCustomer);
}

function customerStateToApiCustomer(customer: State) {
  // right now these two have the same fields so conversion is easy
  return api.Customer.create(customer);
}

export default entity;
