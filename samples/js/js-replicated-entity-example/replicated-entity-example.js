/*
 * Copyright 2021 Lightbend Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const replicatedentity = require("@kalix-io/sdk").replicatedentity;

const entity = new replicatedentity.ReplicatedEntity(
  "replicated_entity_example.proto",
  "com.example.replicatedentity.ReplicatedEntityExample",
  "replicated-entity-example"
);

entity.commandHandlers = {
  UpdateReplicatedCounter: updateReplicatedCounter,
  GetReplicatedCounter: getReplicatedCounter,
  MutateReplicatedSet: mutateReplicatedSet,
  GetReplicatedSet: getReplicatedSet
};

function updateReplicatedCounter(update, ctx) {
  if (ctx.state === null) {
    ctx.state = new replicatedentity.ReplicatedCounter();
  }

  if (update.value !== 0) {
    ctx.state.increment(update.value);
  }
  return {
    value: ctx.state.value
  };
}

function getReplicatedCounter(get, ctx) {
  if (ctx.state === null) {
    ctx.state = new replicatedentity.ReplicatedCounter();
  }

  return {
    value: ctx.state.value
  };
}

function mutateReplicatedSet(update, ctx) {
  if (ctx.state === null) {
    ctx.state = new replicatedentity.ReplicatedSet();
  }

  if (update.clear) {
    ctx.state.clear();
  }
  update.remove.forEach(value => {
    ctx.state.delete(value);
  });
  update.add.forEach(value => {
    ctx.state.add(value);
  });

  return {
    size: ctx.state.size
  }
}

function getReplicatedSet(get, ctx) {
  if (ctx.state === null) {
    ctx.state = new replicatedentity.ReplicatedSet();
  }

  return {
    items: Array.from(ctx.state)
  };
}

// Export the entity
module.exports = entity;
