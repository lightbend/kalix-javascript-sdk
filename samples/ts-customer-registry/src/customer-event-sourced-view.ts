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

import { View } from "@lightbend/akkaserverless-javascript-sdk";
import { customer as customerDomain } from "../lib/generated/customer_domain";
import { customer as customerView } from "../lib/generated/customer_view"

type State                    = customerDomain.domain.CustomerState
type CustomerCreated          = customerDomain.domain.CustomerCreated
type CustomerNameChanged      = customerDomain.domain.CustomerNameChanged
type Any                      = customerView.view.Any

const view: View = new View(
  ["customer_view.proto", "customer_domain.proto"],
  "customer.view.CustomerByNameView", // or CustomerByNameViewFromTopic
  {
    viewId: "customer-event-sourced-view"
  }
);

const CustomerState = view.lookupType("customer.domain.CustomerState")

view.setUpdateHandlers({
  ProcessCustomerCreated: customerCreated,
  ProcessCustomerNameChanged: customerNameChanged,
  IgnoreOtherEvents: ignoreOtherEvents
});

function customerCreated(event: CustomerCreated, state: State) {
  if (state)
    return state // already created
  else
    return CustomerState.create(event.customer || {})
}

function customerNameChanged(event: CustomerNameChanged, state: State) {
  state.name = event.newName
  return state
}

function ignoreOtherEvents(event: Any, state: State) {
  return state
}

export default view;
