/*
 * Copyright 2019 Lightbend Inc.
 */

const View = require("@lightbend/akkaserverless-javascript-sdk").View;

const entity = new View(
  ["users.proto"],
  "example.users.UsersByEmail",
  {
    viewId: "users-by-email"
  }
);

module.exports = entity;
