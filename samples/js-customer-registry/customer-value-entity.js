/*
 * Copyright 2021 Lightbend Inc.
 */

const ValueEntity = require("@lightbend/akkaserverless-javascript-sdk").ValueEntity;
const replies = require("@lightbend/akkaserverless-javascript-sdk").replies;

const entity = new ValueEntity(
  ["customer_api.proto", "customer_domain.proto"],
  "customer.api.CustomerService",
  "customers"
);

const domainPkg = "customer.domain.";
const domain = {
  CustomerState: entity.lookupType(domainPkg + "CustomerState"),
  Address: entity.lookupType(domainPkg + "Address"),
}
const apiPkg = "customer.api."
const api = {
  Customer: entity.lookupType(apiPkg + "Customer")
}

entity.setInitial(customerId => domain.CustomerState.create({ customerId: customerId }));

entity.setCommandHandlers({
  Create: create,
  ChangeName: changeName,
  GetCustomer: getCustomer
})

function create(customer, customerState, ctx) {
  let domainCustomer = apiCustomerToCustomerState(customer)
  ctx.updateState(domainCustomer)
  return replies.noReply()
}

function changeName(changeNameRequest, customerState, ctx) {
  if (!customerState.name && !customer.email) {
    return replies.failure("Customer must be created before name can be changed.")
  } else {
    customerState.name = changeNameRequest.newName
    ctx.updateState(customerState)
    return replies.noReply()
  }
}

function getCustomer(request, state, ctx) {
  let apiCustomer = customerStateToApiCustomer(state)
  return replies.message(apiCustomer)
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

