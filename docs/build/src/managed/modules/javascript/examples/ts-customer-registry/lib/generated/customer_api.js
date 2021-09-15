/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.customer = (function() {

    /**
     * Namespace customer.
     * @exports customer
     * @namespace
     */
    var customer = {};

    customer.api = (function() {

        /**
         * Namespace api.
         * @memberof customer
         * @namespace
         */
        var api = {};

        api.Customer = (function() {

            /**
             * Properties of a Customer.
             * @memberof customer.api
             * @interface ICustomer
             * @property {string|null} [customerId] Customer customerId
             * @property {string|null} [email] Customer email
             * @property {string|null} [name] Customer name
             * @property {customer.api.IAddress|null} [address] Customer address
             */

            /**
             * Constructs a new Customer.
             * @memberof customer.api
             * @classdesc Represents a Customer.
             * @implements ICustomer
             * @constructor
             * @param {customer.api.ICustomer=} [properties] Properties to set
             */
            function Customer(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Customer customerId.
             * @member {string} customerId
             * @memberof customer.api.Customer
             * @instance
             */
            Customer.prototype.customerId = "";

            /**
             * Customer email.
             * @member {string} email
             * @memberof customer.api.Customer
             * @instance
             */
            Customer.prototype.email = "";

            /**
             * Customer name.
             * @member {string} name
             * @memberof customer.api.Customer
             * @instance
             */
            Customer.prototype.name = "";

            /**
             * Customer address.
             * @member {customer.api.IAddress|null|undefined} address
             * @memberof customer.api.Customer
             * @instance
             */
            Customer.prototype.address = null;

            /**
             * Creates a new Customer instance using the specified properties.
             * @function create
             * @memberof customer.api.Customer
             * @static
             * @param {customer.api.ICustomer=} [properties] Properties to set
             * @returns {customer.api.Customer} Customer instance
             */
            Customer.create = function create(properties) {
                return new Customer(properties);
            };

            return Customer;
        })();

        api.Address = (function() {

            /**
             * Properties of an Address.
             * @memberof customer.api
             * @interface IAddress
             * @property {string|null} [street] Address street
             * @property {string|null} [city] Address city
             */

            /**
             * Constructs a new Address.
             * @memberof customer.api
             * @classdesc Represents an Address.
             * @implements IAddress
             * @constructor
             * @param {customer.api.IAddress=} [properties] Properties to set
             */
            function Address(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Address street.
             * @member {string} street
             * @memberof customer.api.Address
             * @instance
             */
            Address.prototype.street = "";

            /**
             * Address city.
             * @member {string} city
             * @memberof customer.api.Address
             * @instance
             */
            Address.prototype.city = "";

            /**
             * Creates a new Address instance using the specified properties.
             * @function create
             * @memberof customer.api.Address
             * @static
             * @param {customer.api.IAddress=} [properties] Properties to set
             * @returns {customer.api.Address} Address instance
             */
            Address.create = function create(properties) {
                return new Address(properties);
            };

            return Address;
        })();

        api.GetCustomerRequest = (function() {

            /**
             * Properties of a GetCustomerRequest.
             * @memberof customer.api
             * @interface IGetCustomerRequest
             * @property {string|null} [customerId] GetCustomerRequest customerId
             */

            /**
             * Constructs a new GetCustomerRequest.
             * @memberof customer.api
             * @classdesc Represents a GetCustomerRequest.
             * @implements IGetCustomerRequest
             * @constructor
             * @param {customer.api.IGetCustomerRequest=} [properties] Properties to set
             */
            function GetCustomerRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * GetCustomerRequest customerId.
             * @member {string} customerId
             * @memberof customer.api.GetCustomerRequest
             * @instance
             */
            GetCustomerRequest.prototype.customerId = "";

            /**
             * Creates a new GetCustomerRequest instance using the specified properties.
             * @function create
             * @memberof customer.api.GetCustomerRequest
             * @static
             * @param {customer.api.IGetCustomerRequest=} [properties] Properties to set
             * @returns {customer.api.GetCustomerRequest} GetCustomerRequest instance
             */
            GetCustomerRequest.create = function create(properties) {
                return new GetCustomerRequest(properties);
            };

            return GetCustomerRequest;
        })();

        api.ChangeNameRequest = (function() {

            /**
             * Properties of a ChangeNameRequest.
             * @memberof customer.api
             * @interface IChangeNameRequest
             * @property {string|null} [customerId] ChangeNameRequest customerId
             * @property {string|null} [newName] ChangeNameRequest newName
             */

            /**
             * Constructs a new ChangeNameRequest.
             * @memberof customer.api
             * @classdesc Represents a ChangeNameRequest.
             * @implements IChangeNameRequest
             * @constructor
             * @param {customer.api.IChangeNameRequest=} [properties] Properties to set
             */
            function ChangeNameRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ChangeNameRequest customerId.
             * @member {string} customerId
             * @memberof customer.api.ChangeNameRequest
             * @instance
             */
            ChangeNameRequest.prototype.customerId = "";

            /**
             * ChangeNameRequest newName.
             * @member {string} newName
             * @memberof customer.api.ChangeNameRequest
             * @instance
             */
            ChangeNameRequest.prototype.newName = "";

            /**
             * Creates a new ChangeNameRequest instance using the specified properties.
             * @function create
             * @memberof customer.api.ChangeNameRequest
             * @static
             * @param {customer.api.IChangeNameRequest=} [properties] Properties to set
             * @returns {customer.api.ChangeNameRequest} ChangeNameRequest instance
             */
            ChangeNameRequest.create = function create(properties) {
                return new ChangeNameRequest(properties);
            };

            return ChangeNameRequest;
        })();

        api.ChangeAddressRequest = (function() {

            /**
             * Properties of a ChangeAddressRequest.
             * @memberof customer.api
             * @interface IChangeAddressRequest
             * @property {string|null} [customerId] ChangeAddressRequest customerId
             * @property {customer.api.IAddress|null} [newAddress] ChangeAddressRequest newAddress
             */

            /**
             * Constructs a new ChangeAddressRequest.
             * @memberof customer.api
             * @classdesc Represents a ChangeAddressRequest.
             * @implements IChangeAddressRequest
             * @constructor
             * @param {customer.api.IChangeAddressRequest=} [properties] Properties to set
             */
            function ChangeAddressRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ChangeAddressRequest customerId.
             * @member {string} customerId
             * @memberof customer.api.ChangeAddressRequest
             * @instance
             */
            ChangeAddressRequest.prototype.customerId = "";

            /**
             * ChangeAddressRequest newAddress.
             * @member {customer.api.IAddress|null|undefined} newAddress
             * @memberof customer.api.ChangeAddressRequest
             * @instance
             */
            ChangeAddressRequest.prototype.newAddress = null;

            /**
             * Creates a new ChangeAddressRequest instance using the specified properties.
             * @function create
             * @memberof customer.api.ChangeAddressRequest
             * @static
             * @param {customer.api.IChangeAddressRequest=} [properties] Properties to set
             * @returns {customer.api.ChangeAddressRequest} ChangeAddressRequest instance
             */
            ChangeAddressRequest.create = function create(properties) {
                return new ChangeAddressRequest(properties);
            };

            return ChangeAddressRequest;
        })();

        api.CustomerService = (function() {

            /**
             * Constructs a new CustomerService service.
             * @memberof customer.api
             * @classdesc Represents a CustomerService
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function CustomerService(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (CustomerService.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = CustomerService;

            /**
             * Creates new CustomerService service using the specified rpc implementation.
             * @function create
             * @memberof customer.api.CustomerService
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {CustomerService} RPC service. Useful where requests and/or responses are streamed.
             */
            CustomerService.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link customer.api.CustomerService#create}.
             * @memberof customer.api.CustomerService
             * @typedef CreateCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {google.protobuf.Empty} [response] Empty
             */

            /**
             * Calls Create.
             * @function create
             * @memberof customer.api.CustomerService
             * @instance
             * @param {customer.api.ICustomer} request Customer message or plain object
             * @param {customer.api.CustomerService.CreateCallback} callback Node-style callback called with the error, if any, and Empty
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerService.prototype.create = function create(request, callback) {
                return this.rpcCall(create, $root.customer.api.Customer, $root.google.protobuf.Empty, request, callback);
            }, "name", { value: "Create" });

            /**
             * Calls Create.
             * @function create
             * @memberof customer.api.CustomerService
             * @instance
             * @param {customer.api.ICustomer} request Customer message or plain object
             * @returns {Promise<google.protobuf.Empty>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.api.CustomerService#changeName}.
             * @memberof customer.api.CustomerService
             * @typedef ChangeNameCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {google.protobuf.Empty} [response] Empty
             */

            /**
             * Calls ChangeName.
             * @function changeName
             * @memberof customer.api.CustomerService
             * @instance
             * @param {customer.api.IChangeNameRequest} request ChangeNameRequest message or plain object
             * @param {customer.api.CustomerService.ChangeNameCallback} callback Node-style callback called with the error, if any, and Empty
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerService.prototype.changeName = function changeName(request, callback) {
                return this.rpcCall(changeName, $root.customer.api.ChangeNameRequest, $root.google.protobuf.Empty, request, callback);
            }, "name", { value: "ChangeName" });

            /**
             * Calls ChangeName.
             * @function changeName
             * @memberof customer.api.CustomerService
             * @instance
             * @param {customer.api.IChangeNameRequest} request ChangeNameRequest message or plain object
             * @returns {Promise<google.protobuf.Empty>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.api.CustomerService#changeAddress}.
             * @memberof customer.api.CustomerService
             * @typedef ChangeAddressCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {google.protobuf.Empty} [response] Empty
             */

            /**
             * Calls ChangeAddress.
             * @function changeAddress
             * @memberof customer.api.CustomerService
             * @instance
             * @param {customer.api.IChangeAddressRequest} request ChangeAddressRequest message or plain object
             * @param {customer.api.CustomerService.ChangeAddressCallback} callback Node-style callback called with the error, if any, and Empty
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerService.prototype.changeAddress = function changeAddress(request, callback) {
                return this.rpcCall(changeAddress, $root.customer.api.ChangeAddressRequest, $root.google.protobuf.Empty, request, callback);
            }, "name", { value: "ChangeAddress" });

            /**
             * Calls ChangeAddress.
             * @function changeAddress
             * @memberof customer.api.CustomerService
             * @instance
             * @param {customer.api.IChangeAddressRequest} request ChangeAddressRequest message or plain object
             * @returns {Promise<google.protobuf.Empty>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.api.CustomerService#getCustomer}.
             * @memberof customer.api.CustomerService
             * @typedef GetCustomerCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.api.Customer} [response] Customer
             */

            /**
             * Calls GetCustomer.
             * @function getCustomer
             * @memberof customer.api.CustomerService
             * @instance
             * @param {customer.api.IGetCustomerRequest} request GetCustomerRequest message or plain object
             * @param {customer.api.CustomerService.GetCustomerCallback} callback Node-style callback called with the error, if any, and Customer
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerService.prototype.getCustomer = function getCustomer(request, callback) {
                return this.rpcCall(getCustomer, $root.customer.api.GetCustomerRequest, $root.customer.api.Customer, request, callback);
            }, "name", { value: "GetCustomer" });

            /**
             * Calls GetCustomer.
             * @function getCustomer
             * @memberof customer.api.CustomerService
             * @instance
             * @param {customer.api.IGetCustomerRequest} request GetCustomerRequest message or plain object
             * @returns {Promise<customer.api.Customer>} Promise
             * @variation 2
             */

            return CustomerService;
        })();

        return api;
    })();

    return customer;
})();

$root.google = (function() {

    /**
     * Namespace google.
     * @exports google
     * @namespace
     */
    var google = {};

    google.protobuf = (function() {

        /**
         * Namespace protobuf.
         * @memberof google
         * @namespace
         */
        var protobuf = {};

        protobuf.Empty = (function() {

            /**
             * Properties of an Empty.
             * @memberof google.protobuf
             * @interface IEmpty
             */

            /**
             * Constructs a new Empty.
             * @memberof google.protobuf
             * @classdesc Represents an Empty.
             * @implements IEmpty
             * @constructor
             * @param {google.protobuf.IEmpty=} [properties] Properties to set
             */
            function Empty(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new Empty instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Empty
             * @static
             * @param {google.protobuf.IEmpty=} [properties] Properties to set
             * @returns {google.protobuf.Empty} Empty instance
             */
            Empty.create = function create(properties) {
                return new Empty(properties);
            };

            return Empty;
        })();

        return protobuf;
    })();

    return google;
})();

module.exports = $root;
