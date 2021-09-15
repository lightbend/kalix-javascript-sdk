import * as $protobuf from "protobufjs";
export namespace customer {

    namespace view {

        class CustomerByName extends $protobuf.rpc.Service {
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): CustomerByName;
            public updateCustomer(request: customer.domain.ICustomerState, callback: customer.view.CustomerByName.UpdateCustomerCallback): void;
            public updateCustomer(request: customer.domain.ICustomerState): Promise<customer.domain.CustomerState>;
            public getCustomers(request: customer.view.IByNameRequest, callback: customer.view.CustomerByName.GetCustomersCallback): void;
            public getCustomers(request: customer.view.IByNameRequest): Promise<customer.domain.CustomerState>;
        }

        namespace CustomerByName {

            type UpdateCustomerCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;

            type GetCustomersCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;
        }

        interface IByNameRequest {
            customerName?: (string|null);
        }

        class ByNameRequest implements IByNameRequest {
            constructor(properties?: customer.view.IByNameRequest);
            public customerName: string;
            public static create(properties?: customer.view.IByNameRequest): customer.view.ByNameRequest;
        }

        class CustomerByEmail extends $protobuf.rpc.Service {
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): CustomerByEmail;
            public updateCustomer(request: customer.domain.ICustomerState, callback: customer.view.CustomerByEmail.UpdateCustomerCallback): void;
            public updateCustomer(request: customer.domain.ICustomerState): Promise<customer.domain.CustomerState>;
            public getCustomer(request: customer.view.IByEmailRequest, callback: customer.view.CustomerByEmail.GetCustomerCallback): void;
            public getCustomer(request: customer.view.IByEmailRequest): Promise<customer.domain.CustomerState>;
        }

        namespace CustomerByEmail {

            type UpdateCustomerCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;

            type GetCustomerCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;
        }

        interface IByEmailRequest {
            email?: (string|null);
        }

        class ByEmailRequest implements IByEmailRequest {
            constructor(properties?: customer.view.IByEmailRequest);
            public email: string;
            public static create(properties?: customer.view.IByEmailRequest): customer.view.ByEmailRequest;
        }

        interface ICustomerSummary {
            id?: (string|null);
            name?: (string|null);
        }

        class CustomerSummary implements ICustomerSummary {
            constructor(properties?: customer.view.ICustomerSummary);
            public id: string;
            public name: string;
            public static create(properties?: customer.view.ICustomerSummary): customer.view.CustomerSummary;
        }

        class CustomerSummaryByName extends $protobuf.rpc.Service {
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): CustomerSummaryByName;
            public getCustomers(request: customer.view.IByNameRequest, callback: customer.view.CustomerSummaryByName.GetCustomersCallback): void;
            public getCustomers(request: customer.view.IByNameRequest): Promise<customer.view.CustomerSummary>;
            public updateCustomer(request: customer.domain.ICustomerState, callback: customer.view.CustomerSummaryByName.UpdateCustomerCallback): void;
            public updateCustomer(request: customer.domain.ICustomerState): Promise<customer.domain.CustomerState>;
        }

        namespace CustomerSummaryByName {

            type GetCustomersCallback = (error: (Error|null), response?: customer.view.CustomerSummary) => void;

            type UpdateCustomerCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;
        }

        interface ICustomersResponse {
            results?: (customer.domain.ICustomerState[]|null);
        }

        class CustomersResponse implements ICustomersResponse {
            constructor(properties?: customer.view.ICustomersResponse);
            public results: customer.domain.ICustomerState[];
            public static create(properties?: customer.view.ICustomersResponse): customer.view.CustomersResponse;
        }

        interface IAny {
            typeUrl?: (string|null);
            value?: (Uint8Array|null);
        }

        class Any implements IAny {
            constructor(properties?: customer.view.IAny);
            public typeUrl: string;
            public value: Uint8Array;
            public static create(properties?: customer.view.IAny): customer.view.Any;
        }

        class CustomersResponseByName extends $protobuf.rpc.Service {
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): CustomersResponseByName;
            public getCustomers(request: customer.view.IByNameRequest, callback: customer.view.CustomersResponseByName.GetCustomersCallback): void;
            public getCustomers(request: customer.view.IByNameRequest): Promise<customer.view.CustomersResponse>;
            public updateCustomer(request: customer.domain.ICustomerState, callback: customer.view.CustomersResponseByName.UpdateCustomerCallback): void;
            public updateCustomer(request: customer.domain.ICustomerState): Promise<customer.domain.CustomerState>;
        }

        namespace CustomersResponseByName {

            type GetCustomersCallback = (error: (Error|null), response?: customer.view.CustomersResponse) => void;

            type UpdateCustomerCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;
        }

        class CustomerByNameView extends $protobuf.rpc.Service {
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): CustomerByNameView;
            public processCustomerCreated(request: customer.domain.ICustomerCreated, callback: customer.view.CustomerByNameView.ProcessCustomerCreatedCallback): void;
            public processCustomerCreated(request: customer.domain.ICustomerCreated): Promise<customer.domain.CustomerState>;
            public processCustomerNameChanged(request: customer.domain.ICustomerNameChanged, callback: customer.view.CustomerByNameView.ProcessCustomerNameChangedCallback): void;
            public processCustomerNameChanged(request: customer.domain.ICustomerNameChanged): Promise<customer.domain.CustomerState>;
            public ignoreOtherEvents(request: customer.view.IAny, callback: customer.view.CustomerByNameView.IgnoreOtherEventsCallback): void;
            public ignoreOtherEvents(request: customer.view.IAny): Promise<customer.domain.CustomerState>;
            public getCustomers(request: customer.view.IByNameRequest, callback: customer.view.CustomerByNameView.GetCustomersCallback): void;
            public getCustomers(request: customer.view.IByNameRequest): Promise<customer.domain.CustomerState>;
        }

        namespace CustomerByNameView {

            type ProcessCustomerCreatedCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;

            type ProcessCustomerNameChangedCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;

            type IgnoreOtherEventsCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;

            type GetCustomersCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;
        }

        class CustomerByNameViewFromTopic extends $protobuf.rpc.Service {
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): CustomerByNameViewFromTopic;
            public processCustomerCreated(request: customer.domain.ICustomerCreated, callback: customer.view.CustomerByNameViewFromTopic.ProcessCustomerCreatedCallback): void;
            public processCustomerCreated(request: customer.domain.ICustomerCreated): Promise<customer.domain.CustomerState>;
            public processCustomerNameChanged(request: customer.domain.ICustomerNameChanged, callback: customer.view.CustomerByNameViewFromTopic.ProcessCustomerNameChangedCallback): void;
            public processCustomerNameChanged(request: customer.domain.ICustomerNameChanged): Promise<customer.domain.CustomerState>;
            public ignoreOtherEvents(request: customer.view.IAny, callback: customer.view.CustomerByNameViewFromTopic.IgnoreOtherEventsCallback): void;
            public ignoreOtherEvents(request: customer.view.IAny): Promise<customer.domain.CustomerState>;
            public getCustomers(request: customer.view.IByNameRequest, callback: customer.view.CustomerByNameViewFromTopic.GetCustomersCallback): void;
            public getCustomers(request: customer.view.IByNameRequest): Promise<customer.domain.CustomerState>;
        }

        namespace CustomerByNameViewFromTopic {

            type ProcessCustomerCreatedCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;

            type ProcessCustomerNameChangedCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;

            type IgnoreOtherEventsCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;

            type GetCustomersCallback = (error: (Error|null), response?: customer.domain.CustomerState) => void;
        }
    }

    namespace domain {

        interface ICustomerState {
            customerId?: (string|null);
            email?: (string|null);
            name?: (string|null);
            address?: (customer.domain.IAddress|null);
        }

        class CustomerState implements ICustomerState {
            constructor(properties?: customer.domain.ICustomerState);
            public customerId: string;
            public email: string;
            public name: string;
            public address?: (customer.domain.IAddress|null);
            public static create(properties?: customer.domain.ICustomerState): customer.domain.CustomerState;
        }

        interface IAddress {
            street?: (string|null);
            city?: (string|null);
        }

        class Address implements IAddress {
            constructor(properties?: customer.domain.IAddress);
            public street: string;
            public city: string;
            public static create(properties?: customer.domain.IAddress): customer.domain.Address;
        }

        interface ICustomerCreated {
            customer?: (customer.domain.ICustomerState|null);
        }

        class CustomerCreated implements ICustomerCreated {
            constructor(properties?: customer.domain.ICustomerCreated);
            public customer?: (customer.domain.ICustomerState|null);
            public static create(properties?: customer.domain.ICustomerCreated): customer.domain.CustomerCreated;
        }

        interface ICustomerNameChanged {
            newName?: (string|null);
        }

        class CustomerNameChanged implements ICustomerNameChanged {
            constructor(properties?: customer.domain.ICustomerNameChanged);
            public newName: string;
            public static create(properties?: customer.domain.ICustomerNameChanged): customer.domain.CustomerNameChanged;
        }

        interface ICustomerAddressChanged {
            newAddress?: (customer.domain.IAddress|null);
        }

        class CustomerAddressChanged implements ICustomerAddressChanged {
            constructor(properties?: customer.domain.ICustomerAddressChanged);
            public newAddress?: (customer.domain.IAddress|null);
            public static create(properties?: customer.domain.ICustomerAddressChanged): customer.domain.CustomerAddressChanged;
        }
    }
}
