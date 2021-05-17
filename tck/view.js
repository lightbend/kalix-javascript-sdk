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
    } else if (userEvent.ignore) {
        return null; // or whatever falsy
    } else {
        throw Error("Unexpected event type: " + JSON.stringify(userEvent))
    }
}

module.exports.tckModel = tckModel;
