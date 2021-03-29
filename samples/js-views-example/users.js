/*
 * Copyright 2019 Lightbend Inc.
 */

const ValueEntity = require("@lightbend/akkaserverless-javascript-sdk").ValueEntity;

const entity = new ValueEntity(
  ["users.proto"],
  "example.users.Users",
  {
    entityType: "users"
  }
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
