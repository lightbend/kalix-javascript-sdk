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
const customer_domain_1 = require("../lib/generated/customer_domain");
const entity = new akkaserverless_javascript_sdk_1.EventSourcedEntity(["customer_api.proto", "customer_domain.proto"], "customer.api.CustomerService", "customers");
const domainPkg = "customer.domain.";
const domain = {
    CustomerState: entity.lookupType(domainPkg + "CustomerState"),
    CustomerCreated: entity.lookupType(domainPkg + "CustomerCreated"),
    CustomerNameChanged: entity.lookupType(domainPkg + "CustomerNameChanged"),
    CustomerAddressChanged: entity.lookupType(domainPkg + "CustomerAddressChanged")
};
const apiPkg = "customer.api.";
const api = {
    Customer: entity.lookupType(apiPkg + "Customer")
};
entity.setInitial(customerId => domain.CustomerState.create({ customerId: customerId }));
entity.setBehavior((state) => {
    return {
        commandHandlers: {
            Create: create,
            ChangeName: changeName,
            ChangeAddress: changeAddress,
            GetCustomer: getCustomer
        },
        eventHandlers: {
            CustomerCreated: customerCreated,
            CustomerNameChanged: nameChanged,
            CustomerAddressChanged: addressChanged
        }
    };
});
function create(customerRequest, customer, ctx) {
    const domainCustomer = apiCustomerToCustomerState(customerRequest);
    ctx.emit(domain.CustomerCreated.create({ customer: domainCustomer }));
    return akkaserverless_javascript_sdk_1.replies.message({});
}
function changeName(changeNameRequest, customer, ctx) {
    if (!customer.name && !customer.email) {
        return akkaserverless_javascript_sdk_1.replies.failure("Customer must be created before name can be changed.");
    }
    else {
        ctx.emit(domain.CustomerNameChanged.create({ newName: changeNameRequest.newName }));
        return akkaserverless_javascript_sdk_1.replies.message({});
    }
}
function changeAddress(changeAddressRequest, customer, ctx) {
    if (!customer.address) {
        return akkaserverless_javascript_sdk_1.replies.failure("Customer must be created before address can be changed.");
    }
    else {
        ctx.emit(domain.CustomerAddressChanged.create({
            newAddress: changeAddressRequest.newAddress
        }));
        return akkaserverless_javascript_sdk_1.replies.message({});
    }
}
function getCustomer(getCustomerRequest, state) {
    const apiCustomer = customerStateToApiCustomer(state);
    return akkaserverless_javascript_sdk_1.replies.message(apiCustomer);
}
function customerCreated(event) {
    return customer_domain_1.customer.domain.CustomerState.create(event.customer || {});
}
function nameChanged(event, customer) {
    customer.name = event.newName;
    return customer;
}
function addressChanged(event, customer) {
    customer.address = event.newAddress;
    return customer;
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
