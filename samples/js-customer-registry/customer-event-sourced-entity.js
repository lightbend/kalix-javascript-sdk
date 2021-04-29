/*
 * Copyright 2021 Lightbend Inc.
 */

const EventSourcedEntity = require("@lightbend/akkaserverless-javascript-sdk").EventSourcedEntity;
const replies = require("@lightbend/akkaserverless-javascript-sdk").replies;

const entity = new EventSourcedEntity(
  ["customer_api.proto", "customer_domain.proto"],
  "customer.api.CustomerService",
  "customers"
);

const domainPkg = "customer.domain.";
const domain = {
  CustomerState: entity.lookupType(domainPkg + "CustomerState"),
  Address: entity.lookupType(domainPkg + "Address"),
  CustomerCreated: entity.lookupType(domainPkg + "CustomerCreated"),
  CustomerNameChanged: entity.lookupType(domainPkg + "CustomerNameChanged")
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
      GetCustomer: getCustomer
    },
    eventHandlers: {
      CustomerCreated: customerCreated,
      CustomerNameChanged: nameChanged
    }
  };
});


function create(customer, customerState, ctx) {
  let domainCustomer = apiCustomerToCustomerState(customer)
  ctx.emit(domain.CustomerCreated.create({customer: domainCustomer}))
  return replies.noReply()
}

function changeName(changeNameRequest, customerState, ctx) {
  if (!customerState.name && !customer.email) {
    return replies.failure("Customer must be created before name can be changed.")
  } else {
    ctx.emit(domain.CustomerNameChanged.create({ newName: changeNameRequest.newName }))
    return replies.noReply()
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


function apiCustomerToCustomerState(apiCustomer) {
  // right now these two have the same fields so conversion is easy
  return domain.CustomerState.create(apiCustomer)
}

function customerStateToApiCustomer(customerState) {
  // right now these two have the same fields so conversion is easy
  return api.Customer.create(customerState)
}

module.exports = entity;

