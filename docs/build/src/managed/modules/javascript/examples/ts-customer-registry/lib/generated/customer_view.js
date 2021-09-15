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

    customer.view = (function() {

        /**
         * Namespace view.
         * @memberof customer
         * @namespace
         */
        var view = {};

        view.CustomerByName = (function() {

            /**
             * Constructs a new CustomerByName service.
             * @memberof customer.view
             * @classdesc Represents a CustomerByName
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function CustomerByName(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (CustomerByName.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = CustomerByName;

            /**
             * Creates new CustomerByName service using the specified rpc implementation.
             * @function create
             * @memberof customer.view.CustomerByName
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {CustomerByName} RPC service. Useful where requests and/or responses are streamed.
             */
            CustomerByName.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link customer.view.CustomerByName#updateCustomer}.
             * @memberof customer.view.CustomerByName
             * @typedef UpdateCustomerCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls UpdateCustomer.
             * @function updateCustomer
             * @memberof customer.view.CustomerByName
             * @instance
             * @param {customer.domain.ICustomerState} request CustomerState message or plain object
             * @param {customer.view.CustomerByName.UpdateCustomerCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByName.prototype.updateCustomer = function updateCustomer(request, callback) {
                return this.rpcCall(updateCustomer, $root.customer.domain.CustomerState, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "UpdateCustomer" });

            /**
             * Calls UpdateCustomer.
             * @function updateCustomer
             * @memberof customer.view.CustomerByName
             * @instance
             * @param {customer.domain.ICustomerState} request CustomerState message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerByName#getCustomers}.
             * @memberof customer.view.CustomerByName
             * @typedef GetCustomersCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomerByName
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @param {customer.view.CustomerByName.GetCustomersCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByName.prototype.getCustomers = function getCustomers(request, callback) {
                return this.rpcCall(getCustomers, $root.customer.view.ByNameRequest, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "GetCustomers" });

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomerByName
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            return CustomerByName;
        })();

        view.ByNameRequest = (function() {

            /**
             * Properties of a ByNameRequest.
             * @memberof customer.view
             * @interface IByNameRequest
             * @property {string|null} [customerName] ByNameRequest customerName
             */

            /**
             * Constructs a new ByNameRequest.
             * @memberof customer.view
             * @classdesc Represents a ByNameRequest.
             * @implements IByNameRequest
             * @constructor
             * @param {customer.view.IByNameRequest=} [properties] Properties to set
             */
            function ByNameRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ByNameRequest customerName.
             * @member {string} customerName
             * @memberof customer.view.ByNameRequest
             * @instance
             */
            ByNameRequest.prototype.customerName = "";

            /**
             * Creates a new ByNameRequest instance using the specified properties.
             * @function create
             * @memberof customer.view.ByNameRequest
             * @static
             * @param {customer.view.IByNameRequest=} [properties] Properties to set
             * @returns {customer.view.ByNameRequest} ByNameRequest instance
             */
            ByNameRequest.create = function create(properties) {
                return new ByNameRequest(properties);
            };

            return ByNameRequest;
        })();

        view.CustomerByEmail = (function() {

            /**
             * Constructs a new CustomerByEmail service.
             * @memberof customer.view
             * @classdesc Represents a CustomerByEmail
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function CustomerByEmail(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (CustomerByEmail.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = CustomerByEmail;

            /**
             * Creates new CustomerByEmail service using the specified rpc implementation.
             * @function create
             * @memberof customer.view.CustomerByEmail
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {CustomerByEmail} RPC service. Useful where requests and/or responses are streamed.
             */
            CustomerByEmail.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link customer.view.CustomerByEmail#updateCustomer}.
             * @memberof customer.view.CustomerByEmail
             * @typedef UpdateCustomerCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls UpdateCustomer.
             * @function updateCustomer
             * @memberof customer.view.CustomerByEmail
             * @instance
             * @param {customer.domain.ICustomerState} request CustomerState message or plain object
             * @param {customer.view.CustomerByEmail.UpdateCustomerCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByEmail.prototype.updateCustomer = function updateCustomer(request, callback) {
                return this.rpcCall(updateCustomer, $root.customer.domain.CustomerState, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "UpdateCustomer" });

            /**
             * Calls UpdateCustomer.
             * @function updateCustomer
             * @memberof customer.view.CustomerByEmail
             * @instance
             * @param {customer.domain.ICustomerState} request CustomerState message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerByEmail#getCustomer}.
             * @memberof customer.view.CustomerByEmail
             * @typedef GetCustomerCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls GetCustomer.
             * @function getCustomer
             * @memberof customer.view.CustomerByEmail
             * @instance
             * @param {customer.view.IByEmailRequest} request ByEmailRequest message or plain object
             * @param {customer.view.CustomerByEmail.GetCustomerCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByEmail.prototype.getCustomer = function getCustomer(request, callback) {
                return this.rpcCall(getCustomer, $root.customer.view.ByEmailRequest, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "GetCustomer" });

            /**
             * Calls GetCustomer.
             * @function getCustomer
             * @memberof customer.view.CustomerByEmail
             * @instance
             * @param {customer.view.IByEmailRequest} request ByEmailRequest message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            return CustomerByEmail;
        })();

        view.ByEmailRequest = (function() {

            /**
             * Properties of a ByEmailRequest.
             * @memberof customer.view
             * @interface IByEmailRequest
             * @property {string|null} [email] ByEmailRequest email
             */

            /**
             * Constructs a new ByEmailRequest.
             * @memberof customer.view
             * @classdesc Represents a ByEmailRequest.
             * @implements IByEmailRequest
             * @constructor
             * @param {customer.view.IByEmailRequest=} [properties] Properties to set
             */
            function ByEmailRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ByEmailRequest email.
             * @member {string} email
             * @memberof customer.view.ByEmailRequest
             * @instance
             */
            ByEmailRequest.prototype.email = "";

            /**
             * Creates a new ByEmailRequest instance using the specified properties.
             * @function create
             * @memberof customer.view.ByEmailRequest
             * @static
             * @param {customer.view.IByEmailRequest=} [properties] Properties to set
             * @returns {customer.view.ByEmailRequest} ByEmailRequest instance
             */
            ByEmailRequest.create = function create(properties) {
                return new ByEmailRequest(properties);
            };

            return ByEmailRequest;
        })();

        view.CustomerSummary = (function() {

            /**
             * Properties of a CustomerSummary.
             * @memberof customer.view
             * @interface ICustomerSummary
             * @property {string|null} [id] CustomerSummary id
             * @property {string|null} [name] CustomerSummary name
             */

            /**
             * Constructs a new CustomerSummary.
             * @memberof customer.view
             * @classdesc Represents a CustomerSummary.
             * @implements ICustomerSummary
             * @constructor
             * @param {customer.view.ICustomerSummary=} [properties] Properties to set
             */
            function CustomerSummary(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CustomerSummary id.
             * @member {string} id
             * @memberof customer.view.CustomerSummary
             * @instance
             */
            CustomerSummary.prototype.id = "";

            /**
             * CustomerSummary name.
             * @member {string} name
             * @memberof customer.view.CustomerSummary
             * @instance
             */
            CustomerSummary.prototype.name = "";

            /**
             * Creates a new CustomerSummary instance using the specified properties.
             * @function create
             * @memberof customer.view.CustomerSummary
             * @static
             * @param {customer.view.ICustomerSummary=} [properties] Properties to set
             * @returns {customer.view.CustomerSummary} CustomerSummary instance
             */
            CustomerSummary.create = function create(properties) {
                return new CustomerSummary(properties);
            };

            return CustomerSummary;
        })();

        view.CustomerSummaryByName = (function() {

            /**
             * Constructs a new CustomerSummaryByName service.
             * @memberof customer.view
             * @classdesc Represents a CustomerSummaryByName
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function CustomerSummaryByName(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (CustomerSummaryByName.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = CustomerSummaryByName;

            /**
             * Creates new CustomerSummaryByName service using the specified rpc implementation.
             * @function create
             * @memberof customer.view.CustomerSummaryByName
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {CustomerSummaryByName} RPC service. Useful where requests and/or responses are streamed.
             */
            CustomerSummaryByName.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link customer.view.CustomerSummaryByName#getCustomers}.
             * @memberof customer.view.CustomerSummaryByName
             * @typedef GetCustomersCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.view.CustomerSummary} [response] CustomerSummary
             */

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomerSummaryByName
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @param {customer.view.CustomerSummaryByName.GetCustomersCallback} callback Node-style callback called with the error, if any, and CustomerSummary
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerSummaryByName.prototype.getCustomers = function getCustomers(request, callback) {
                return this.rpcCall(getCustomers, $root.customer.view.ByNameRequest, $root.customer.view.CustomerSummary, request, callback);
            }, "name", { value: "GetCustomers" });

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomerSummaryByName
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @returns {Promise<customer.view.CustomerSummary>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerSummaryByName#updateCustomer}.
             * @memberof customer.view.CustomerSummaryByName
             * @typedef UpdateCustomerCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls UpdateCustomer.
             * @function updateCustomer
             * @memberof customer.view.CustomerSummaryByName
             * @instance
             * @param {customer.domain.ICustomerState} request CustomerState message or plain object
             * @param {customer.view.CustomerSummaryByName.UpdateCustomerCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerSummaryByName.prototype.updateCustomer = function updateCustomer(request, callback) {
                return this.rpcCall(updateCustomer, $root.customer.domain.CustomerState, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "UpdateCustomer" });

            /**
             * Calls UpdateCustomer.
             * @function updateCustomer
             * @memberof customer.view.CustomerSummaryByName
             * @instance
             * @param {customer.domain.ICustomerState} request CustomerState message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            return CustomerSummaryByName;
        })();

        view.CustomersResponse = (function() {

            /**
             * Properties of a CustomersResponse.
             * @memberof customer.view
             * @interface ICustomersResponse
             * @property {Array.<customer.domain.ICustomerState>|null} [results] CustomersResponse results
             */

            /**
             * Constructs a new CustomersResponse.
             * @memberof customer.view
             * @classdesc Represents a CustomersResponse.
             * @implements ICustomersResponse
             * @constructor
             * @param {customer.view.ICustomersResponse=} [properties] Properties to set
             */
            function CustomersResponse(properties) {
                this.results = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CustomersResponse results.
             * @member {Array.<customer.domain.ICustomerState>} results
             * @memberof customer.view.CustomersResponse
             * @instance
             */
            CustomersResponse.prototype.results = $util.emptyArray;

            /**
             * Creates a new CustomersResponse instance using the specified properties.
             * @function create
             * @memberof customer.view.CustomersResponse
             * @static
             * @param {customer.view.ICustomersResponse=} [properties] Properties to set
             * @returns {customer.view.CustomersResponse} CustomersResponse instance
             */
            CustomersResponse.create = function create(properties) {
                return new CustomersResponse(properties);
            };

            return CustomersResponse;
        })();

        view.Any = (function() {

            /**
             * Properties of an Any.
             * @memberof customer.view
             * @interface IAny
             * @property {string|null} [typeUrl] Any typeUrl
             * @property {Uint8Array|null} [value] Any value
             */

            /**
             * Constructs a new Any.
             * @memberof customer.view
             * @classdesc Represents an Any.
             * @implements IAny
             * @constructor
             * @param {customer.view.IAny=} [properties] Properties to set
             */
            function Any(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Any typeUrl.
             * @member {string} typeUrl
             * @memberof customer.view.Any
             * @instance
             */
            Any.prototype.typeUrl = "";

            /**
             * Any value.
             * @member {Uint8Array} value
             * @memberof customer.view.Any
             * @instance
             */
            Any.prototype.value = $util.newBuffer([]);

            /**
             * Creates a new Any instance using the specified properties.
             * @function create
             * @memberof customer.view.Any
             * @static
             * @param {customer.view.IAny=} [properties] Properties to set
             * @returns {customer.view.Any} Any instance
             */
            Any.create = function create(properties) {
                return new Any(properties);
            };

            return Any;
        })();

        view.CustomersResponseByName = (function() {

            /**
             * Constructs a new CustomersResponseByName service.
             * @memberof customer.view
             * @classdesc Represents a CustomersResponseByName
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function CustomersResponseByName(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (CustomersResponseByName.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = CustomersResponseByName;

            /**
             * Creates new CustomersResponseByName service using the specified rpc implementation.
             * @function create
             * @memberof customer.view.CustomersResponseByName
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {CustomersResponseByName} RPC service. Useful where requests and/or responses are streamed.
             */
            CustomersResponseByName.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link customer.view.CustomersResponseByName#getCustomers}.
             * @memberof customer.view.CustomersResponseByName
             * @typedef GetCustomersCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.view.CustomersResponse} [response] CustomersResponse
             */

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomersResponseByName
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @param {customer.view.CustomersResponseByName.GetCustomersCallback} callback Node-style callback called with the error, if any, and CustomersResponse
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomersResponseByName.prototype.getCustomers = function getCustomers(request, callback) {
                return this.rpcCall(getCustomers, $root.customer.view.ByNameRequest, $root.customer.view.CustomersResponse, request, callback);
            }, "name", { value: "GetCustomers" });

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomersResponseByName
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @returns {Promise<customer.view.CustomersResponse>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomersResponseByName#updateCustomer}.
             * @memberof customer.view.CustomersResponseByName
             * @typedef UpdateCustomerCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls UpdateCustomer.
             * @function updateCustomer
             * @memberof customer.view.CustomersResponseByName
             * @instance
             * @param {customer.domain.ICustomerState} request CustomerState message or plain object
             * @param {customer.view.CustomersResponseByName.UpdateCustomerCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomersResponseByName.prototype.updateCustomer = function updateCustomer(request, callback) {
                return this.rpcCall(updateCustomer, $root.customer.domain.CustomerState, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "UpdateCustomer" });

            /**
             * Calls UpdateCustomer.
             * @function updateCustomer
             * @memberof customer.view.CustomersResponseByName
             * @instance
             * @param {customer.domain.ICustomerState} request CustomerState message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            return CustomersResponseByName;
        })();

        view.CustomerByNameView = (function() {

            /**
             * Constructs a new CustomerByNameView service.
             * @memberof customer.view
             * @classdesc Represents a CustomerByNameView
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function CustomerByNameView(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (CustomerByNameView.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = CustomerByNameView;

            /**
             * Creates new CustomerByNameView service using the specified rpc implementation.
             * @function create
             * @memberof customer.view.CustomerByNameView
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {CustomerByNameView} RPC service. Useful where requests and/or responses are streamed.
             */
            CustomerByNameView.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link customer.view.CustomerByNameView#processCustomerCreated}.
             * @memberof customer.view.CustomerByNameView
             * @typedef ProcessCustomerCreatedCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls ProcessCustomerCreated.
             * @function processCustomerCreated
             * @memberof customer.view.CustomerByNameView
             * @instance
             * @param {customer.domain.ICustomerCreated} request CustomerCreated message or plain object
             * @param {customer.view.CustomerByNameView.ProcessCustomerCreatedCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByNameView.prototype.processCustomerCreated = function processCustomerCreated(request, callback) {
                return this.rpcCall(processCustomerCreated, $root.customer.domain.CustomerCreated, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "ProcessCustomerCreated" });

            /**
             * Calls ProcessCustomerCreated.
             * @function processCustomerCreated
             * @memberof customer.view.CustomerByNameView
             * @instance
             * @param {customer.domain.ICustomerCreated} request CustomerCreated message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerByNameView#processCustomerNameChanged}.
             * @memberof customer.view.CustomerByNameView
             * @typedef ProcessCustomerNameChangedCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls ProcessCustomerNameChanged.
             * @function processCustomerNameChanged
             * @memberof customer.view.CustomerByNameView
             * @instance
             * @param {customer.domain.ICustomerNameChanged} request CustomerNameChanged message or plain object
             * @param {customer.view.CustomerByNameView.ProcessCustomerNameChangedCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByNameView.prototype.processCustomerNameChanged = function processCustomerNameChanged(request, callback) {
                return this.rpcCall(processCustomerNameChanged, $root.customer.domain.CustomerNameChanged, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "ProcessCustomerNameChanged" });

            /**
             * Calls ProcessCustomerNameChanged.
             * @function processCustomerNameChanged
             * @memberof customer.view.CustomerByNameView
             * @instance
             * @param {customer.domain.ICustomerNameChanged} request CustomerNameChanged message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerByNameView#ignoreOtherEvents}.
             * @memberof customer.view.CustomerByNameView
             * @typedef IgnoreOtherEventsCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls IgnoreOtherEvents.
             * @function ignoreOtherEvents
             * @memberof customer.view.CustomerByNameView
             * @instance
             * @param {customer.view.IAny} request Any message or plain object
             * @param {customer.view.CustomerByNameView.IgnoreOtherEventsCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByNameView.prototype.ignoreOtherEvents = function ignoreOtherEvents(request, callback) {
                return this.rpcCall(ignoreOtherEvents, $root.customer.view.Any, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "IgnoreOtherEvents" });

            /**
             * Calls IgnoreOtherEvents.
             * @function ignoreOtherEvents
             * @memberof customer.view.CustomerByNameView
             * @instance
             * @param {customer.view.IAny} request Any message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerByNameView#getCustomers}.
             * @memberof customer.view.CustomerByNameView
             * @typedef GetCustomersCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomerByNameView
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @param {customer.view.CustomerByNameView.GetCustomersCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByNameView.prototype.getCustomers = function getCustomers(request, callback) {
                return this.rpcCall(getCustomers, $root.customer.view.ByNameRequest, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "GetCustomers" });

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomerByNameView
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            return CustomerByNameView;
        })();

        view.CustomerByNameViewFromTopic = (function() {

            /**
             * Constructs a new CustomerByNameViewFromTopic service.
             * @memberof customer.view
             * @classdesc Represents a CustomerByNameViewFromTopic
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function CustomerByNameViewFromTopic(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (CustomerByNameViewFromTopic.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = CustomerByNameViewFromTopic;

            /**
             * Creates new CustomerByNameViewFromTopic service using the specified rpc implementation.
             * @function create
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {CustomerByNameViewFromTopic} RPC service. Useful where requests and/or responses are streamed.
             */
            CustomerByNameViewFromTopic.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link customer.view.CustomerByNameViewFromTopic#processCustomerCreated}.
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @typedef ProcessCustomerCreatedCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls ProcessCustomerCreated.
             * @function processCustomerCreated
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @instance
             * @param {customer.domain.ICustomerCreated} request CustomerCreated message or plain object
             * @param {customer.view.CustomerByNameViewFromTopic.ProcessCustomerCreatedCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByNameViewFromTopic.prototype.processCustomerCreated = function processCustomerCreated(request, callback) {
                return this.rpcCall(processCustomerCreated, $root.customer.domain.CustomerCreated, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "ProcessCustomerCreated" });

            /**
             * Calls ProcessCustomerCreated.
             * @function processCustomerCreated
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @instance
             * @param {customer.domain.ICustomerCreated} request CustomerCreated message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerByNameViewFromTopic#processCustomerNameChanged}.
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @typedef ProcessCustomerNameChangedCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls ProcessCustomerNameChanged.
             * @function processCustomerNameChanged
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @instance
             * @param {customer.domain.ICustomerNameChanged} request CustomerNameChanged message or plain object
             * @param {customer.view.CustomerByNameViewFromTopic.ProcessCustomerNameChangedCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByNameViewFromTopic.prototype.processCustomerNameChanged = function processCustomerNameChanged(request, callback) {
                return this.rpcCall(processCustomerNameChanged, $root.customer.domain.CustomerNameChanged, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "ProcessCustomerNameChanged" });

            /**
             * Calls ProcessCustomerNameChanged.
             * @function processCustomerNameChanged
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @instance
             * @param {customer.domain.ICustomerNameChanged} request CustomerNameChanged message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerByNameViewFromTopic#ignoreOtherEvents}.
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @typedef IgnoreOtherEventsCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls IgnoreOtherEvents.
             * @function ignoreOtherEvents
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @instance
             * @param {customer.view.IAny} request Any message or plain object
             * @param {customer.view.CustomerByNameViewFromTopic.IgnoreOtherEventsCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByNameViewFromTopic.prototype.ignoreOtherEvents = function ignoreOtherEvents(request, callback) {
                return this.rpcCall(ignoreOtherEvents, $root.customer.view.Any, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "IgnoreOtherEvents" });

            /**
             * Calls IgnoreOtherEvents.
             * @function ignoreOtherEvents
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @instance
             * @param {customer.view.IAny} request Any message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link customer.view.CustomerByNameViewFromTopic#getCustomers}.
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @typedef GetCustomersCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {customer.domain.CustomerState} [response] CustomerState
             */

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @param {customer.view.CustomerByNameViewFromTopic.GetCustomersCallback} callback Node-style callback called with the error, if any, and CustomerState
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CustomerByNameViewFromTopic.prototype.getCustomers = function getCustomers(request, callback) {
                return this.rpcCall(getCustomers, $root.customer.view.ByNameRequest, $root.customer.domain.CustomerState, request, callback);
            }, "name", { value: "GetCustomers" });

            /**
             * Calls GetCustomers.
             * @function getCustomers
             * @memberof customer.view.CustomerByNameViewFromTopic
             * @instance
             * @param {customer.view.IByNameRequest} request ByNameRequest message or plain object
             * @returns {Promise<customer.domain.CustomerState>} Promise
             * @variation 2
             */

            return CustomerByNameViewFromTopic;
        })();

        return view;
    })();

    customer.domain = (function() {

        /**
         * Namespace domain.
         * @memberof customer
         * @namespace
         */
        var domain = {};

        domain.CustomerState = (function() {

            /**
             * Properties of a CustomerState.
             * @memberof customer.domain
             * @interface ICustomerState
             * @property {string|null} [customerId] CustomerState customerId
             * @property {string|null} [email] CustomerState email
             * @property {string|null} [name] CustomerState name
             * @property {customer.domain.IAddress|null} [address] CustomerState address
             */

            /**
             * Constructs a new CustomerState.
             * @memberof customer.domain
             * @classdesc Represents a CustomerState.
             * @implements ICustomerState
             * @constructor
             * @param {customer.domain.ICustomerState=} [properties] Properties to set
             */
            function CustomerState(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CustomerState customerId.
             * @member {string} customerId
             * @memberof customer.domain.CustomerState
             * @instance
             */
            CustomerState.prototype.customerId = "";

            /**
             * CustomerState email.
             * @member {string} email
             * @memberof customer.domain.CustomerState
             * @instance
             */
            CustomerState.prototype.email = "";

            /**
             * CustomerState name.
             * @member {string} name
             * @memberof customer.domain.CustomerState
             * @instance
             */
            CustomerState.prototype.name = "";

            /**
             * CustomerState address.
             * @member {customer.domain.IAddress|null|undefined} address
             * @memberof customer.domain.CustomerState
             * @instance
             */
            CustomerState.prototype.address = null;

            /**
             * Creates a new CustomerState instance using the specified properties.
             * @function create
             * @memberof customer.domain.CustomerState
             * @static
             * @param {customer.domain.ICustomerState=} [properties] Properties to set
             * @returns {customer.domain.CustomerState} CustomerState instance
             */
            CustomerState.create = function create(properties) {
                return new CustomerState(properties);
            };

            return CustomerState;
        })();

        domain.Address = (function() {

            /**
             * Properties of an Address.
             * @memberof customer.domain
             * @interface IAddress
             * @property {string|null} [street] Address street
             * @property {string|null} [city] Address city
             */

            /**
             * Constructs a new Address.
             * @memberof customer.domain
             * @classdesc Represents an Address.
             * @implements IAddress
             * @constructor
             * @param {customer.domain.IAddress=} [properties] Properties to set
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
             * @memberof customer.domain.Address
             * @instance
             */
            Address.prototype.street = "";

            /**
             * Address city.
             * @member {string} city
             * @memberof customer.domain.Address
             * @instance
             */
            Address.prototype.city = "";

            /**
             * Creates a new Address instance using the specified properties.
             * @function create
             * @memberof customer.domain.Address
             * @static
             * @param {customer.domain.IAddress=} [properties] Properties to set
             * @returns {customer.domain.Address} Address instance
             */
            Address.create = function create(properties) {
                return new Address(properties);
            };

            return Address;
        })();

        domain.CustomerCreated = (function() {

            /**
             * Properties of a CustomerCreated.
             * @memberof customer.domain
             * @interface ICustomerCreated
             * @property {customer.domain.ICustomerState|null} [customer] CustomerCreated customer
             */

            /**
             * Constructs a new CustomerCreated.
             * @memberof customer.domain
             * @classdesc Represents a CustomerCreated.
             * @implements ICustomerCreated
             * @constructor
             * @param {customer.domain.ICustomerCreated=} [properties] Properties to set
             */
            function CustomerCreated(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CustomerCreated customer.
             * @member {customer.domain.ICustomerState|null|undefined} customer
             * @memberof customer.domain.CustomerCreated
             * @instance
             */
            CustomerCreated.prototype.customer = null;

            /**
             * Creates a new CustomerCreated instance using the specified properties.
             * @function create
             * @memberof customer.domain.CustomerCreated
             * @static
             * @param {customer.domain.ICustomerCreated=} [properties] Properties to set
             * @returns {customer.domain.CustomerCreated} CustomerCreated instance
             */
            CustomerCreated.create = function create(properties) {
                return new CustomerCreated(properties);
            };

            return CustomerCreated;
        })();

        domain.CustomerNameChanged = (function() {

            /**
             * Properties of a CustomerNameChanged.
             * @memberof customer.domain
             * @interface ICustomerNameChanged
             * @property {string|null} [newName] CustomerNameChanged newName
             */

            /**
             * Constructs a new CustomerNameChanged.
             * @memberof customer.domain
             * @classdesc Represents a CustomerNameChanged.
             * @implements ICustomerNameChanged
             * @constructor
             * @param {customer.domain.ICustomerNameChanged=} [properties] Properties to set
             */
            function CustomerNameChanged(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CustomerNameChanged newName.
             * @member {string} newName
             * @memberof customer.domain.CustomerNameChanged
             * @instance
             */
            CustomerNameChanged.prototype.newName = "";

            /**
             * Creates a new CustomerNameChanged instance using the specified properties.
             * @function create
             * @memberof customer.domain.CustomerNameChanged
             * @static
             * @param {customer.domain.ICustomerNameChanged=} [properties] Properties to set
             * @returns {customer.domain.CustomerNameChanged} CustomerNameChanged instance
             */
            CustomerNameChanged.create = function create(properties) {
                return new CustomerNameChanged(properties);
            };

            return CustomerNameChanged;
        })();

        domain.CustomerAddressChanged = (function() {

            /**
             * Properties of a CustomerAddressChanged.
             * @memberof customer.domain
             * @interface ICustomerAddressChanged
             * @property {customer.domain.IAddress|null} [newAddress] CustomerAddressChanged newAddress
             */

            /**
             * Constructs a new CustomerAddressChanged.
             * @memberof customer.domain
             * @classdesc Represents a CustomerAddressChanged.
             * @implements ICustomerAddressChanged
             * @constructor
             * @param {customer.domain.ICustomerAddressChanged=} [properties] Properties to set
             */
            function CustomerAddressChanged(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CustomerAddressChanged newAddress.
             * @member {customer.domain.IAddress|null|undefined} newAddress
             * @memberof customer.domain.CustomerAddressChanged
             * @instance
             */
            CustomerAddressChanged.prototype.newAddress = null;

            /**
             * Creates a new CustomerAddressChanged instance using the specified properties.
             * @function create
             * @memberof customer.domain.CustomerAddressChanged
             * @static
             * @param {customer.domain.ICustomerAddressChanged=} [properties] Properties to set
             * @returns {customer.domain.CustomerAddressChanged} CustomerAddressChanged instance
             */
            CustomerAddressChanged.create = function create(properties) {
                return new CustomerAddressChanged(properties);
            };

            return CustomerAddressChanged;
        })();

        return domain;
    })();

    return customer;
})();

module.exports = $root;
