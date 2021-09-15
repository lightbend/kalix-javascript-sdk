import * as $protobuf from "protobufjs";
export namespace customer {

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
