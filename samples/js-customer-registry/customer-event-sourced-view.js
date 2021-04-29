/*
 * Copyright 2021 Lightbend Inc.
 */

const View = require("@lightbend/akkaserverless-javascript-sdk").View;

const view = new View(
  ["customer_view.proto", "customer_domain.proto"],
  "customer.view.CustomerByNameView", // or CustomerByNameViewFromTopic
  {
    viewId: "customer-event-sourced-view"
  }
);

view.setUpdateHandlers({
  ProcessCustomerCreated: customerCreated,
  ProcessCustomerNameChanged: customerNameChanged
});

function customerCreated(event, state, ctx) {
  if (state.id)
    return state // already created
  else
    return event.customer
}

function customerNameChanged(event, state, ctx) {
  state.name = event.newName
}

module.exports = view;