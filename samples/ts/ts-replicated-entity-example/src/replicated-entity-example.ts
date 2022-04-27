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

import {
  replicatedentity,
  replies
} from "@kalix-io/kalix-javascript-sdk";
import * as proto from "../lib/generated/proto";

type UpdateCounter = proto.com.example.replicatedentity.UpdateCounter;
type Get = proto.com.example.replicatedentity.Get;
type MutateSet = proto.com.example.replicatedentity.MutateSet;

type ContextSet = replicatedentity.ReplicatedEntityCommandContext & {
  state: replicatedentity.ReplicatedSet;
};

type ContextCounter = replicatedentity.ReplicatedEntityCommandContext & {
  state: replicatedentity.ReplicatedCounter;
};

const entity: replicatedentity.ReplicatedEntity =
  new replicatedentity.ReplicatedEntity(
    "replicated_entity_example.proto",
    "com.example.replicatedentity.ReplicatedEntityExample",
    "replicated-entity-example"
  );

entity.commandHandlers = {
  // @ts-ignore
  UpdateReplicatedCounter: updateReplicatedCounter,
  // @ts-ignore
  GetReplicatedCounter: getReplicatedCounter,
  // @ts-ignore
  MutateReplicatedSet: mutateReplicatedSet,
  // @ts-ignore
  GetReplicatedSet: getReplicatedSet
};

function updateReplicatedCounter(
  update: UpdateCounter,
  ctx: ContextCounter
): replies.Reply {
  if (ctx.state === null) {
    ctx.state = new replicatedentity.ReplicatedCounter();
  }

  if (update.value !== 0) {
    ctx.state.increment(update.value);
  }
  return replies.message({
    value: ctx.state.value
  });
}

function getReplicatedCounter(get: Get, ctx: ContextCounter): replies.Reply {
  if (ctx.state === null) {
    ctx.state = new replicatedentity.ReplicatedCounter();
  }

  return replies.message({
    value: ctx.state.value
  });
}

function mutateReplicatedSet(
  mutate: MutateSet,
  ctx: ContextSet
): replies.Reply {
  if (ctx.state === null) {
    ctx.state = new replicatedentity.ReplicatedSet();
  }

  if (mutate.clear) {
    ctx.state.clear();
  }
  mutate.remove.forEach(value => {
    ctx.state.delete(value);
  });
  mutate.add.forEach(value => {
    ctx.state.add(value);
  });

  return replies.message({
    size: ctx.state.size
  });
}

function getReplicatedSet(get: Get, ctx: ContextSet): replies.Reply {
  if (ctx.state === null) {
    ctx.state = new replicatedentity.ReplicatedSet();
  }

  return replies.message({
    items: Array.from(ctx.state)
  });
}

export default entity;
