/*
 * Copyright 2019 Lightbend Inc.
 */

/**
 * The AkkaServerless module.
 *
 * @module akkaserverless
 */

module.exports.AkkaServerless = require("./src/akkaserverless");
module.exports.EventSourcedEntity = require("./src/event-sourced-entity");
module.exports.ValueEntity = require("./src/value-entity")
module.exports.ReplicatedEntity = require("./src/replicated-entity").ReplicatedEntity;
module.exports.ReplicatedData = require("./src/replicated-entity").ReplicatedData;
module.exports.Action = require("./src/action");
module.exports.Metadata = require("./src/metadata");
module.exports.IntegrationTestkit = require("./src/integration-testkit");
module.exports.View = require("./src/view");
