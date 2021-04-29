/*
 * Copyright 2021 Lightbend Inc.
 */

const AkkaServerless = require("@lightbend/akkaserverless-javascript-sdk").AkkaServerless

const server = new AkkaServerless();
if (!process.argv || process.argv.length === 2) { // node file.js - 2 args means no extra arg
  console.log("Starting Value Entity")
  server.addComponent(require("./customer-value-entity"))
  server.addComponent(require("./customer-value-entity-view"))
} else {
  console.log("Starting Event Sourced Entity")
  server.addComponent(require("./customer-event-sourced-entity"))
  server.addComponent(require("./customer-event-sourced-view"))
}
server.start()
