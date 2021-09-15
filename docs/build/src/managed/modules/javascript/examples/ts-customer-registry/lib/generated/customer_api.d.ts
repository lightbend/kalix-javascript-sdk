import * as $protobuf from "protobufjs";
export namespace customer {

    namespace api {

        interface ICustomer {
            customerId?: (string|null);
            email?: (string|null);
            name?: (string|null);
            address?: (customer.api.IAddress|null);
        }

        class Customer implements ICustomer {
            constructor(properties?: customer.api.ICustomer);
            public customerId: string;
            public email: string;
            public name: string;
            public address?: (customer.api.IAddress|null);
            public static create(properties?: customer.api.ICustomer): customer.api.Customer;
        }

        interface IAddress {
            street?: (string|null);
            city?: (string|null);
        }

        class Address implements IAddress {
            constructor(properties?: customer.api.IAddress);
            public street: string;
            public city: string;
            public static create(properties?: customer.api.IAddress): customer.api.Address;
        }

        interface IGetCustomerRequest {
            customerId?: (string|null);
        }

        class GetCustomerRequest implements IGetCustomerRequest {
            constructor(properties?: customer.api.IGetCustomerRequest);
            public customerId: string;
            public static create(properties?: customer.api.IGetCustomerRequest): customer.api.GetCustomerRequest;
        }

        interface IChangeNameRequest {
            customerId?: (string|null);
            newName?: (string|null);
        }

        class ChangeNameRequest implements IChangeNameRequest {
            constructor(properties?: customer.api.IChangeNameRequest);
            public customerId: string;
            public newName: string;
            public static create(properties?: customer.api.IChangeNameRequest): customer.api.ChangeNameRequest;
        }

        interface IChangeAddressRequest {
            customerId?: (string|null);
            newAddress?: (customer.api.IAddress|null);
        }

        class ChangeAddressRequest implements IChangeAddressRequest {
            constructor(properties?: customer.api.IChangeAddressRequest);
            public customerId: string;
            public newAddress?: (customer.api.IAddress|null);
            public static create(properties?: customer.api.IChangeAddressRequest): customer.api.ChangeAddressRequest;
        }

        class CustomerService extends $protobuf.rpc.Service {
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): CustomerService;
            public create(request: customer.api.ICustomer, callback: customer.api.CustomerService.CreateCallback): void;
            public create(request: customer.api.ICustomer): Promise<google.protobuf.Empty>;
            public changeName(request: customer.api.IChangeNameRequest, callback: customer.api.CustomerService.ChangeNameCallback): void;
            public changeName(request: customer.api.IChangeNameRequest): Promise<google.protobuf.Empty>;
            public changeAddress(request: customer.api.IChangeAddressRequest, callback: customer.api.CustomerService.ChangeAddressCallback): void;
            public changeAddress(request: customer.api.IChangeAddressRequest): Promise<google.protobuf.Empty>;
            public getCustomer(request: customer.api.IGetCustomerRequest, callback: customer.api.CustomerService.GetCustomerCallback): void;
            public getCustomer(request: customer.api.IGetCustomerRequest): Promise<customer.api.Customer>;
        }

        namespace CustomerService {

            type CreateCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

            type ChangeNameCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

            type ChangeAddressCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

            type GetCustomerCallback = (error: (Error|null), response?: customer.api.Customer) => void;
        }
    }
}

export namespace google {

    namespace protobuf {

        interface IEmpty {
        }

        class Empty implements IEmpty {
            constructor(properties?: google.protobuf.IEmpty);
            public static create(properties?: google.protobuf.IEmpty): google.protobuf.Empty;
        }
    }
}
