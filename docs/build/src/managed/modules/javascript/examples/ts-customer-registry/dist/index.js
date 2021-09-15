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
const akkaserverless_javascript_sdk_1 = require("@lightbend/akkaserverless-javascript-sdk");
const customer_value_entity_1 = require("./customer-value-entity");
const customer_value_entity_view_1 = require("./customer-value-entity-view");
const customer_event_sourced_entity_1 = require("./customer-event-sourced-entity");
const customer_event_sourced_view_1 = require("./customer-event-sourced-view");
if (!process.argv || process.argv.length === 2) {
    // node file.js - 2 args means no extra arg
    console.log("Starting Value Entity");
    // tag::register[]
    new akkaserverless_javascript_sdk_1.AkkaServerless()
        .addComponent(customer_value_entity_1.default)
        .addComponent(customer_value_entity_view_1.default)
        .start();
    // end::register[]
}
else {
    console.log("Starting Event Sourced Entity");
    // tag::register-event-sourced[]
    new akkaserverless_javascript_sdk_1.AkkaServerless()
        .addComponent(customer_event_sourced_entity_1.default)
        .addComponent(customer_event_sourced_view_1.default)
        .start();
    // end::register-event-sourced[]
}
