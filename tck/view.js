/*
 * Copyright 2019 Lightbend Inc.
 */

const View = require("@lightbend/akkaserverless-javascript-sdk").View

const tckModel = new View(
    "proto/view.proto",
    "akkaserverless.tck.model.view.ViewTckModel"
);

tckModel.setUpdateHandlers({
    "ProcessUpdateUnary": processUpdateUnary
})

function processUpdateUnary(userEvent, previousViewState, ctx) {
    if (userEvent.returnAsIs) {
        return {
            data: userEvent.returnAsIs.data
        }
    } else if (userEvent.uppercaseThis) {
        return {
            data: userEvent.uppercaseThis.data.toUpperCase()
        }
    } else if (userEvent.appendToExistingState) {
        return {
            data: previousViewState.data + userEvent.appendToExistingState.data
        }
    } else if (userEvent.fail) {
        throw Error("requested failure")
    } else {
        throw Error("Unexpected event type: " + JSON.stringify(userEvent))
    }
}

module.exports.tckModel = tckModel;
