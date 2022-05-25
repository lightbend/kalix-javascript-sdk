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

const EventSourcedEntity = require("@kalix-io/sdk").EventSourcedEntity;
const { replies } = require("@kalix-io/sdk");

const entity = new EventSourcedEntity(
  ["customer_api.proto", "customer_domain.proto"],
  "customer.api.CustomerService",
  "customers"
);

const domainPkg = "customer.domain.";
const domain = {
  CustomerState: entity.lookupType(domainPkg + "CustomerState"),
  CustomerCreated: entity.lookupType(domainPkg + "CustomerCreated"),
  CustomerNameChanged: entity.lookupType(domainPkg + "CustomerNameChanged"),
  CustomerAddressChanged: entity.lookupType(domainPkg + "CustomerAddressChanged")
}
const apiPkg = "customer.api."
const api = {
  Customer: entity.lookupType(apiPkg + "Customer")
}

entity.setInitial(customerId => domain.CustomerState.create({ customerId: customerId }));

entity.setBehavior(state => {
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


function create(customer, customerState, ctx) {
  let domainCustomer = apiCustomerToCustomerState(customer)
  ctx.emit(domain.CustomerCreated.create({customer: domainCustomer}))
  return replies.emptyReply()
}

function changeName(changeNameRequest, customerState, ctx) {
  if (!customerState.name && !customer.email) {
    return replies.failure("Customer must be created before name can be changed.")
  } else {
    ctx.emit(domain.CustomerNameChanged.create({ newName: changeNameRequest.newName }))
    return replies.emptyReply()
  }
}

function changeAddress(changeAddressRequest, customerState, ctx) {
  if (!customerState.address) {
    return replies.failure("Customer must be created before address can be changed.")
  } else {
    ctx.emit(domain.CustomerAddressChanged.create({ newAddress: changeAddressRequest.newAddress }))
    return replies.emptyReply()
  }
}

function getCustomer(request, state, ctx) {
  let apiCustomer = customerStateToApiCustomer(state)
  return replies.message(apiCustomer)
}

function customerCreated(event, customer) {
  return event.customer
}

function nameChanged(event, customer) {
  customer.name = event.newName
  return customer
}

function addressChanged(event, customer) {
  customer.address = event.newAddress
  return customer
}

function apiCustomerToCustomerState(apiCustomer) {
  // right now these two have the same fields so conversion is easy
  return domain.CustomerState.create(apiCustomer)
}

function customerStateToApiCustomer(customerState) {
  // right now these two have the same fields so conversion is easy
  return api.Customer.create(customerState)
}

module.exports = entity;

