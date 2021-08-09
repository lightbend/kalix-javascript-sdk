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

type MetadataValue = string | Buffer;

// Using an interface for compatibility with legacy JS code
interface MetadataEntry {
  readonly key: string;
  readonly bytesValue: Buffer | undefined;
  readonly stringValue: string | undefined;
}

/**
 * Akka Serverless metadata.
 *
 * Metadata is treated as case insensitive on lookup, and case sensitive on set. Multiple values per key are supported,
 * setting a value will add it to the current values for that key. You should delete first if you wish to replace a
 * value.
 *
 * Values can either be strings or byte buffers. If a non string or byte buffer value is set, it will be converted to
 * a string using toString.
 *
 * @param entries - the list of entries
 */
export class Metadata {
  readonly entries: MetadataEntry[] = [];

  constructor(entries: MetadataEntry[] = []) {
    if (entries) {
      this.entries = entries;
    }
  }

  /**
   * @returns CloudEvent subject value
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
