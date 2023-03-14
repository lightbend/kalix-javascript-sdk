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

import { EventSourcedEntity, Reply } from "@kalix-io/kalix-javascript-sdk";
import { customer as customerApi, google } from "../lib/generated/customer_api";
import { customer as customerDomain } from "../lib/generated/customer_domain";

type Context = EventSourcedEntity.EventSourcedEntityCommandContext;

type State = customerDomain.domain.CustomerState;
type CustomerCreated = customerDomain.domain.CustomerCreated;
type CustomerNameChanged = customerDomain.domain.CustomerNameChanged;
type CustomerAddressChanged = customerDomain.domain.CustomerAddressChanged;

type Customer = customerApi.api.Customer;
type ChangeNameRequest = customerApi.api.ChangeNameRequest;
type ChangeAddressRequest = customerApi.api.ChangeAddressRequest;
type GetCustomerRequest = customerApi.api.GetCustomerRequest;

type Empty = google.protobuf.Empty;

const entity: EventSourcedEntity = new EventSourcedEntity(
  ["customer_api.proto", "customer_domain.proto"],
  "customer.api.CustomerService",
  "customers"
);

const domainPkg = "customer.domain.";
const domain = {
  CustomerState: entity.lookupType(domainPkg + "CustomerState"),
  CustomerCreated: entity.lookupType(domainPkg + "CustomerCreated"),
  CustomerNameChanged: entity.lookupType(domainPkg + "CustomerNameChanged"),
  CustomerAddressChanged: entity.lookupType(
    domainPkg + "CustomerAddressChanged"
  )
};

const api = {
  Customer: customerApi.api.Customer
};

entity.setInitial(customerId =>
  domain.CustomerState.create({ customerId: customerId })
);

entity.setBehavior((state: State) => {
  return {
    commandHandlers: {
      Create: create,
      ChangeName: changeName,
      ChangeAddress: changeAddress,
      GetCustomer: getCustomer
    },
    eventHandlers: {
      CustomerCreated: customerCreated,
      CustomerNameChanged: nameChanged,
      CustomerAddressChanged: addressChanged
    }
  };
});

function create(
  customerRequest: Customer,
  customer: State,
  ctx: Context
): Reply<Empty> {
  const domainCustomer = apiCustomerToCustomerState(customerRequest);
  ctx.emit(domain.CustomerCreated.create({ customer: domainCustomer }));
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
    ctx.emit(
      domain.CustomerNameChanged.create({ newName: changeNameRequest.newName })
    );
    return Reply.message({});
  }
}

function changeAddress(
  changeAddressRequest: ChangeAddressRequest,
  customer: State,
  ctx: Context
): Reply<Empty> {
  if (!customer.address) {
    return Reply.failure(
      "Customer must be created before address can be changed."
    );
  } else {
    ctx.emit(
      domain.CustomerAddressChanged.create({
        newAddress: changeAddressRequest.newAddress
      })
    );
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

function customerCreated(event: CustomerCreated): State {
  return customerDomain.domain.CustomerState.create(event.customer || {});
}

function nameChanged(event: CustomerNameChanged, customer: State): State {
  customer.name = event.newName;
  return customer;
}

function addressChanged(event: CustomerAddressChanged, customer: State): State {
  customer.address = event.newAddress;
  return customer;
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
