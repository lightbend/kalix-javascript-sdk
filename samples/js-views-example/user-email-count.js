/*
 * Copyright 2019 Lightbend Inc.
 */

const View = require("@lightbend/akkaserverless-javascript-sdk").View;

const view = new View(
    ["users.proto"],
    "example.users.UserEmailCount",
    {
        viewId: "user-email-count"
    }
);

view.setUpdateHandlers({
    "UpdateUser": updateUser
});

function updateUser(userEvent, previousViewState, ctx) {
    console.log("Updating view for " + userEvent.userId + " with " + userEvent.emails.length + " email addresses, previous state: " + JSON.stringify(previousViewState))
    // object automagically turned into UserEmailCountState by sdk view logic
    return {
        "userId": userEvent.userId,
        "emailCount": userEvent.emails.length
    };
}

module.exports = view;