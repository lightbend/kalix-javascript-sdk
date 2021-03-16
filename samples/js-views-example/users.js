/*
 * Copyright 2019 Lightbend Inc.
 */

const EventSourced = require("@lightbend/akkaserverless-javascript-sdk").EventSourced;

const entity = new EventSourced(
  ["users.proto"],
  "example.users.Users",
  {
    entityType: "users"
  }
);

const pkg = "example.users.";
const User = entity.lookupType(pkg + "User");

entity.setInitial(userId => User.create({
  userId: userId,
}));

entity.setBehavior(user => {
  return {
    commandHandlers: {
      UpdateUser: updateUser,
      GetUser: getUser
    },
    eventHandlers: {
      User: userUpdated,
    }
  };
});

function updateUser(update, existing, ctx) {
  if (!update.userId) {
      update.userId = existing.userId;
  }

  if (update.userId !== existing.userId) {
    ctx.fail("Bad user id " + update.userId + " for user " + existing.userId);
  } else {
    ctx.emit(User.create(update));
    return {};
  }
}

function getUser(request, user) {
  return user;
}

function userUpdated(update, existing) {
  return update;
}

// Export the entity
module.exports = entity;
