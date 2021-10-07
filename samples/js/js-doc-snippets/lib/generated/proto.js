// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.com = (function() {

    /**
     * Namespace com.
     * @exports com
     * @namespace
     */
    var com = {};

    com.example = (function() {

        /**
         * Namespace example.
         * @memberof com
         * @namespace
         */
        var example = {};

        example.IncreaseValue = (function() {

            /**
             * Properties of an IncreaseValue.
             * @memberof com.example
             * @interface IIncreaseValue
             * @property {string|null} [counterId] IncreaseValue counterId
             * @property {number|null} [value] IncreaseValue value
             */

            /**
             * Constructs a new IncreaseValue.
             * @memberof com.example
             * @classdesc Represents an IncreaseValue.
             * @implements IIncreaseValue
             * @constructor
             * @param {com.example.IIncreaseValue=} [properties] Properties to set
             */
            function IncreaseValue(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * IncreaseValue counterId.
             * @member {string} counterId
             * @memberof com.example.IncreaseValue
             * @instance
             */
            IncreaseValue.prototype.counterId = "";

            /**
             * IncreaseValue value.
             * @member {number} value
             * @memberof com.example.IncreaseValue
             * @instance
             */
            IncreaseValue.prototype.value = 0;

            /**
             * Creates a new IncreaseValue instance using the specified properties.
             * @function create
             * @memberof com.example.IncreaseValue
             * @static
             * @param {com.example.IIncreaseValue=} [properties] Properties to set
             * @returns {com.example.IncreaseValue} IncreaseValue instance
             */
            IncreaseValue.create = function create(properties) {
                return new IncreaseValue(properties);
            };

            /**
             * Encodes the specified IncreaseValue message. Does not implicitly {@link com.example.IncreaseValue.verify|verify} messages.
             * @function encode
             * @memberof com.example.IncreaseValue
             * @static
             * @param {com.example.IIncreaseValue} message IncreaseValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            IncreaseValue.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.counterId != null && Object.hasOwnProperty.call(message, "counterId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.counterId);
                if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.value);
                return writer;
            };

            /**
             * Encodes the specified IncreaseValue message, length delimited. Does not implicitly {@link com.example.IncreaseValue.verify|verify} messages.
             * @function encodeDelimited
             * @memberof com.example.IncreaseValue
             * @static
             * @param {com.example.IIncreaseValue} message IncreaseValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            IncreaseValue.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an IncreaseValue message from the specified reader or buffer.
             * @function decode
             * @memberof com.example.IncreaseValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {com.example.IncreaseValue} IncreaseValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            IncreaseValue.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.com.example.IncreaseValue();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.counterId = reader.string();
                        break;
                    case 2:
                        message.value = reader.int32();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an IncreaseValue message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof com.example.IncreaseValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {com.example.IncreaseValue} IncreaseValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            IncreaseValue.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an IncreaseValue message.
             * @function verify
             * @memberof com.example.IncreaseValue
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            IncreaseValue.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    if (!$util.isString(message.counterId))
                        return "counterId: string expected";
                if (message.value != null && message.hasOwnProperty("value"))
                    if (!$util.isInteger(message.value))
                        return "value: integer expected";
                return null;
            };

            /**
             * Creates an IncreaseValue message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof com.example.IncreaseValue
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {com.example.IncreaseValue} IncreaseValue
             */
            IncreaseValue.fromObject = function fromObject(object) {
                if (object instanceof $root.com.example.IncreaseValue)
                    return object;
                var message = new $root.com.example.IncreaseValue();
                if (object.counterId != null)
                    message.counterId = String(object.counterId);
                if (object.value != null)
                    message.value = object.value | 0;
                return message;
            };

            /**
             * Creates a plain object from an IncreaseValue message. Also converts values to other types if specified.
             * @function toObject
             * @memberof com.example.IncreaseValue
             * @static
             * @param {com.example.IncreaseValue} message IncreaseValue
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            IncreaseValue.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.counterId = "";
                    object.value = 0;
                }
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    object.counterId = message.counterId;
                if (message.value != null && message.hasOwnProperty("value"))
                    object.value = message.value;
                return object;
            };

            /**
             * Converts this IncreaseValue to JSON.
             * @function toJSON
             * @memberof com.example.IncreaseValue
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            IncreaseValue.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return IncreaseValue;
        })();

        example.DecreaseValue = (function() {

            /**
             * Properties of a DecreaseValue.
             * @memberof com.example
             * @interface IDecreaseValue
             * @property {string|null} [counterId] DecreaseValue counterId
             * @property {number|null} [value] DecreaseValue value
             */

            /**
             * Constructs a new DecreaseValue.
             * @memberof com.example
             * @classdesc Represents a DecreaseValue.
             * @implements IDecreaseValue
             * @constructor
             * @param {com.example.IDecreaseValue=} [properties] Properties to set
             */
            function DecreaseValue(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * DecreaseValue counterId.
             * @member {string} counterId
             * @memberof com.example.DecreaseValue
             * @instance
             */
            DecreaseValue.prototype.counterId = "";

            /**
             * DecreaseValue value.
             * @member {number} value
             * @memberof com.example.DecreaseValue
             * @instance
             */
            DecreaseValue.prototype.value = 0;

            /**
             * Creates a new DecreaseValue instance using the specified properties.
             * @function create
             * @memberof com.example.DecreaseValue
             * @static
             * @param {com.example.IDecreaseValue=} [properties] Properties to set
             * @returns {com.example.DecreaseValue} DecreaseValue instance
             */
            DecreaseValue.create = function create(properties) {
                return new DecreaseValue(properties);
            };

            /**
             * Encodes the specified DecreaseValue message. Does not implicitly {@link com.example.DecreaseValue.verify|verify} messages.
             * @function encode
             * @memberof com.example.DecreaseValue
             * @static
             * @param {com.example.IDecreaseValue} message DecreaseValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DecreaseValue.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.counterId != null && Object.hasOwnProperty.call(message, "counterId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.counterId);
                if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.value);
                return writer;
            };

            /**
             * Encodes the specified DecreaseValue message, length delimited. Does not implicitly {@link com.example.DecreaseValue.verify|verify} messages.
             * @function encodeDelimited
             * @memberof com.example.DecreaseValue
             * @static
             * @param {com.example.IDecreaseValue} message DecreaseValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DecreaseValue.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a DecreaseValue message from the specified reader or buffer.
             * @function decode
             * @memberof com.example.DecreaseValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {com.example.DecreaseValue} DecreaseValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DecreaseValue.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.com.example.DecreaseValue();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.counterId = reader.string();
                        break;
                    case 2:
                        message.value = reader.int32();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a DecreaseValue message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof com.example.DecreaseValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {com.example.DecreaseValue} DecreaseValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DecreaseValue.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a DecreaseValue message.
             * @function verify
             * @memberof com.example.DecreaseValue
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            DecreaseValue.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    if (!$util.isString(message.counterId))
                        return "counterId: string expected";
                if (message.value != null && message.hasOwnProperty("value"))
                    if (!$util.isInteger(message.value))
                        return "value: integer expected";
                return null;
            };

            /**
             * Creates a DecreaseValue message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof com.example.DecreaseValue
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {com.example.DecreaseValue} DecreaseValue
             */
            DecreaseValue.fromObject = function fromObject(object) {
                if (object instanceof $root.com.example.DecreaseValue)
                    return object;
                var message = new $root.com.example.DecreaseValue();
                if (object.counterId != null)
                    message.counterId = String(object.counterId);
                if (object.value != null)
                    message.value = object.value | 0;
                return message;
            };

            /**
             * Creates a plain object from a DecreaseValue message. Also converts values to other types if specified.
             * @function toObject
             * @memberof com.example.DecreaseValue
             * @static
             * @param {com.example.DecreaseValue} message DecreaseValue
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            DecreaseValue.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.counterId = "";
                    object.value = 0;
                }
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    object.counterId = message.counterId;
                if (message.value != null && message.hasOwnProperty("value"))
                    object.value = message.value;
                return object;
            };

            /**
             * Converts this DecreaseValue to JSON.
             * @function toJSON
             * @memberof com.example.DecreaseValue
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            DecreaseValue.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return DecreaseValue;
        })();

        example.ResetValue = (function() {

            /**
             * Properties of a ResetValue.
             * @memberof com.example
             * @interface IResetValue
             * @property {string|null} [counterId] ResetValue counterId
             */

            /**
             * Constructs a new ResetValue.
             * @memberof com.example
             * @classdesc Represents a ResetValue.
             * @implements IResetValue
             * @constructor
             * @param {com.example.IResetValue=} [properties] Properties to set
             */
            function ResetValue(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ResetValue counterId.
             * @member {string} counterId
             * @memberof com.example.ResetValue
             * @instance
             */
            ResetValue.prototype.counterId = "";

            /**
             * Creates a new ResetValue instance using the specified properties.
             * @function create
             * @memberof com.example.ResetValue
             * @static
             * @param {com.example.IResetValue=} [properties] Properties to set
             * @returns {com.example.ResetValue} ResetValue instance
             */
            ResetValue.create = function create(properties) {
                return new ResetValue(properties);
            };

            /**
             * Encodes the specified ResetValue message. Does not implicitly {@link com.example.ResetValue.verify|verify} messages.
             * @function encode
             * @memberof com.example.ResetValue
             * @static
             * @param {com.example.IResetValue} message ResetValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ResetValue.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.counterId != null && Object.hasOwnProperty.call(message, "counterId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.counterId);
                return writer;
            };

            /**
             * Encodes the specified ResetValue message, length delimited. Does not implicitly {@link com.example.ResetValue.verify|verify} messages.
             * @function encodeDelimited
             * @memberof com.example.ResetValue
             * @static
             * @param {com.example.IResetValue} message ResetValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ResetValue.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ResetValue message from the specified reader or buffer.
             * @function decode
             * @memberof com.example.ResetValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {com.example.ResetValue} ResetValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ResetValue.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.com.example.ResetValue();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.counterId = reader.string();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ResetValue message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof com.example.ResetValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {com.example.ResetValue} ResetValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ResetValue.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ResetValue message.
             * @function verify
             * @memberof com.example.ResetValue
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ResetValue.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    if (!$util.isString(message.counterId))
                        return "counterId: string expected";
                return null;
            };

            /**
             * Creates a ResetValue message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof com.example.ResetValue
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {com.example.ResetValue} ResetValue
             */
            ResetValue.fromObject = function fromObject(object) {
                if (object instanceof $root.com.example.ResetValue)
                    return object;
                var message = new $root.com.example.ResetValue();
                if (object.counterId != null)
                    message.counterId = String(object.counterId);
                return message;
            };

            /**
             * Creates a plain object from a ResetValue message. Also converts values to other types if specified.
             * @function toObject
             * @memberof com.example.ResetValue
             * @static
             * @param {com.example.ResetValue} message ResetValue
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ResetValue.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.counterId = "";
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    object.counterId = message.counterId;
                return object;
            };

            /**
             * Converts this ResetValue to JSON.
             * @function toJSON
             * @memberof com.example.ResetValue
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ResetValue.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ResetValue;
        })();

        example.GetCounter = (function() {

            /**
             * Properties of a GetCounter.
             * @memberof com.example
             * @interface IGetCounter
             * @property {string|null} [counterId] GetCounter counterId
             */

            /**
             * Constructs a new GetCounter.
             * @memberof com.example
             * @classdesc Represents a GetCounter.
             * @implements IGetCounter
             * @constructor
             * @param {com.example.IGetCounter=} [properties] Properties to set
             */
            function GetCounter(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * GetCounter counterId.
             * @member {string} counterId
             * @memberof com.example.GetCounter
             * @instance
             */
            GetCounter.prototype.counterId = "";

            /**
             * Creates a new GetCounter instance using the specified properties.
             * @function create
             * @memberof com.example.GetCounter
             * @static
             * @param {com.example.IGetCounter=} [properties] Properties to set
             * @returns {com.example.GetCounter} GetCounter instance
             */
            GetCounter.create = function create(properties) {
                return new GetCounter(properties);
            };

            /**
             * Encodes the specified GetCounter message. Does not implicitly {@link com.example.GetCounter.verify|verify} messages.
             * @function encode
             * @memberof com.example.GetCounter
             * @static
             * @param {com.example.IGetCounter} message GetCounter message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetCounter.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.counterId != null && Object.hasOwnProperty.call(message, "counterId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.counterId);
                return writer;
            };

            /**
             * Encodes the specified GetCounter message, length delimited. Does not implicitly {@link com.example.GetCounter.verify|verify} messages.
             * @function encodeDelimited
             * @memberof com.example.GetCounter
             * @static
             * @param {com.example.IGetCounter} message GetCounter message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetCounter.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a GetCounter message from the specified reader or buffer.
             * @function decode
             * @memberof com.example.GetCounter
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {com.example.GetCounter} GetCounter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetCounter.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.com.example.GetCounter();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.counterId = reader.string();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a GetCounter message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof com.example.GetCounter
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {com.example.GetCounter} GetCounter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetCounter.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a GetCounter message.
             * @function verify
             * @memberof com.example.GetCounter
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            GetCounter.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    if (!$util.isString(message.counterId))
                        return "counterId: string expected";
                return null;
            };

            /**
             * Creates a GetCounter message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof com.example.GetCounter
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {com.example.GetCounter} GetCounter
             */
            GetCounter.fromObject = function fromObject(object) {
                if (object instanceof $root.com.example.GetCounter)
                    return object;
                var message = new $root.com.example.GetCounter();
                if (object.counterId != null)
                    message.counterId = String(object.counterId);
                return message;
            };

            /**
             * Creates a plain object from a GetCounter message. Also converts values to other types if specified.
             * @function toObject
             * @memberof com.example.GetCounter
             * @static
             * @param {com.example.GetCounter} message GetCounter
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            GetCounter.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.counterId = "";
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    object.counterId = message.counterId;
                return object;
            };

            /**
             * Converts this GetCounter to JSON.
             * @function toJSON
             * @memberof com.example.GetCounter
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            GetCounter.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return GetCounter;
        })();

        example.CurrentCounter = (function() {

            /**
             * Properties of a CurrentCounter.
             * @memberof com.example
             * @interface ICurrentCounter
             * @property {number|null} [value] CurrentCounter value
             */

            /**
             * Constructs a new CurrentCounter.
             * @memberof com.example
             * @classdesc Represents a CurrentCounter.
             * @implements ICurrentCounter
             * @constructor
             * @param {com.example.ICurrentCounter=} [properties] Properties to set
             */
            function CurrentCounter(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CurrentCounter value.
             * @member {number} value
             * @memberof com.example.CurrentCounter
             * @instance
             */
            CurrentCounter.prototype.value = 0;

            /**
             * Creates a new CurrentCounter instance using the specified properties.
             * @function create
             * @memberof com.example.CurrentCounter
             * @static
             * @param {com.example.ICurrentCounter=} [properties] Properties to set
             * @returns {com.example.CurrentCounter} CurrentCounter instance
             */
            CurrentCounter.create = function create(properties) {
                return new CurrentCounter(properties);
            };

            /**
             * Encodes the specified CurrentCounter message. Does not implicitly {@link com.example.CurrentCounter.verify|verify} messages.
             * @function encode
             * @memberof com.example.CurrentCounter
             * @static
             * @param {com.example.ICurrentCounter} message CurrentCounter message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CurrentCounter.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.value);
                return writer;
            };

            /**
             * Encodes the specified CurrentCounter message, length delimited. Does not implicitly {@link com.example.CurrentCounter.verify|verify} messages.
             * @function encodeDelimited
             * @memberof com.example.CurrentCounter
             * @static
             * @param {com.example.ICurrentCounter} message CurrentCounter message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CurrentCounter.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a CurrentCounter message from the specified reader or buffer.
             * @function decode
             * @memberof com.example.CurrentCounter
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {com.example.CurrentCounter} CurrentCounter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CurrentCounter.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.com.example.CurrentCounter();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.value = reader.int32();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a CurrentCounter message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof com.example.CurrentCounter
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {com.example.CurrentCounter} CurrentCounter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CurrentCounter.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a CurrentCounter message.
             * @function verify
             * @memberof com.example.CurrentCounter
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            CurrentCounter.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.value != null && message.hasOwnProperty("value"))
                    if (!$util.isInteger(message.value))
                        return "value: integer expected";
                return null;
            };

            /**
             * Creates a CurrentCounter message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof com.example.CurrentCounter
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {com.example.CurrentCounter} CurrentCounter
             */
            CurrentCounter.fromObject = function fromObject(object) {
                if (object instanceof $root.com.example.CurrentCounter)
                    return object;
                var message = new $root.com.example.CurrentCounter();
                if (object.value != null)
                    message.value = object.value | 0;
                return message;
            };

            /**
             * Creates a plain object from a CurrentCounter message. Also converts values to other types if specified.
             * @function toObject
             * @memberof com.example.CurrentCounter
             * @static
             * @param {com.example.CurrentCounter} message CurrentCounter
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            CurrentCounter.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.value = 0;
                if (message.value != null && message.hasOwnProperty("value"))
                    object.value = message.value;
                return object;
            };

            /**
             * Converts this CurrentCounter to JSON.
             * @function toJSON
             * @memberof com.example.CurrentCounter
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            CurrentCounter.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return CurrentCounter;
        })();

        example.CounterService = (function() {

            /**
             * Constructs a new CounterService service.
             * @memberof com.example
             * @classdesc Represents a CounterService
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function CounterService(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (CounterService.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = CounterService;

            /**
             * Creates new CounterService service using the specified rpc implementation.
             * @function create
             * @memberof com.example.CounterService
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {CounterService} RPC service. Useful where requests and/or responses are streamed.
             */
            CounterService.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link com.example.CounterService#increase}.
             * @memberof com.example.CounterService
             * @typedef IncreaseCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {google.protobuf.Empty} [response] Empty
             */

            /**
             * Calls Increase.
             * @function increase
             * @memberof com.example.CounterService
             * @instance
             * @param {com.example.IIncreaseValue} request IncreaseValue message or plain object
             * @param {com.example.CounterService.IncreaseCallback} callback Node-style callback called with the error, if any, and Empty
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CounterService.prototype.increase = function increase(request, callback) {
                return this.rpcCall(increase, $root.com.example.IncreaseValue, $root.google.protobuf.Empty, request, callback);
            }, "name", { value: "Increase" });

            /**
             * Calls Increase.
             * @function increase
             * @memberof com.example.CounterService
             * @instance
             * @param {com.example.IIncreaseValue} request IncreaseValue message or plain object
             * @returns {Promise<google.protobuf.Empty>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link com.example.CounterService#decrease}.
             * @memberof com.example.CounterService
             * @typedef DecreaseCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {google.protobuf.Empty} [response] Empty
             */

            /**
             * Calls Decrease.
             * @function decrease
             * @memberof com.example.CounterService
             * @instance
             * @param {com.example.IDecreaseValue} request DecreaseValue message or plain object
             * @param {com.example.CounterService.DecreaseCallback} callback Node-style callback called with the error, if any, and Empty
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CounterService.prototype.decrease = function decrease(request, callback) {
                return this.rpcCall(decrease, $root.com.example.DecreaseValue, $root.google.protobuf.Empty, request, callback);
            }, "name", { value: "Decrease" });

            /**
             * Calls Decrease.
             * @function decrease
             * @memberof com.example.CounterService
             * @instance
             * @param {com.example.IDecreaseValue} request DecreaseValue message or plain object
             * @returns {Promise<google.protobuf.Empty>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link com.example.CounterService#reset}.
             * @memberof com.example.CounterService
             * @typedef ResetCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {google.protobuf.Empty} [response] Empty
             */

            /**
             * Calls Reset.
             * @function reset
             * @memberof com.example.CounterService
             * @instance
             * @param {com.example.IResetValue} request ResetValue message or plain object
             * @param {com.example.CounterService.ResetCallback} callback Node-style callback called with the error, if any, and Empty
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CounterService.prototype.reset = function reset(request, callback) {
                return this.rpcCall(reset, $root.com.example.ResetValue, $root.google.protobuf.Empty, request, callback);
            }, "name", { value: "Reset" });

            /**
             * Calls Reset.
             * @function reset
             * @memberof com.example.CounterService
             * @instance
             * @param {com.example.IResetValue} request ResetValue message or plain object
             * @returns {Promise<google.protobuf.Empty>} Promise
             * @variation 2
             */

            /**
             * Callback as used by {@link com.example.CounterService#getCurrentCounter}.
             * @memberof com.example.CounterService
             * @typedef GetCurrentCounterCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {com.example.CurrentCounter} [response] CurrentCounter
             */

            /**
             * Calls GetCurrentCounter.
             * @function getCurrentCounter
             * @memberof com.example.CounterService
             * @instance
             * @param {com.example.IGetCounter} request GetCounter message or plain object
             * @param {com.example.CounterService.GetCurrentCounterCallback} callback Node-style callback called with the error, if any, and CurrentCounter
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(CounterService.prototype.getCurrentCounter = function getCurrentCounter(request, callback) {
                return this.rpcCall(getCurrentCounter, $root.com.example.GetCounter, $root.com.example.CurrentCounter, request, callback);
            }, "name", { value: "GetCurrentCounter" });

            /**
             * Calls GetCurrentCounter.
             * @function getCurrentCounter
             * @memberof com.example.CounterService
             * @instance
             * @param {com.example.IGetCounter} request GetCounter message or plain object
             * @returns {Promise<com.example.CurrentCounter>} Promise
             * @variation 2
             */

            return CounterService;
        })();

        example.Request = (function() {

            /**
             * Properties of a Request.
             * @memberof com.example
             * @interface IRequest
             * @property {string|null} [counterId] Request counterId
             */

            /**
             * Constructs a new Request.
             * @memberof com.example
             * @classdesc Represents a Request.
             * @implements IRequest
             * @constructor
             * @param {com.example.IRequest=} [properties] Properties to set
             */
            function Request(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Request counterId.
             * @member {string} counterId
             * @memberof com.example.Request
             * @instance
             */
            Request.prototype.counterId = "";

            /**
             * Creates a new Request instance using the specified properties.
             * @function create
             * @memberof com.example.Request
             * @static
             * @param {com.example.IRequest=} [properties] Properties to set
             * @returns {com.example.Request} Request instance
             */
            Request.create = function create(properties) {
                return new Request(properties);
            };

            /**
             * Encodes the specified Request message. Does not implicitly {@link com.example.Request.verify|verify} messages.
             * @function encode
             * @memberof com.example.Request
             * @static
             * @param {com.example.IRequest} message Request message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Request.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.counterId != null && Object.hasOwnProperty.call(message, "counterId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.counterId);
                return writer;
            };

            /**
             * Encodes the specified Request message, length delimited. Does not implicitly {@link com.example.Request.verify|verify} messages.
             * @function encodeDelimited
             * @memberof com.example.Request
             * @static
             * @param {com.example.IRequest} message Request message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Request.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Request message from the specified reader or buffer.
             * @function decode
             * @memberof com.example.Request
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {com.example.Request} Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Request.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.com.example.Request();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.counterId = reader.string();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Request message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof com.example.Request
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {com.example.Request} Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Request.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Request message.
             * @function verify
             * @memberof com.example.Request
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Request.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    if (!$util.isString(message.counterId))
                        return "counterId: string expected";
                return null;
            };

            /**
             * Creates a Request message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof com.example.Request
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {com.example.Request} Request
             */
            Request.fromObject = function fromObject(object) {
                if (object instanceof $root.com.example.Request)
                    return object;
                var message = new $root.com.example.Request();
                if (object.counterId != null)
                    message.counterId = String(object.counterId);
                return message;
            };

            /**
             * Creates a plain object from a Request message. Also converts values to other types if specified.
             * @function toObject
             * @memberof com.example.Request
             * @static
             * @param {com.example.Request} message Request
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Request.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.counterId = "";
                if (message.counterId != null && message.hasOwnProperty("counterId"))
                    object.counterId = message.counterId;
                return object;
            };

            /**
             * Converts this Request to JSON.
             * @function toJSON
             * @memberof com.example.Request
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Request.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Request;
        })();

        example.Result = (function() {

            /**
             * Properties of a Result.
             * @memberof com.example
             * @interface IResult
             * @property {number|null} [value] Result value
             */

            /**
             * Constructs a new Result.
             * @memberof com.example
             * @classdesc Represents a Result.
             * @implements IResult
             * @constructor
             * @param {com.example.IResult=} [properties] Properties to set
             */
            function Result(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Result value.
             * @member {number} value
             * @memberof com.example.Result
             * @instance
             */
            Result.prototype.value = 0;

            /**
             * Creates a new Result instance using the specified properties.
             * @function create
             * @memberof com.example.Result
             * @static
             * @param {com.example.IResult=} [properties] Properties to set
             * @returns {com.example.Result} Result instance
             */
            Result.create = function create(properties) {
                return new Result(properties);
            };

            /**
             * Encodes the specified Result message. Does not implicitly {@link com.example.Result.verify|verify} messages.
             * @function encode
             * @memberof com.example.Result
             * @static
             * @param {com.example.IResult} message Result message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Result.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.value);
                return writer;
            };

            /**
             * Encodes the specified Result message, length delimited. Does not implicitly {@link com.example.Result.verify|verify} messages.
             * @function encodeDelimited
             * @memberof com.example.Result
             * @static
             * @param {com.example.IResult} message Result message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Result.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Result message from the specified reader or buffer.
             * @function decode
             * @memberof com.example.Result
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {com.example.Result} Result
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Result.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.com.example.Result();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.value = reader.int32();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Result message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof com.example.Result
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {com.example.Result} Result
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Result.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Result message.
             * @function verify
             * @memberof com.example.Result
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Result.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.value != null && message.hasOwnProperty("value"))
                    if (!$util.isInteger(message.value))
                        return "value: integer expected";
                return null;
            };

            /**
             * Creates a Result message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof com.example.Result
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {com.example.Result} Result
             */
            Result.fromObject = function fromObject(object) {
                if (object instanceof $root.com.example.Result)
                    return object;
                var message = new $root.com.example.Result();
                if (object.value != null)
                    message.value = object.value | 0;
                return message;
            };

            /**
             * Creates a plain object from a Result message. Also converts values to other types if specified.
             * @function toObject
             * @memberof com.example.Result
             * @static
             * @param {com.example.Result} message Result
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Result.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.value = 0;
                if (message.value != null && message.hasOwnProperty("value"))
                    object.value = message.value;
                return object;
            };

            /**
             * Converts this Result to JSON.
             * @function toJSON
             * @memberof com.example.Result
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Result.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Result;
        })();

        example.DelegatingService = (function() {

            /**
             * Constructs a new DelegatingService service.
             * @memberof com.example
             * @classdesc Represents a DelegatingService
             * @extends $protobuf.rpc.Service
             * @constructor
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             */
            function DelegatingService(rpcImpl, requestDelimited, responseDelimited) {
                $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
            }

            (DelegatingService.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = DelegatingService;

            /**
             * Creates new DelegatingService service using the specified rpc implementation.
             * @function create
             * @memberof com.example.DelegatingService
             * @static
             * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
             * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
             * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
             * @returns {DelegatingService} RPC service. Useful where requests and/or responses are streamed.
             */
            DelegatingService.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                return new this(rpcImpl, requestDelimited, responseDelimited);
            };

            /**
             * Callback as used by {@link com.example.DelegatingService#addAndReturn}.
             * @memberof com.example.DelegatingService
             * @typedef AddAndReturnCallback
             * @type {function}
             * @param {Error|null} error Error, if any
             * @param {com.example.Result} [response] Result
             */

            /**
             * Calls AddAndReturn.
             * @function addAndReturn
             * @memberof com.example.DelegatingService
             * @instance
             * @param {com.example.IRequest} request Request message or plain object
             * @param {com.example.DelegatingService.AddAndReturnCallback} callback Node-style callback called with the error, if any, and Result
             * @returns {undefined}
             * @variation 1
             */
            Object.defineProperty(DelegatingService.prototype.addAndReturn = function addAndReturn(request, callback) {
                return this.rpcCall(addAndReturn, $root.com.example.Request, $root.com.example.Result, request, callback);
            }, "name", { value: "AddAndReturn" });

            /**
             * Calls AddAndReturn.
             * @function addAndReturn
             * @memberof com.example.DelegatingService
             * @instance
             * @param {com.example.IRequest} request Request message or plain object
             * @returns {Promise<com.example.Result>} Promise
             * @variation 2
             */

            return DelegatingService;
        })();

        return example;
    })();

    return com;
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

            /**
             * Encodes the specified Empty message. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Empty
             * @static
             * @param {google.protobuf.IEmpty} message Empty message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Empty.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified Empty message, length delimited. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Empty
             * @static
             * @param {google.protobuf.IEmpty} message Empty message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Empty.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Empty message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Empty
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Empty} Empty
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Empty.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.google.protobuf.Empty();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an Empty message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Empty
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Empty} Empty
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Empty.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Empty message.
             * @function verify
             * @memberof google.protobuf.Empty
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Empty.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                return null;
            };

            /**
             * Creates an Empty message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Empty
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Empty} Empty
             */
            Empty.fromObject = function fromObject(object) {
                if (object instanceof $root.google.protobuf.Empty)
                    return object;
                return new $root.google.protobuf.Empty();
            };

            /**
             * Creates a plain object from an Empty message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Empty
             * @static
             * @param {google.protobuf.Empty} message Empty
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Empty.toObject = function toObject() {
                return {};
            };

            /**
             * Converts this Empty to JSON.
             * @function toJSON
             * @memberof google.protobuf.Empty
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Empty.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Empty;
        })();

        return protobuf;
    })();

    return google;
})();