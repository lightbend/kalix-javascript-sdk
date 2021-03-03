/*
 * Copyright 2021 Lightbend Inc.
 */

const AkkaServerless = require("@lightbend/akkaserverless-javascript-sdk").AkkaServerless;

const server = new AkkaServerless();
server.addEntity(require("./shoppingcart"));

server.start();
