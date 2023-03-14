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

import { Clocks, ReplicatedData } from '.';
import { ReplicatedRegister } from './register';
import AnySupport, { Comparable } from '../protobuf-any';
import { Serializable } from '../serializable';
import * as iterators from './iterators';
import * as util from 'util';
import * as protocol from '../../types/protocol/replicated-entities';

const debug = require('debug')('kalix-replicated-entity');

interface Entry<Key extends Serializable, Value extends Serializable> {
  key: Key;
  register: ReplicatedRegister<Value>;
}

/**
 * A replicated map of registers.
 *
 * @typeParam Key - Type of keys for the Replicated Register Map
 * @typeParam Value - Type of values for the Replicated Register Map
 *
 * @public
 */
export class ReplicatedRegisterMap<
  Key extends Serializable = Serializable,
  Value extends Serializable = Serializable,
> implements ReplicatedData
{
  private registers = new Map<Comparable, Entry<Key, Value>>();
  private removed = new Map<Comparable, Key>();
  private cleared = false;

  /**
   * Get the value at the given key.
   *
   * @param key - The key to get
   * @returns The register value, or undefined if no value is defined at that key
   */
  get = (key: Key): Value | undefined => {
    const entry = this.registers.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.register.value : undefined;
  };

  /**
   * Set the register at the given key to the given value.
   *
   * @param key - The key for the register
   * @param value - The new value for the register
   * @param clock - The register clock, otherwise default clock
   * @param customClockValue - Clock value when using custom clock, otherwise ignored
   * @returns This register map
   */
  set = (
    key: Key,
    value: Value,
    clock = Clocks.DEFAULT,
    customClockValue: number | Long = 0,
  ): ReplicatedRegisterMap<Key, Value> => {
    this.getOrCreateRegister(key).setWithClock(value, clock, customClockValue);
    return this;
  };

  /**
   * Check whether this map contains a value of the given key.
   *
   * @param key - The key to check
   * @returns True if this register map contains a value for the given key
   */
  has = (key: Key): boolean => {
    return this.registers.has(AnySupport.toComparable(key));
  };

  /**
   * The number of elements in this map.
   */
  get size(): number {
    return this.registers.size;
  }

  /**
   * Return an (iterable) iterator of the keys of this register map.
   *
   * @returns (iterable) iterator of the map keys
   */
  keys = (): IterableIterator<Key> => {
    return iterators.map(this.registers.values(), (entry) => entry.key);
  };

  /**
   * Delete the register at the given key.
   *
   * @param key - The key to delete
   * @returns This register map
   */
  delete = (key: Key): ReplicatedRegisterMap<Key, Value> => {
    const comparableKey = AnySupport.toComparable(key);
    if (this.registers.has(comparableKey)) {
      this.registers.delete(comparableKey);
      this.removed.set(comparableKey, key);
    }
    return this;
  };

  /**
   * Clear all registers from this register map.
   *
   * @returns This register map
   */
  clear = (): ReplicatedRegisterMap<Key, Value> => {
    if (this.registers.size > 0) {
      this.cleared = true;
      this.registers.clear();
      this.removed.clear();
    }
    return this;
  };

  private getOrCreateRegister(key: Key): ReplicatedRegister<Value> {
    const comparableKey = AnySupport.toComparable(key);
    const entry = this.registers.get(comparableKey);
    if (entry) {
      return entry.register;
    } else {
      const register = new ReplicatedRegister({} as Value);
      this.registers.set(comparableKey, { key: key, register: register });
      return register;
    }
  }

  /** @internal */
  getAndResetDelta = (initial?: boolean): protocol.DeltaOut | null => {
    const updated: protocol.RegisterMapEntryDeltaOut[] = [];
    this.registers.forEach(
      ({ key: key, register: register }, _comparableKey) => {
        const delta = register.getAndResetDelta();
        if (delta !== null) {
          updated.push({
            key: AnySupport.serialize(key, true, true),
            delta: delta.register,
          });
        }
      },
    );
    if (
      this.cleared ||
      this.removed.size > 0 ||
      updated.length > 0 ||
      initial
    ) {
      const delta = {
        replicatedRegisterMap: {
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
    if (!delta.replicatedRegisterMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedRegisterMap', delta),
      );
    }
    if (delta.replicatedRegisterMap.cleared) {
      this.registers.clear();
    }
    if (delta.replicatedRegisterMap.removed) {
      delta.replicatedRegisterMap.removed.forEach((serializedKey) => {
        const key = anySupport.deserialize(serializedKey);
        const comparableKey = AnySupport.toComparable(key);
        if (this.registers.has(comparableKey)) {
          this.registers.delete(comparableKey);
        } else {
          debug('Key to delete [%o] is not in ReplicatedRegisterMap', key);
        }
      });
    }
    if (delta.replicatedRegisterMap.updated) {
      delta.replicatedRegisterMap.updated.forEach((entry) => {
        const key = anySupport.deserialize(entry.key);
        this.getOrCreateRegister(key).applyDelta(
          { register: entry.delta },
          anySupport,
        );
      });
    }
  };

  toString = (): string => {
    return (
      'ReplicatedRegisterMap(' +
      Array.from(this.registers.values())
        .map((entry) => entry.key + ' -> ' + entry.register.value)
        .join(', ') +
      ')'
    );
  };
}
