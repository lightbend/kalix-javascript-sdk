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

import { ReplicatedData } from '.';
import { ReplicatedSet } from './set';
import AnySupport, { Comparable } from '../protobuf-any';
import { Serializable } from '../serializable';
import * as iterators from './iterators';
import * as util from 'util';
import * as proto from '../../proto/protobuf-bundle';

const debug = require('debug')('kalix-replicated-entity');

/** @internal */
namespace protocol {
  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;

  export type EntryDelta =
    proto.kalix.component.replicatedentity.IReplicatedMultiMapEntryDelta;
}

interface Entry {
  key: Serializable;
  values: ReplicatedSet;
}

/**
 * A replicated multimap (map of sets).
 *
 * A replicated map that maps keys to values, where each key may be associated with multiple values.
 *
 * @public
 */
export class ReplicatedMultiMap implements ReplicatedData {
  private entries = new Map<Comparable, Entry>();
  private removed = new Map<Comparable, Serializable>();
  private cleared = false;

  private EmptySet = Object.freeze(new Set<Serializable>());

  /**
   * Get the values for the given key.
   *
   * @param key - The key of the entry
   * @returns The current values at the given key, or an empty Set
   */
  get = (key: Serializable): Set<Serializable> => {
    const entry = this.entries.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.values.elements() : this.EmptySet;
  };

  /**
   * Store a key-value pair.
   *
   * @param key - The key of the entry
   * @param value - The value to add to the entry
   * @returns This multimap
   */
  put = (key: Serializable, value: Serializable): ReplicatedMultiMap => {
    this.getOrCreateValues(key).add(value);
    return this;
  };

  /**
   * Store multiple values for a key.
   *
   * @param key - The key of the entry
   * @param values - The values to add to the entry
   * @returns This multimap
   */
  putAll = (
    key: Serializable,
    values: Iterable<Serializable>,
  ): ReplicatedMultiMap => {
    this.getOrCreateValues(key).addAll(values);
    return this;
  };

  /**
   * Delete a single key-value pair for the given key and value.
   *
   * @param key - The key of the entry
   * @param value - The value to remove from the entry
   * @returns This multimap
   */
  delete = (key: Serializable, value: Serializable): ReplicatedMultiMap => {
    const comparableKey = AnySupport.toComparable(key);
    const entry = this.entries.get(comparableKey);
    if (entry) {
      entry.values.delete(value);
      if (entry.values.size === 0) this.deleteAll(key);
    }
    return this;
  };

  /**
   * Delete all values associated with the given key.
   *
   * @param key - The key of the entry
   * @returns This multimap
   */
  deleteAll = (key: Serializable): ReplicatedMultiMap => {
    const comparableKey = AnySupport.toComparable(key);
    if (this.entries.has(comparableKey)) {
      this.entries.delete(comparableKey);
      this.removed.set(comparableKey, key);
    }
    return this;
  };

  /**
   * Check whether this multimap contains at least one value for the given key.
   *
   * @param key - The key to check
   * @returns True if this multimap contains any values for the given key
   */
  has = (key: Serializable): boolean => {
    return this.entries.has(AnySupport.toComparable(key));
  };

  /**
   * Check whether this multimap contains the given value associated with the given key.
   *
   * @param key - The key to check
   * @param value - The value to check
   * @returns True if the key-value pair is in this multimap
   */

  hasValue = (key: Serializable, value: Serializable): boolean => {
    const comparableKey = AnySupport.toComparable(key);
    const entry = this.entries.get(comparableKey);
    return entry ? entry.values.has(value) : false;
  };

  /**
   * The total number of values stored in the multimap.
   */
  get size(): number {
    return Array.from(this.entries.values()).reduce(
      (sum, entry) => sum + entry.values.size,
      0,
    );
  }

  /**
   * The number of keys with values stored in the multimap.
   */
  get keysSize(): number {
    return this.entries.size;
  }

  /**
   * Return an (iterable) iterator of the keys of this multimap.
   *
   * @returns (iterable) iterator of multimap keys
   */
  keys = (): IterableIterator<Serializable> => {
    return iterators.map(this.entries.values(), (entry) => entry.key);
  };

  /**
   * Clear all entries from this multimap.
   *
   * @returns This multimap
   */
  clear = (): ReplicatedMultiMap => {
    if (this.entries.size > 0) {
      this.cleared = true;
      this.entries.clear();
      this.removed.clear();
    }
    return this;
  };

  private getOrCreateValues(key: Serializable): ReplicatedSet {
    const comparableKey = AnySupport.toComparable(key);
    const entry = this.entries.get(comparableKey);
    if (entry) {
      return entry.values;
    } else {
      const values = new ReplicatedSet();
      this.entries.set(comparableKey, { key: key, values: values });
      return values;
    }
  }

  /** @internal */
  getAndResetDelta = (initial?: boolean): protocol.Delta | null => {
    const updated: protocol.EntryDelta[] = [];
    this.entries.forEach(({ key: key, values: values }, _comparableKey) => {
      const delta = values.getAndResetDelta();
      if (delta !== null) {
        updated.push({
          key: AnySupport.serialize(key, true, true),
          delta: delta.replicatedSet,
        });
      }
    });
    if (
      this.cleared ||
      this.removed.size > 0 ||
      updated.length > 0 ||
      initial
    ) {
      const delta = {
        replicatedMultiMap: {
          cleared: this.cleared,
          removed: Array.from(this.removed.values()).map((key) =>
            AnySupport.serialize(key, true, true),
          ),
          updated: updated,
        },
      };
      this.cleared = false;
      this.removed.clear();
      return delta;
    } else {
      return null;
    }
  };

  /** @internal */
  applyDelta = (delta: protocol.Delta, anySupport: AnySupport): void => {
    if (!delta.replicatedMultiMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedMultiMap', delta),
      );
    }
    if (delta.replicatedMultiMap.cleared) {
      this.entries.clear();
    }
    if (delta.replicatedMultiMap.removed) {
      delta.replicatedMultiMap.removed.forEach((serializedKey) => {
        const key = anySupport.deserialize(serializedKey);
        const comparableKey = AnySupport.toComparable(key);
        if (this.entries.has(comparableKey)) {
          this.entries.delete(comparableKey);
        } else {
          debug('Key to delete [%o] is not in ReplicatedMultiMap', key);
        }
      });
    }
    if (delta.replicatedMultiMap.updated) {
      delta.replicatedMultiMap.updated.forEach((entry) => {
        const key = anySupport.deserialize(entry.key);
        this.getOrCreateValues(key).applyDelta(
          { replicatedSet: entry.delta },
          anySupport,
        );
      });
    }
  };

  toString = (): string => {
    return (
      'ReplicatedMultiMap(' +
      Array.from(this.entries.values())
        .map(
          (entry) =>
            entry.key + ' -> (' + Array.from(entry.values).join(', ') + ')',
        )
        .join(', ') +
      ')'
    );
  };
}
