/*
 * Copyright 2021 Lightbend Inc.
 */

const View = require("@lightbend/akkaserverless-javascript-sdk").View;

const view = new View(
  ["customer_view.proto", "customer_domain.proto"],
  "customer.view.CustomersResponseByName",
  {
    viewId: "customer-value-entity-view"
  }
);

module.exports = view;