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

const ValueEntity = require("@kalix-io/sdk").ValueEntity;

const entity = new ValueEntity(
  ["users.proto"],
  "example.users.Users",
  "users"
);

const pkg = "example.users.";
const User = entity.lookupType(pkg + "User");

entity.initial = (entityId) => User.create({userId: entityId});

entity.commandHandlers = {
  UpdateUser: updateUser,
  GetUser: getUser
}

function updateUser(update, state, ctx) {
  update.userId = ctx.entityId;
  ctx.updateState(User.create(update));
  return {};
}

function getUser(request, user) {
  return user;
}

// Export the entity
module.exports = entity;
