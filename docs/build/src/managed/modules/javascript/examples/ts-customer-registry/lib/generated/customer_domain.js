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
