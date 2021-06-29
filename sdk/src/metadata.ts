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

/**
 * A metadata value. Can either be a string or a buffer.
 *
 * @typedef module:akkaserverless.MetadataValue
 * @type {string|Buffer}
 */
type MetadataValue = string | Buffer;

// Using an interface for compatibility with legacy JS code
interface MetadataEntry {
  readonly key: string;
  readonly bytesValue: Buffer | undefined;
  readonly stringValue: string | undefined;
}

/**
 * @classdesc Akka Serverless metadata.
 *
 * Metadata is treated as case insensitive on lookup, and case sensitive on set. Multiple values per key are supported,
 * setting a value will add it to the current values for that key. You should delete first if you wish to replace a
 * value.
 *
 * Values can either be strings or byte buffers. If a non string or byte buffer value is set, it will be converted to
 * a string using toString.
 *
 * @interface module:akkaserverless.Metadata
 * @param {array} entries The list of entries
 */
export class Metadata {
  readonly entries: MetadataEntry[] = [];

  constructor(entries: MetadataEntry[] = []) {
    if (entries) {
      this.entries = entries;
    } else {
    }
  }

  getSubject() {
    const subject = this.get('ce-subject');
    if (subject.length > 0) {
      return subject[0];
    } else {
      return undefined;
    }
  }

  getMetadataEntry(key: string, value: any): MetadataEntry {
    if (typeof value === 'string') {
      return { key: key, stringValue: value, bytesValue: undefined };
    } else if (Buffer.isBuffer(value)) {
      return { key: key, bytesValue: value, stringValue: undefined };
    } else {
      return { key: key, stringValue: value.toString(), bytesValue: undefined };
    }
  }

  getValue(entry: MetadataEntry) {
    if (entry.bytesValue !== undefined) {
      return entry.bytesValue;
    } else {
      return entry.stringValue;
    }
  }

  /**
   * Get all the values for the given key.
   *
   * The key is case insensitive.
   *
   * @function module:akkaserverless.Metadata#get
   * @param {string} key The key to get.
   * @returns {Array<module:akkaserverless.MetadataValue>} All the values, or an empty array if no values exist for the key.
   */
  get(key: string) {
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
   * This will append the key value to the metadata, it won't replace any existing values for existing keys.
   *
   * @function module:akkaserverless.Metadata#set
   * @param {string} key The key to set.
   * @param {any} value The value to set.
   */
  set(key: string, value: any) {
    this.entries.push(this.getMetadataEntry(key, value));
    return this;
  }

  /**
   * Delete all values with the given key.
   *
   * The key is case insensitive.
   *
   * @function module:akkaserverless.Metadata#delete
   * @param {string} key The key to delete.
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
   * The key is case insensitive.
   *
   * @function module:akkaserverless.Metadata#has
   * @param {string} key The key to check.
   */
  has(key: string) {
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
   * @function module:akkaserverless.Metadata#clear
   */
  clear() {
    this.entries.splice(0, this.entries.length);
    return this;
  }
}
