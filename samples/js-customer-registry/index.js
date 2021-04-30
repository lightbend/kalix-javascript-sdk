/*
 * Copyright 2021 Lightbend Inc.
 */

const AkkaServerless = require("@lightbend/akkaserverless-javascript-sdk").AkkaServerless

if (!process.argv || process.argv.length === 2) { // node file.js - 2 args means no extra arg
  console.log("Starting Value Entity")
  // tag::register[]
  const server = new AkkaServerless();
  server.addComponent(require("./customer-value-entity-view"))
  // end::register[]
  server.addComponent(require("./customer-value-entity"))
  server.start()
} else {
  console.log("Starting Event Sourced Entity")
  // tag::register-event-sourced[]
  const server = new AkkaServerless();
  server.addComponent(require("./customer-event-sourced-entity"))
  // end::register-event-sourced[]
  server.addComponent(require("./customer-event-sourced-view"))
  server.start()
}
