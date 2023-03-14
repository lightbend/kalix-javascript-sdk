/*
 * Copyright 2021-2023 Lightbend Inc.
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
import { ReplicatedCounter } from './counter';
import AnySupport, { Comparable } from '../protobuf-any';
import { Serializable } from '../serializable';
import * as iterators from './iterators';
import * as Long from 'long';
import * as util from 'util';
import * as protocol from '../../types/protocol/replicated-entities';

const debug = require('debug')('kalix-replicated-entity');

interface Entry<Key extends Serializable> {
  key: Key;
  counter: ReplicatedCounter;
}

/**
 * A replicated map of counters.
 *
 * @typeParam Key - Type of keys for the Replicated Counter Map
 *
 * @public
 */
export class ReplicatedCounterMap<Key extends Serializable = Serializable>
  implements ReplicatedData
{
  private counters = new Map<Comparable, Entry<Key>>();
  private removed = new Map<Comparable, Key>();
  private cleared = false;

  /**
   * Get the value at the given key.
   *
   * @param key - The key to get
   * @returns The counter value, or undefined if no value is defined at that key
   */
  get = (key: Key): number | undefined => {
    const entry = this.counters.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.counter.value : undefined;
  };

  /**
   * Get the value as a long at the given key.
   *
   * @param key - The key to get
   * @returns The counter value as a long, or undefined if no value is defined at that key
   */
  getLong = (key: Key): Long.Long | undefined => {
    const entry = this.counters.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.counter.longValue : undefined;
  };

  /**
   * Increment the counter at the given key by the given number.
   *
   * @param key - The key for the counter to increment
   * @param increment - The amount to increment the counter by. If negative, it will be decremented instead
   * @returns This counter map
   */
  increment = (
    key: Key,
    increment: Long.Long | number,
  ): ReplicatedCounterMap<Key> => {
    this.getOrCreateCounter(key).increment(increment);
    return this;
  };

  /**
   * Decrement the counter at the given key by the given number.
   *
   * @param key - The key for the counter to decrement
   * @param decrement - The amount to decrement the counter by. If negative, it will be incremented instead.
   * @returns This counter map
   */
  decrement = (
    key: Key,
    decrement: Long.Long | number,
  ): ReplicatedCounterMap<Key> => {
    this.getOrCreateCounter(key).decrement(decrement);
    return this;
  };

  /**
   * Check whether this map contains a value of the given key.
   *
   * @param key - The key to check
   * @returns True if this counter map contains a value for the given key
   */
  has = (key: Key): boolean => {
    return this.counters.has(AnySupport.toComparable(key));
  };

  /**
   * The number of elements in this map.
   */
  get size(): number {
    return this.counters.size;
  }

  /**
   * Return an (iterable) iterator of the keys of this counter map.
   */
  keys = (): IterableIterator<Key> => {
    return iterators.map(this.counters.values(), (entry) => entry.key);
  };

  /**
   * Delete the counter at the given key.
   *
   * @param key - The key to delete
   * @returns This counter map
   */

  delete = (key: Key): ReplicatedCounterMap<Key> => {
    const comparableKey = AnySupport.toComparable(key);
    if (this.counters.has(comparableKey)) {
      this.counters.delete(comparableKey);
      this.removed.set(comparableKey, key);
    }
    return this;
  };

  /**
   * Clear all counters from this counter map.
   *
   * @returns This counter map
   */
  clear = (): ReplicatedCounterMap<Key> => {
    if (this.counters.size > 0) {
      this.cleared = true;
      this.counters.clear();
      this.removed.clear();
    }
    return this;
  };

  private getOrCreateCounter(key: Key): ReplicatedCounter {
    const comparableKey = AnySupport.toComparable(key);
    const entry = this.counters.get(comparableKey);
    if (entry) {
      return entry.counter;
    } else {
      const counter = new ReplicatedCounter();
      this.counters.set(comparableKey, { key: key, counter: counter });
      return counter;
    }
  }

  /** @internal */
  getAndResetDelta = (initial?: boolean): protocol.DeltaOut | null => {
    const updated: protocol.CounterMapEntryDeltaOut[] = [];
    this.counters.forEach(({ key: key, counter: counter }, _comparableKey) => {
      const delta = counter.getAndResetDelta();
      if (delta !== null) {
        updated.push({
          key: AnySupport.serialize(key, true, true),
          delta: delta.counter,
        });
      }
    });
    if (
      this.cleared ||
      this.removed.size > 0 ||
      updated.length > 0 ||
      initial
    ) {
      const delta: protocol.DeltaOut = {
        replicatedCounterMap: {
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
  applyDelta = (delta: protocol.DeltaIn, anySupport: AnySupport): void => {
    if (!delta.replicatedCounterMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedCounterMap', delta),
      );
    }
    if (delta.replicatedCounterMap.cleared) {
      this.counters.clear();
    }
    if (delta.replicatedCounterMap.removed) {
      delta.replicatedCounterMap.removed.forEach((serializedKey) => {
        const key = anySupport.deserialize(serializedKey);
        const comparableKey = AnySupport.toComparable(key);
        if (this.counters.has(comparableKey)) {
          this.counters.delete(comparableKey);
        } else {
          debug('Key to delete [%o] is not in ReplicatedCounterMap', key);
        }
      });
    }
    if (delta.replicatedCounterMap.updated) {
      delta.replicatedCounterMap.updated.forEach((entry) => {
        const key = anySupport.deserialize(entry.key);
        this.getOrCreateCounter(key).applyDelta({ counter: entry.delta });
      });
    }
  };

  toString = (): string => {
    return (
      'ReplicatedCounterMap(' +
      Array.from(this.counters.values())
        .map((entry) => entry.key + ' -> ' + entry.counter.value)
        .join(', ') +
      ')'
    );
  };
}
