/*
Copyright 2021 Lightbend Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import * as $protobuf from "protobufjs";
/** Namespace com. */
export namespace com {

    /** Namespace example. */
    namespace example {

        /** Properties of an IncreaseValue. */
        interface IIncreaseValue {

            /** IncreaseValue counterId */
            counterId?: (string|null);

            /** IncreaseValue value */
            value?: (number|null);
        }

        /** Represents an IncreaseValue. */
        class IncreaseValue implements IIncreaseValue {

            /**
             * Constructs a new IncreaseValue.
             * @param [properties] Properties to set
             */
            constructor(properties?: com.example.IIncreaseValue);

            /** IncreaseValue counterId. */
            public counterId: string;

            /** IncreaseValue value. */
            public value: number;

            /**
             * Creates a new IncreaseValue instance using the specified properties.
             * @param [properties] Properties to set
             * @returns IncreaseValue instance
             */
            public static create(properties?: com.example.IIncreaseValue): com.example.IncreaseValue;

            /**
             * Encodes the specified IncreaseValue message. Does not implicitly {@link com.example.IncreaseValue.verify|verify} messages.
             * @param message IncreaseValue message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: com.example.IIncreaseValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified IncreaseValue message, length delimited. Does not implicitly {@link com.example.IncreaseValue.verify|verify} messages.
             * @param message IncreaseValue message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: com.example.IIncreaseValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an IncreaseValue message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns IncreaseValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): com.example.IncreaseValue;

            /**
             * Decodes an IncreaseValue message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns IncreaseValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): com.example.IncreaseValue;

            /**
             * Verifies an IncreaseValue message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an IncreaseValue message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns IncreaseValue
             */
            public static fromObject(object: { [k: string]: any }): com.example.IncreaseValue;

            /**
             * Creates a plain object from an IncreaseValue message. Also converts values to other types if specified.
             * @param message IncreaseValue
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: com.example.IncreaseValue, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this IncreaseValue to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        /** Properties of a DecreaseValue. */
        interface IDecreaseValue {

            /** DecreaseValue counterId */
            counterId?: (string|null);

            /** DecreaseValue value */
            value?: (number|null);
        }

        /** Represents a DecreaseValue. */
        class DecreaseValue implements IDecreaseValue {

            /**
             * Constructs a new DecreaseValue.
             * @param [properties] Properties to set
             */
            constructor(properties?: com.example.IDecreaseValue);

            /** DecreaseValue counterId. */
            public counterId: string;

            /** DecreaseValue value. */
            public value: number;

            /**
             * Creates a new DecreaseValue instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DecreaseValue instance
             */
            public static create(properties?: com.example.IDecreaseValue): com.example.DecreaseValue;

            /**
             * Encodes the specified DecreaseValue message. Does not implicitly {@link com.example.DecreaseValue.verify|verify} messages.
             * @param message DecreaseValue message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: com.example.IDecreaseValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DecreaseValue message, length delimited. Does not implicitly {@link com.example.DecreaseValue.verify|verify} messages.
             * @param message DecreaseValue message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: com.example.IDecreaseValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DecreaseValue message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns DecreaseValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): com.example.DecreaseValue;

            /**
             * Decodes a DecreaseValue message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DecreaseValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): com.example.DecreaseValue;

            /**
             * Verifies a DecreaseValue message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a DecreaseValue message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns DecreaseValue
             */
            public static fromObject(object: { [k: string]: any }): com.example.DecreaseValue;

            /**
             * Creates a plain object from a DecreaseValue message. Also converts values to other types if specified.
             * @param message DecreaseValue
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: com.example.DecreaseValue, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this DecreaseValue to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        /** Properties of a ResetValue. */
        interface IResetValue {

            /** ResetValue counterId */
            counterId?: (string|null);
        }

        /** Represents a ResetValue. */
        class ResetValue implements IResetValue {

            /**
             * Constructs a new ResetValue.
             * @param [properties] Properties to set
             */
            constructor(properties?: com.example.IResetValue);

            /** ResetValue counterId. */
            public counterId: string;

            /**
             * Creates a new ResetValue instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ResetValue instance
             */
            public static create(properties?: com.example.IResetValue): com.example.ResetValue;

            /**
             * Encodes the specified ResetValue message. Does not implicitly {@link com.example.ResetValue.verify|verify} messages.
             * @param message ResetValue message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: com.example.IResetValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ResetValue message, length delimited. Does not implicitly {@link com.example.ResetValue.verify|verify} messages.
             * @param message ResetValue message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: com.example.IResetValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ResetValue message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ResetValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): com.example.ResetValue;

            /**
             * Decodes a ResetValue message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ResetValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): com.example.ResetValue;

            /**
             * Verifies a ResetValue message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ResetValue message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ResetValue
             */
            public static fromObject(object: { [k: string]: any }): com.example.ResetValue;

            /**
             * Creates a plain object from a ResetValue message. Also converts values to other types if specified.
             * @param message ResetValue
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: com.example.ResetValue, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ResetValue to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        /** Properties of a GetCounter. */
        interface IGetCounter {

            /** GetCounter counterId */
            counterId?: (string|null);
        }

        /** Represents a GetCounter. */
        class GetCounter implements IGetCounter {

            /**
             * Constructs a new GetCounter.
             * @param [properties] Properties to set
             */
            constructor(properties?: com.example.IGetCounter);

            /** GetCounter counterId. */
            public counterId: string;

            /**
             * Creates a new GetCounter instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetCounter instance
             */
            public static create(properties?: com.example.IGetCounter): com.example.GetCounter;

            /**
             * Encodes the specified GetCounter message. Does not implicitly {@link com.example.GetCounter.verify|verify} messages.
             * @param message GetCounter message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: com.example.IGetCounter, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetCounter message, length delimited. Does not implicitly {@link com.example.GetCounter.verify|verify} messages.
             * @param message GetCounter message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: com.example.IGetCounter, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetCounter message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetCounter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): com.example.GetCounter;

            /**
             * Decodes a GetCounter message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetCounter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): com.example.GetCounter;

            /**
             * Verifies a GetCounter message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetCounter message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetCounter
             */
            public static fromObject(object: { [k: string]: any }): com.example.GetCounter;

            /**
             * Creates a plain object from a GetCounter message. Also converts values to other types if specified.
             * @param message GetCounter
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: com.example.GetCounter, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetCounter to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        /** Properties of a CurrentCounter. */
        interface ICurrentCounter {

            /** CurrentCounter value */
            value?: (number|null);
        }

        /** Represents a CurrentCounter. */
        class CurrentCounter implements ICurrentCounter {

            /**
             * Constructs a new CurrentCounter.
             * @param [properties] Properties to set
             */
            constructor(properties?: com.example.ICurrentCounter);

            /** CurrentCounter value. */
            public value: number;

            /**
             * Creates a new CurrentCounter instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CurrentCounter instance
             */
            public static create(properties?: com.example.ICurrentCounter): com.example.CurrentCounter;

            /**
             * Encodes the specified CurrentCounter message. Does not implicitly {@link com.example.CurrentCounter.verify|verify} messages.
             * @param message CurrentCounter message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: com.example.ICurrentCounter, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CurrentCounter message, length delimited. Does not implicitly {@link com.example.CurrentCounter.verify|verify} messages.
             * @param message CurrentCounter message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: com.example.ICurrentCounter, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CurrentCounter message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CurrentCounter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): com.example.CurrentCounter;

            /**
             * Decodes a CurrentCounter message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CurrentCounter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): com.example.CurrentCounter;

            /**
             * Verifies a CurrentCounter message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CurrentCounter message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CurrentCounter
             */
            public static fromObject(object: { [k: string]: any }): com.example.CurrentCounter;

            /**
             * Creates a plain object from a CurrentCounter message. Also converts values to other types if specified.
             * @param message CurrentCounter
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: com.example.CurrentCounter, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CurrentCounter to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        /** Represents a CounterService */
        class CounterService extends $protobuf.rpc.Service {

            /**
             * Constructs a new CounterService service.
             * @param rpcImpl RPC implementation
             * @param [requestDelimited=false] Whether requests are length-delimited
             * @param [responseDelimited=false] Whether responses are length-delimited
             */
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

            /**
             * Creates new CounterService service using the specified rpc implementation.
             * @param rpcImpl RPC implementation
             * @param [requestDelimited=false] Whether requests are length-delimited
             * @param [responseDelimited=false] Whether responses are length-delimited
             * @returns RPC service. Useful where requests and/or responses are streamed.
             */
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): CounterService;

            /**
             * Calls Increase.
             * @param request IncreaseValue message or plain object
             * @param callback Node-style callback called with the error, if any, and Empty
             */
            public increase(request: com.example.IIncreaseValue, callback: com.example.CounterService.IncreaseCallback): void;

            /**
             * Calls Increase.
             * @param request IncreaseValue message or plain object
             * @returns Promise
             */
            public increase(request: com.example.IIncreaseValue): Promise<google.protobuf.Empty>;

            /**
             * Calls Decrease.
             * @param request DecreaseValue message or plain object
             * @param callback Node-style callback called with the error, if any, and Empty
             */
            public decrease(request: com.example.IDecreaseValue, callback: com.example.CounterService.DecreaseCallback): void;

            /**
             * Calls Decrease.
             * @param request DecreaseValue message or plain object
             * @returns Promise
             */
            public decrease(request: com.example.IDecreaseValue): Promise<google.protobuf.Empty>;

            /**
             * Calls Reset.
             * @param request ResetValue message or plain object
             * @param callback Node-style callback called with the error, if any, and Empty
             */
            public reset(request: com.example.IResetValue, callback: com.example.CounterService.ResetCallback): void;

            /**
             * Calls Reset.
             * @param request ResetValue message or plain object
             * @returns Promise
             */
            public reset(request: com.example.IResetValue): Promise<google.protobuf.Empty>;

            /**
             * Calls GetCurrentCounter.
             * @param request GetCounter message or plain object
             * @param callback Node-style callback called with the error, if any, and CurrentCounter
             */
            public getCurrentCounter(request: com.example.IGetCounter, callback: com.example.CounterService.GetCurrentCounterCallback): void;

            /**
             * Calls GetCurrentCounter.
             * @param request GetCounter message or plain object
             * @returns Promise
             */
            public getCurrentCounter(request: com.example.IGetCounter): Promise<com.example.CurrentCounter>;
        }

        namespace CounterService {

            /**
             * Callback as used by {@link com.example.CounterService#increase}.
             * @param error Error, if any
             * @param [response] Empty
             */
            type IncreaseCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

            /**
             * Callback as used by {@link com.example.CounterService#decrease}.
             * @param error Error, if any
             * @param [response] Empty
             */
            type DecreaseCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

            /**
             * Callback as used by {@link com.example.CounterService#reset}.
             * @param error Error, if any
             * @param [response] Empty
             */
            type ResetCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

            /**
             * Callback as used by {@link com.example.CounterService#getCurrentCounter}.
             * @param error Error, if any
             * @param [response] CurrentCounter
             */
            type GetCurrentCounterCallback = (error: (Error|null), response?: com.example.CurrentCounter) => void;
        }

        /** Namespace domain. */
        namespace domain {

            /** Properties of a CounterState. */
            interface ICounterState {

                /** CounterState value */
                value?: (number|null);
            }

            /** Represents a CounterState. */
            class CounterState implements ICounterState {

                /**
                 * Constructs a new CounterState.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: com.example.domain.ICounterState);

                /** CounterState value. */
                public value: number;

                /**
                 * Creates a new CounterState instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns CounterState instance
                 */
                public static create(properties?: com.example.domain.ICounterState): com.example.domain.CounterState;

                /**
                 * Encodes the specified CounterState message. Does not implicitly {@link com.example.domain.CounterState.verify|verify} messages.
                 * @param message CounterState message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: com.example.domain.ICounterState, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified CounterState message, length delimited. Does not implicitly {@link com.example.domain.CounterState.verify|verify} messages.
                 * @param message CounterState message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: com.example.domain.ICounterState, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a CounterState message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns CounterState
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): com.example.domain.CounterState;

                /**
                 * Decodes a CounterState message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns CounterState
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): com.example.domain.CounterState;

                /**
                 * Verifies a CounterState message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a CounterState message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns CounterState
                 */
                public static fromObject(object: { [k: string]: any }): com.example.domain.CounterState;

                /**
                 * Creates a plain object from a CounterState message. Also converts values to other types if specified.
                 * @param message CounterState
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: com.example.domain.CounterState, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this CounterState to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }
        }
    }
}

/** Namespace google. */
export namespace google {

    /** Namespace protobuf. */
    namespace protobuf {

        /** Properties of an Empty. */
        interface IEmpty {
        }

        /** Represents an Empty. */
        class Empty implements IEmpty {

            /**
             * Constructs a new Empty.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IEmpty);

            /**
             * Creates a new Empty instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Empty instance
             */
            public static create(properties?: google.protobuf.IEmpty): google.protobuf.Empty;

            /**
             * Encodes the specified Empty message. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
             * @param message Empty message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IEmpty, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Empty message, length delimited. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
             * @param message Empty message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IEmpty, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Empty message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Empty
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Empty;

            /**
             * Decodes an Empty message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Empty
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Empty;

            /**
             * Verifies an Empty message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Empty message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Empty
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Empty;

            /**
             * Creates a plain object from an Empty message. Also converts values to other types if specified.
             * @param message Empty
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Empty, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Empty to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }
    }
}
