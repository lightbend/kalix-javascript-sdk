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
const entity = new akkaserverless_javascript_sdk_1.ValueEntity(["customer_api.proto", "customer_domain.proto"], "customer.api.CustomerService", "customers");
const domainPkg = "customer.domain.";
const domain = {
    CustomerState: entity.lookupType(domainPkg + "CustomerState"),
    Address: entity.lookupType(domainPkg + "Address")
};
const apiPkg = "customer.api.";
const api = {
    Customer: entity.lookupType(apiPkg + "Customer")
};
entity.setInitial(customerId => domain.CustomerState.create({ customerId: customerId }));
entity.setCommandHandlers({
    Create: create,
    ChangeName: changeName,
    ChangeAddress: changeAddress,
    GetCustomer: getCustomer
});
function create(customerRequest, customer, ctx) {
    const domainCustomer = apiCustomerToCustomerState(customerRequest);
    ctx.updateState(domainCustomer);
    return akkaserverless_javascript_sdk_1.replies.message({});
}
function changeName(changeNameRequest, customer, ctx) {
    if (!customer.name && !customer.email) {
        return akkaserverless_javascript_sdk_1.replies.failure("Customer must be created before name can be changed.");
    }
    else {
        customer.name = changeNameRequest.newName;
        ctx.updateState(customer);
        return akkaserverless_javascript_sdk_1.replies.message({});
    }
}
function changeAddress(changeAddressRequest, customer, ctx) {
    if (!customer.name) {
        return akkaserverless_javascript_sdk_1.replies.failure("Customer must be created before address can be changed.");
    }
    else {
        customer.address = changeAddressRequest.newAddress;
        ctx.updateState(customer);
        return akkaserverless_javascript_sdk_1.replies.message({});
    }
}
function getCustomer(getCustomerRequest, state) {
    const apiCustomer = customerStateToApiCustomer(state);
    return akkaserverless_javascript_sdk_1.replies.message(apiCustomer);
}
function apiCustomerToCustomerState(apiCustomer) {
    // right now these two have the same fields so conversion is easy
    return domain.CustomerState.create(apiCustomer);
}
function customerStateToApiCustomer(customer) {
    // right now these two have the same fields so conversion is easy
    return api.Customer.create(customer);
}
exports.default = entity;
