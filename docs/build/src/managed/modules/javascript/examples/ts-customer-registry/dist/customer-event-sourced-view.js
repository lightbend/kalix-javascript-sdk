"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
// tag::register[]
const akkaserverless_javascript_sdk_1 = require("@lightbend/akkaserverless-javascript-sdk");
const view = new akkaserverless_javascript_sdk_1.View(["customer_view.proto", "customer_domain.proto"], "customer.view.CustomerByNameView", // or CustomerByNameViewFromTopic
{
    viewId: "customer-event-sourced-view"
});
// tag::process-events[]
const CustomerState = view.lookupType("customer.domain.CustomerState");
view.setUpdateHandlers({
    ProcessCustomerCreated: customerCreated,
    ProcessCustomerNameChanged: customerNameChanged,
    IgnoreOtherEvents: ignoreOtherEvents
});
function customerCreated(event, state) {
    if (state)
        return state;
    // already created
    else
        return CustomerState.create(event.customer || {});
}
function customerNameChanged(event, state) {
    state.name = event.newName;
    return state;
}
function ignoreOtherEvents(event, state) {
    return state;
}
// end::process-events[]
// tag::register[]
exports.default = view;
// end::register[]
