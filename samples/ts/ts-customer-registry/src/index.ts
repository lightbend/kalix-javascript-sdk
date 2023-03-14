/*
 * Copyright 2021-2023 Lightbend Inc.
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

import { Kalix } from "@kalix-io/kalix-javascript-sdk";
import customerValueEntity from "./customer-value-entity";
import customerValueEntityView from "./customer-value-entity-view";
import customerEventSourcedEntity from "./customer-event-sourced-entity";
import customerEventSourcedEntityView from "./customer-event-sourced-view";

if (!process.argv || process.argv.length === 2) {
  // node file.js - 2 args means no extra arg
  console.log("Starting Value Entity");
  // tag::register[]
  new Kalix()
    .addComponent(customerValueEntity)
    .addComponent(customerValueEntityView)
    .start();
  // end::register[]
} else {
  console.log("Starting Event Sourced Entity");
  // tag::register-event-sourced[]
  new Kalix()
    .addComponent(customerEventSourcedEntity)
    .addComponent(customerEventSourcedEntityView)
    .start();
  // end::register-event-sourced[]
}
