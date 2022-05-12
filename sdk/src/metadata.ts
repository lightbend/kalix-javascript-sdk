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

import { Cloudevent } from './cloudevent';
import { JwtClaims } from './jwt-claims';
import * as proto from '../proto/protobuf-bundle';

/** @internal */
namespace protocol {
  export type Metadata = proto.kalix.component.IMetadata;
}

/**
 * A metadata value. Can either be a string or a buffer.
 *
 * @public
 */
export type MetadataValue = string | Buffer;

// Using an interface for compatibility with legacy JS code
/**
 * A metadata entry.
 *
 * @public
 */
export interface MetadataEntry {
  /**
   * The key for this metadata entry.
   */
  readonly key: string;

  /**
   * The entry value as bytes.
   */
  readonly bytesValue: Buffer | undefined;

  /**
   * The entry value as a string.
   */
  readonly stringValue: string | undefined;
}

/** @public */
export interface MetadataMap {
  [key: string]: string | Buffer | undefined;
}

class MetadataMapProxyHandler implements ProxyHandler<MetadataMap> {
  private metadata: Metadata;

  constructor(metadata: Metadata) {
    this.metadata = metadata;
  }

  ownKeys(target: MetadataMap): ArrayLike<string | symbol> {
    const keys = new Array<string>();
    for (const entry of this.metadata.entries) {
      keys.push(entry.key);
    }
    return keys;
  }

  deleteProperty(target: MetadataMap, key: string | symbol): boolean {
    if (typeof key === 'string') {
      const hasKey = this.metadata.has(key as string);
      if (hasKey) {
        this.metadata.delete(key);
      }
      return hasKey;
    }
    return false;
  }

  get(target: MetadataMap, key: string | symbol, receiver: any): any {
    if (typeof key === 'string') {
      const lowercaseKey = (key as string).toLowerCase();
      for (const entry of this.metadata.entries) {
        if (lowercaseKey === entry.key.toLowerCase()) {
          if (entry.stringValue) {
            return entry.stringValue;
          }
          if (entry.bytesValue) {
            return entry.bytesValue;
          }
        }
      }
    }
    return undefined;
  }

  has(target: MetadataMap, key: string | symbol): boolean {
    if (typeof key === 'string') {
      const lowercaseKey = (key as string).toLowerCase();
      for (const entry of this.metadata.entries) {
        if (lowercaseKey === entry.key.toLowerCase()) {
          return true;
        }
      }
    }
    return false;
  }

  set(
    target: MetadataMap,
    key: string | symbol,
    value: any,
    receiver: any,
  ): boolean {
    if (typeof key === 'string') {
      this.metadata.delete(key as string);
      this.metadata.set(key as string, value);
      return true;
    }
    return false;
  }

  getOwnPropertyDescriptor(
    target: MetadataMap,
    key: string | symbol,
  ): PropertyDescriptor | undefined {
    const superThis = this;
    if (typeof key === 'string') {
      const v = this.get(target, key as string, null);
      if (v !== undefined) {
        return new (class implements PropertyDescriptor {
          readonly value = v;
          readonly writable = true;
          readonly enumerable = true;
          readonly configurable = false;

          get(): any {
            return v;
          }

          set(v: any): void {
            superThis.set(target, key, v, null);
          }
        })();
      }
    }
    return undefined;
  }
}

/**
 * Kalix metadata.
 *
 * Metadata is treated as case insensitive on lookup, and case sensitive on set. Multiple values per key are supported,
 * setting a value will add it to the current values for that key. You should delete first if you wish to replace a
 * value.
 *
 * Values can either be strings or byte buffers. If a non string or byte buffer value is set, it will be converted to
 * a string using toString.
 *
 * @param entries - the list of entries
 *
 * @public
 */
export class Metadata {
  readonly entries: MetadataEntry[];
  /**
   * The metadata expressed as an object/map.
   *
   * @remarks
   *
   * The map is backed by the this Metadata object - changes to this map will be reflected in this metadata object and
   * changes to this object will be reflected in the map.
   *
   * The map will return the first metadata entry that matches the key, case insensitive, when properties are looked up.
   * When setting properties, it will replace all entries that match the key, case insensitive.
   */
  readonly asMap: MetadataMap = new Proxy(
    new (class implements MetadataMap {
      [key: string]: string | Buffer | undefined;
    })(),
    new MetadataMapProxyHandler(this),
  );
  /**
   * The Cloudevent data from this Metadata.
   *
   * @remarks
   * This object is backed by this Metadata, changes to the Cloudevent will be reflected in the Metadata.
   */
  readonly cloudevent: Cloudevent = new Cloudevent(this);

  /**
   * The JWT claims, if there was a validated bearer token with this request.
   */
  readonly jwtClaims: JwtClaims = new JwtClaims(this);

  constructor(entries: MetadataEntry[] = []) {
    this.entries = entries;
  }

  /**
   * Create Metadata from the SDK protocol.
   *
   * @param metadata - protocol Metadata
   * @returns created Metadata
   *
   * @internal
   */
  static fromProtocol(metadata?: protocol.Metadata | null): Metadata {
    if (metadata && metadata.entries) {
      const entries: MetadataEntry[] = metadata.entries.map((entry) => ({
        key: entry.key ?? '',
        bytesValue: entry.bytesValue
          ? Buffer.from(entry.bytesValue)
          : undefined,
        stringValue: entry.stringValue ?? undefined,
      }));
      return new Metadata(entries);
    } else {
      return new Metadata();
    }
  }

  /**
   * Set the HTTP status code for the response when sending a successful response using HTTP transcoding.
   *
   * @remarks
   * This will only apply to responses that are being transcoded to plain HTTP from gRPC using the protobuf HTTP
   * annotations. When gRPC is being used, calling this has no effect.
   *
   * @param code - The HTTP status code to set
   */
  setHttpStatusCode(code: number): void {
    if (code < 100 || code >= 600) {
      throw new Error('Invalid HTTP status code: ' + code);
    }
    this.set('_kalix-http-code', code.toString());
  }

  /**
   * Get the CloudEvent subject from the metadata.
   *
   * @returns CloudEvent subject value
   *
   * @deprecated Use {@link Cloudevent.subject} via {@link Metadata.cloudevent} instead.
   */
  getSubject(): MetadataValue | undefined {
    const subject = this.get('ce-subject');
    if (subject.length > 0) {
      return subject[0];
    } else {
      return undefined;
    }
  }

  /**
   * Create a new MetadataEntry.
   *
   * @param key - the key for the entry
   * @param value - the value for the entry
   * @returns a new MetadataEntry
   */
  private createMetadataEntry(key: string, value: any): MetadataEntry {
    if (typeof value === 'string') {
      return { key: key, stringValue: value, bytesValue: undefined };
    } else if (Buffer.isBuffer(value)) {
      return { key: key, bytesValue: value, stringValue: undefined };
    } else {
      return { key: key, stringValue: value.toString(), bytesValue: undefined };
    }
  }

  /**
   * Get the value from a metadata entry.
   *
   * @param entry - the metadata entry
   * @returns the value for the given entry
   */
  private getValue(entry: MetadataEntry): MetadataValue | undefined {
    if (entry.bytesValue !== undefined) {
      return entry.bytesValue;
    } else {
      return entry.stringValue;
    }
  }

  /**
   * Get all the values for the given key.
   *
   * @remarks
   * The key is case insensitive.
   *
   * @param key - the key to get
   * @returns all the values, or an empty array if no values exist for the key
   */
  get(key: string): MetadataValue[] {
    const values: MetadataValue[] = [];
    this.entries.forEach((entry) => {
      if (key.toLowerCase() === entry.key.toLowerCase()) {
        const value = this.getValue(entry);
        if (value) {
          values.push(value);
        }
      }
    });
    return values;
  }

  /**
   * Set a given key value.
   *
   * @remarks
   * This will append the key value to the metadata, it won't replace any existing values for existing keys.
   *
   * @param key - the key to set
   * @param value - the value to set
   * @returns this updated metadata
   */
  set(key: string, value: any): Metadata {
    this.entries.push(this.createMetadataEntry(key, value));
    return this;
  }

  /**
   * Delete all values with the given key.
   *
   * @remarks
   * The key is case insensitive.
   *
   * @param key - the key to delete
   * @returns this updated metadata
   */
  delete(key: string) {
    let idx = 0;
    while (idx < this.entries.length) {
      const entry = this.entries[idx];
      if (key.toLowerCase() !== entry.key.toLowerCase()) {
        idx++;
      } else {
        this.entries.splice(idx, 1);
      }
    }
    return this;
  }

  /**
   * Whether there exists a metadata value for the given key.
   *
   * @remarks
   * The key is case insensitive.
   *
   * @param key - the key to check
   * @returns whether values exist for the given key
   */
  has(key: string): boolean {
    for (const idx in this.entries) {
      const entry = this.entries[idx];
      if (key.toLowerCase() === entry.key.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Clear the metadata.
   *
   * @returns this updated metadata
   */
  clear() {
    this.entries.splice(0, this.entries.length);
    return this;
  }
}
