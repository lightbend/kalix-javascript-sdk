/*
 * Copyright 2021 Lightbend Inc.
 */

const AkkaServerless = require("@lightbend/akkaserverless-javascript-sdk").AkkaServerless;

const server = new AkkaServerless();
server.addComponent(require("./users"));
server.addComponent(require("./users-by-email"));

server.start();
