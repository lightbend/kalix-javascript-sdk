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

import * as util from 'util';
import * as protobuf from 'protobufjs';
import * as Long from 'long';
import stableJsonStringify = require('json-stable-stringify');
import * as protocol from '../types/protocol/any';

export type Any = {
  type_url: string;
  value: Uint8Array;
};

export namespace Any {
  export function typeUrl(any?: protocol.AnyOut | null): string {
    return any && 'type_url' in any ? any.type_url : any?.['@type'] ?? '';
  }

  export function value(any?: protocol.AnyOut | null): Buffer {
    return any && 'value' in any ? Buffer.from(any.value) : Buffer.alloc(0);
  }

  // convert from proto-loader outgoing to incoming representation
  export function flip(any?: protocol.AnyOut | null): protocol.AnyIn {
    return {
      type_url: Any.typeUrl(any),
      value: Any.value(any),
    };
  }
}

// To allow primitive types to be stored, Kalix defines a number of primitive type URLs, based on protobuf types.
// The serialized values are valid protobuf messages that contain a value of that type as their single field at index
// 15.
const KalixPrimitive = 'type.kalix.io/';
// Chosen because it reduces the likelihood of clashing with something else.
const KalixPrimitiveFieldNumber = 1;
const KalixPrimitiveFieldNumberEncoded = KalixPrimitiveFieldNumber << 3; // 8
const KalixSupportedPrimitiveTypes = new Set([
  'string',
  'bytes',
  'int64',
  'bool',
  'double',
]);

type PrimitiveTypeName = 'string' | 'bytes' | 'int64' | 'bool' | 'double';
type PrimitiveType = string | number | boolean | protobuf.Long | Uint8Array;

const EmptyArray = Object.freeze(new Uint8Array(0));

const KalixJson = 'json.kalix.io/';

export type Comparable = string | number | boolean;

/** @internal */
export default class AnySupport {
  private root: protobuf.Root;

  constructor(root: protobuf.Root) {
    this.root = root;
  }

  static fullNameOf(descriptor: protobuf.Type): string {
    function namespace(desc: protobuf.NamespaceBase | null): string {
      if (!desc || desc.name === '') {
        return '';
      } else {
        return namespace(desc.parent) + desc.name + '.';
      }
    }
    return namespace(descriptor.parent) + descriptor.name;
  }

  static stripHostName(url: string): string {
    const idx = url.indexOf('/');
    if (url.indexOf('/') >= 0) {
      return url.substring(idx + 1);
    } else {
      // fail?
      return url;
    }
  }

  static isPrimitiveDefaultValue(obj: any, type: PrimitiveTypeName): boolean {
    if (Long.isLong(obj)) return obj.equals(Long.ZERO);
    else if (Buffer.isBuffer(obj)) return !obj.length;
    else return obj === protobuf.types.defaults[type];
  }

  static serializePrimitiveValue(
    obj: any,
    type: PrimitiveTypeName,
  ): Uint8Array {
    if (this.isPrimitiveDefaultValue(obj, type)) return EmptyArray;
    const writer = new protobuf.Writer();
    // First write the field key.
    // Field index is always 15, which gets shifted left by 3 bits (ie, 120).
    writer.uint32(
      (KalixPrimitiveFieldNumberEncoded | protobuf.types.basic[type]) >>> 0,
    );
    // Now write the primitive
    (writer[type] as Function)(obj);
    return writer.finish();
  }

  static serializePrimitive(obj: any, type: PrimitiveTypeName): Any {
    return {
      // I have *no* idea why it's type_url and not typeUrl, but it is.
      type_url: KalixPrimitive + type,
      value: this.serializePrimitiveValue(obj, type),
    };
  }

  /**
   * Create a comparable version of obj for use in sets and maps.
   *
   * The returned value guarantees === equality (both positive and negative) for the following types:
   *
   * - strings
   * - numbers
   * - booleans
   * - Buffers
   * - Longs
   * - any protobufjs types
   * - objects (based on stable JSON serialization)
   */
  static toComparable(obj: any): Comparable {
    // When outputting strings, we prefix with a letter for the type, to guarantee uniqueness of different types.
    if (typeof obj === 'string') {
      return 's' + obj;
    } else if (typeof obj === 'number') {
      return obj;
    } else if (Buffer.isBuffer(obj)) {
      return 'b' + obj.toString('base64');
    } else if (typeof obj === 'boolean') {
      return obj;
    } else if (Long.isLong(obj)) {
      return 'l' + obj.toString();
    } else if (
      obj.constructor &&
      typeof obj.constructor.encode === 'function' &&
      obj.constructor.$type
    ) {
      return 'p' + obj.constructor.encode(obj).finish().toString('base64');
    } else if (typeof obj === 'object') {
      return 'j' + stableJsonStringify(obj);
    } else {
      throw new Error(
        util.format(
          'Object %o is not a protobuf object, object or supported primitive type, and ' +
            "hence can't be dynamically serialized.",
          obj,
        ),
      );
    }
  }

  /**
   * Serialize a protobuf object to a google.protobuf.Any.
   *
   * @param obj The object to serialize. It must be a protobufjs created object.
   * @param allowPrimitives Whether primitives should be allowed to be serialized.
   * @param fallbackToJson Whether serialization should fallback to JSON if the object
   *        is not a protobuf, but defines a type property.
   * @param requireJsonType If fallbackToJson is true, then if this is true, a property
   *        called type is required.
   */
  static serialize(
    obj: any,
    allowPrimitives: boolean,
    fallbackToJson: boolean,
    requireJsonType = false,
  ): Any {
    if (allowPrimitives) {
      if (typeof obj === 'string') {
        return this.serializePrimitive(obj, 'string');
      } else if (typeof obj === 'number') {
        return this.serializePrimitive(obj, 'double');
      } else if (Buffer.isBuffer(obj)) {
        return this.serializePrimitive(obj, 'bytes');
      } else if (typeof obj === 'boolean') {
        return this.serializePrimitive(obj, 'bool');
      } else if (Long.isLong(obj)) {
        return this.serializePrimitive(obj, 'int64');
      }
    }
    if (
      obj.constructor &&
      typeof obj.constructor.encode === 'function' &&
      obj.constructor.$type
    ) {
      return {
        // I have *no* idea why it's type_url and not typeUrl, but it is.
        type_url:
          'type.googleapis.com/' + AnySupport.fullNameOf(obj.constructor.$type),
        value: obj.constructor.encode(obj).finish(),
      };
    } else if (fallbackToJson && typeof obj === 'object') {
      let type = obj.type;
      if (type === undefined) {
        if (requireJsonType) {
          throw new Error(
            util.format(
              'Fallback to JSON serialization supported, but object does not define a type property: %o',
              obj,
            ),
          );
        } else {
          type = 'object';
        }
      }
      return {
        type_url: KalixJson + type,
        value: this.serializePrimitiveValue(stableJsonStringify(obj), 'string'),
      };
    } else {
      throw new Error(
        util.format(
          "Object %o is not a protobuf object, and hence can't be dynamically " +
            "serialized. Try passing the object to the protobuf class's create function.",
          obj,
        ),
      );
    }
  }

  /**
   * Deserialize an any using the given protobufjs root object.
   *
   * @param any The any.
   */
  deserialize(any?: Any | null): any {
    if (!any?.type_url) throw Error('No type URL specified for Any');

    const url = any.type_url;
    const idx = url.indexOf('/');
    let hostName = '';
    let type = url;
    if (url.indexOf('/') >= 0) {
      hostName = url.substring(0, idx + 1);
      type = url.substring(idx + 1);
    }

    const bytes = any.value || EmptyArray;

    if (hostName === KalixPrimitive) {
      return AnySupport.deserializePrimitive(bytes, type);
    }

    if (hostName === KalixJson) {
      const json = AnySupport.deserializePrimitive(bytes, 'string') as string;
      return JSON.parse(json);
    }

    const desc = this.root.lookupType(type);
    return desc.decode(bytes);
  }

  static primitiveDefaultValue(type: PrimitiveTypeName): PrimitiveType {
    if (type === 'int64') return Long.ZERO;
    else if (type === 'bytes') return Buffer.alloc(0);
    else return protobuf.types.defaults[type];
  }

  static deserializePrimitive(
    bytes: Uint8Array,
    typeName: string,
  ): PrimitiveType {
    if (!KalixSupportedPrimitiveTypes.has(typeName)) {
      throw new Error('Unsupported Kalix primitive type: ' + typeName);
    }

    const type = typeName as PrimitiveTypeName;

    if (!bytes.length) return this.primitiveDefaultValue(type);

    const reader = new protobuf.Reader(bytes);
    let fieldNumber = 0;
    let pType = 0;

    while (reader.pos < reader.len) {
      const key = reader.uint32();
      pType = key & 7;
      fieldNumber = key >>> 3;
      if (fieldNumber !== KalixPrimitiveFieldNumber) {
        reader.skipType(pType);
      } else {
        if (pType !== protobuf.types.basic[type]) {
          throw new Error(
            'Unexpected protobuf type ' +
              pType +
              ', was expecting ' +
              protobuf.types.basic[type] +
              ' for decoding a ' +
              type,
          );
        }
        return reader[type]();
      }
    }

    // We didn't find the field, just return the default.
    return this.primitiveDefaultValue(type);
  }
}
