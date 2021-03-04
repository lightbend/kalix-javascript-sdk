/*
 * Copyright 2019 Lightbend Inc.
 */

/**
 * The AkkaServerless module.
 *
 * @module akkaserverless
 */

module.exports.AkkaServerless = require("./src/akkaserverless");
module.exports.EventSourced = require("./src/eventsourced");
module.exports.ValueEntity = require("./src/value-entity")
module.exports.crdt = require("./src/crdt");
module.exports.Action = require("./src/action");
module.exports.Metadata = require("./src/metadata");
module.exports.IntegrationTestkit = require("./src/integration-testkit");
