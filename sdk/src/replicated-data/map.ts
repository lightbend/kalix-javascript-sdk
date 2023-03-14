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
import AnySupport, { Comparable } from '../protobuf-any';
import { Serializable } from '../serializable';
import * as iterators from './iterators';
import * as util from 'util';
import * as protocol from '../../types/protocol/replicated-entities';

const debug = require('debug')('kalix-replicated-entity');

interface Entry<Key extends Serializable, Value extends ReplicatedData> {
  key: Key;
  value: Value;
}

/** @public */
export namespace ReplicatedMap {
  /**
   * Generator for default values.
   *
   * @remarks
   *
   * This is invoked by get when the current map has no Replicated Data defined for the key.
   *
   * If this returns a Replicated Data object, it will be added to the map.
   *
   * Care should be taken when using this, since it means that the get method can trigger elements to be created. If
   * using default values, the get method should not be used in queries where an empty value for the Replicated Data
   * means the value is not present.
   *
   * @typeParam Key - Type of keys for the Replicated Map
   * @typeParam Value - Type of values for the Replicated Map
   * @param key - The key the default value is being generated for
   * @returns The default value, or undefined if no default value should be returned
   */
  export type DefaultValueCallback<
    Key extends Serializable,
    Value extends ReplicatedData,
  > = (key: Key) => Value | undefined;

  /**
   * Callback for handling elements iterated through by {@link ReplicatedMap.forEach}.
   *
   * @typeParam Key - Type of keys for the Replicated Map
   * @typeParam Value - Type of values for the Replicated Map
   * @param value - The Replicated Data value
   * @param key - The key
   * @param map - This Replicated Map
   */
  export type ForEachCallback<
    Key extends Serializable,
    Value extends ReplicatedData,
  > = (value: Value, key: Key, map: ReplicatedMap<Key, Value>) => void;
}

/**
 * A Replicated Map data type.
 *
 * @remarks
 *
 * ReplicatedMaps are a mapping of keys (which can be any {@link Serializable}) to Replicated Data
 * types. Values of the map are merged together. Elements can be added and removed, however, when an
 * element is removed and then added again, it's possible that the old value will be merged with the
 * new, depending on whether the remove was replicated to all nodes before the add was.
 *
 * Note that while the map may contain different types of Replicated Data for different keys, a
 * given key may not change its type, and doing so will likely result in the Replicated Data
 * entering a non mergable state, from which it can't recover.
 *
 * @typeParam Key - Type of keys for the Replicated Map
 * @typeParam Value - Type of values for the Replicated Map
 *
 * @public
 */
export class ReplicatedMap<
  Key extends Serializable = Serializable,
  Value extends ReplicatedData = ReplicatedData,
> implements ReplicatedData, Iterable<[Key, Value]>
{
  // Map of a comparable form (that compares correctly using ===) to an object that holds the
  // actual key and the value.
  private currentValue = new Map<Comparable, Entry<Key, Value>>();
  private delta = {
    added: new Map<Comparable, protocol.AnyOut>(),
    removed: new Map<Comparable, protocol.AnyOut>(),
    cleared: false,
  };

  /**
   * Generator for default values.
   *
   * @remarks
   *
   * This is invoked by get when the current map has no Replicated Data defined for the key.
   *
   * If this returns a Replicated Data object, it will be added to the map.
   *
   * Care should be taken when using this, since it means that the get method can trigger elements to be created. If
   * using default values, the get method should not be used in queries where an empty value for the Replicated Data
   * means the value is not present.
   */
  defaultValue: ReplicatedMap.DefaultValueCallback<Key, Value> = (_key: Key) =>
    undefined;

  /**
   * Check whether this map contains a value of the given key.
   *
   * @param key - The key to check
   * @returns True if this map contains a value of the given key
   */
  has = (key: Key): boolean => {
    return this.currentValue.has(AnySupport.toComparable(key));
  };

  /**
   * The number of entries in this map.
   */
  get size(): number {
    return this.currentValue.size;
  }

  /**
   * Execute the given callback for each element.
   *
   * @param callback - The callback to handle each element
   */
  forEach = (callback: ReplicatedMap.ForEachCallback<Key, Value>): void => {
    return this.currentValue.forEach((value, _key) =>
      callback(value.value, value.key, this),
    );
  };

  /**
   * Return an (iterable) iterator of the entries of this map.
   *
   * @returns (iterable) iterator of map entries
   */
  entries = (): IterableIterator<[Key, Value]> => {
    // For some reason, these arrays are key, value, even though callbacks are passed value, key
    return iterators.map(this.currentValue.values(), (value) => [
      value.key,
      value.value,
    ]);
  };

  /**
   * Return an iterator of the entries of this map.
   *
   * @returns iterator of map entries
   */
  [Symbol.iterator] = (): IterableIterator<[Key, Value]> => {
    return this.entries();
  };

  /**
   * Return an iterator of the values of this map.
   *
   * @returns iterator of map values
   */
  values = (): IterableIterator<Value> => {
    return iterators.map(this.currentValue.values(), (value) => value.value);
  };

  /**
   * Return an iterator of the keys of this map.
   *
   * @returns iterator of map keys
   */
  keys = (): IterableIterator<Key> => {
    return iterators.map(this.currentValue.values(), (value) => value.key);
  };

  /**
   * Get the value at the given key.
   *
   * @param key - The key to get
   * @returns The Replicated Data value, or undefined if no value is defined at that key
   */
  get = (key: Key): Value | undefined => {
    const value = this.currentValue.get(AnySupport.toComparable(key));
    if (value !== undefined) {
      return value.value;
    } else {
      const maybeDefault = this.defaultValue(key);
      if (maybeDefault !== undefined) {
        this.set(key, maybeDefault);
      }
      return maybeDefault;
    }
  };

  private untyped = this as unknown as ReplicatedMap;

  private asObjectProxy = new Proxy(
    {},
    {
      get: (target: any, key: string): any => this.untyped.get(key),
      set: (target: any, key: string, value: any): boolean => {
        this.untyped.set(key, value);
        return true;
      },
      deleteProperty: (target: any, key: string): boolean => {
        this.untyped.delete(key);
        return true;
      },
      ownKeys: (target: any): ArrayLike<string> => {
        const keys: string[] = [];
        this.forEach((value, key) => {
          if (typeof key === 'string') {
            keys.push(key);
          }
        });
        return keys;
      },
      has: (target: any, key: string): boolean => this.untyped.has(key),
      defineProperty: (): boolean => {
        throw new Error(
          'ReplicatedMap.asObject does not support defining properties',
        );
      },
      getOwnPropertyDescriptor: (
        target: any,
        key: string,
      ): PropertyDescriptor | undefined => {
        const value = this.untyped.get(key);
        return value
          ? {
              value: value,
              writable: true,
              enumerable: true,
              configurable: true,
            }
          : undefined;
      },
    },
  );

  /**
   * A representation of this map as an object.
   *
   * @remarks
   *
   * All entries whose keys are strings will be properties of this object, and setting any property of the object will
   * insert that property as a key into the map.
   */

  get asObject(): { [key: string]: Value } {
    return this.asObjectProxy;
  }

  /**
   * Set the given value for the given key.
   *
   * @param key - The key to set
   * @param value - The value to set
   * @returns This map
   */
  set = (key: Key, value: Value): ReplicatedMap<Key, Value> => {
    if (
      !(
        value.hasOwnProperty('getAndResetDelta') ||
        typeof value.getAndResetDelta === 'function'
      )
    ) {
      throw new Error(
        util.format(
          'Cannot add %o with value %o to ReplicatedMap, only Replicated Data types may be added as values.',
          key,
          value,
        ),
      );
    }
    const comparable = AnySupport.toComparable(key);
    const serializedKey = AnySupport.serialize(key, true, true);
    if (!this.currentValue.has(comparable)) {
      if (this.delta.removed.has(comparable)) {
        debug(
          'Removing then adding key [%o] in the same operation can have unintended effects, as the old value may end up being merged with the new.',
          key,
        );
      }
    } else if (!this.delta.added.has(comparable)) {
      debug(
        'Setting an existing key [%o] to a new value can have unintended effects, as the old value may end up being merged with the new.',
        key,
      );
      this.delta.removed.set(comparable, serializedKey);
    }
    // We'll get the actual state later
    this.delta.added.set(comparable, serializedKey);
    this.currentValue.set(comparable, {
      key: key,
      value: value,
    });
    return this;
  };

  /**
   * Delete the value at the given key.
   *
   * @param key - The key to delete.
   * @returns This map
   */
  delete = (key: Key): ReplicatedMap<Key, Value> => {
    const comparable = AnySupport.toComparable(key);
    if (this.currentValue.has(comparable)) {
      this.currentValue.delete(comparable);
      if (this.delta.added.has(comparable)) {
        this.delta.added.delete(comparable);
      } else {
        const serializedKey = AnySupport.serialize(key, true, true);
        this.delta.removed.set(comparable, serializedKey);
      }
    }
    return this;
  };

  /**
   * Clear all entries from this map.
   *
   * @returns This map
   */
  clear = (): ReplicatedMap<Key, Value> => {
    if (this.currentValue.size > 0) {
      this.delta.cleared = true;
      this.delta.added.clear();
      this.delta.removed.clear();
      this.currentValue.clear();
    }
    return this;
  };

  /** @internal */
  getAndResetDelta = (initial?: boolean): protocol.DeltaOut | null => {
    const updateDeltas: protocol.MapEntryDeltaOut[] = [];
    const addedDeltas: protocol.MapEntryDeltaOut[] = [];
    this.currentValue.forEach((value, key) => {
      if (this.delta.added.has(key)) {
        addedDeltas.push({
          key: this.delta.added.get(key),
          delta: value.value.getAndResetDelta(/* initial = */ true),
        });
      } else {
        const entryDelta = value.value.getAndResetDelta();
        if (entryDelta !== null) {
          updateDeltas.push({
            key: AnySupport.serialize(value.key, true, true),
            delta: entryDelta,
          });
        }
      }
    });

    if (
      this.delta.cleared ||
      this.delta.removed.size > 0 ||
      updateDeltas.length > 0 ||
      addedDeltas.length > 0 ||
      initial
    ) {
      const currentDelta: protocol.DeltaOut = {
        replicatedMap: {
          cleared: this.delta.cleared,
          removed: Array.from(this.delta.removed.values()),
          added: addedDeltas,
          updated: updateDeltas,
        },
      };
      this.delta.cleared = false;
      this.delta.added.clear();
      this.delta.removed.clear();
      return currentDelta;
    } else {
      return null;
    }
  };

  /** @internal */
  applyDelta = (
    delta: protocol.DeltaIn,
    anySupport: AnySupport,
    createForDelta: (delta: protocol.DeltaIn) => ReplicatedData,
  ): void => {
    if (!delta.replicatedMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedMap', delta),
      );
    }
    if (delta.replicatedMap.cleared) {
      this.currentValue.clear();
    }
    if (delta.replicatedMap.removed) {
      delta.replicatedMap.removed.forEach((key) => {
        const deserializedKey = anySupport.deserialize(key);
        const comparable = AnySupport.toComparable(deserializedKey);
        if (this.currentValue.has(comparable)) {
          this.currentValue.delete(comparable);
        } else {
          debug(
            "Delta instructed to delete key [%o], but it wasn't in the ReplicatedMap.",
            deserializedKey,
          );
        }
      });
    }
    if (delta.replicatedMap.added) {
      delta.replicatedMap.added.forEach((entry) => {
        if (entry.delta) {
          const value = createForDelta(entry.delta);
          value.applyDelta(entry.delta, anySupport, createForDelta);
          const key = anySupport.deserialize(entry.key);
          const comparable = AnySupport.toComparable(key);
          if (this.currentValue.has(comparable)) {
            debug(
              "Delta instructed to add key [%o], but it's already present in the ReplicatedMap. Updating with delta instead.",
              key,
            );
            this.currentValue
              .get(comparable)!
              .value.applyDelta(entry.delta, anySupport, createForDelta);
          } else {
            this.currentValue.set(comparable, {
              key: key,
              value: value as Value,
            });
          }
        }
      });
    }
    if (delta.replicatedMap.updated) {
      delta.replicatedMap.updated.forEach((entry) => {
        if (entry.delta) {
          const key = anySupport.deserialize(entry.key);
          const comparable = AnySupport.toComparable(key);
          if (this.currentValue.has(comparable)) {
            this.currentValue
              .get(comparable)!
              .value.applyDelta(entry.delta, anySupport, createForDelta);
          } else {
            debug(
              "Delta instructed to update key [%o], but it's not present in the ReplicatedMap.",
              key,
            );
          }
        }
      });
    }
  };

  toString = (): string => {
    return (
      'ReplicatedMap(' +
      Array.from(this.currentValue.values())
        .map((entry) => entry.key + ' -> ' + entry.value.toString())
        .join(',') +
      ')'
    );
  };
}
