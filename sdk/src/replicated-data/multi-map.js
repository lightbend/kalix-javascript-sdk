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

const debug = require('debug')('kalix-replicated-entity');
const ReplicatedSet = require('./set');
const AnySupport = require('../protobuf-any');
const iterators = require('./iterators');
const util = require('util');

/**
 * @classdesc A replicated multimap (map of sets).
 *
 * A replicated map that maps keys to values, where each key may be associated with multiple values.
 *
 * @constructor module:kalix.replicatedentity.ReplicatedMultiMap
 * @implements module:kalix.replicatedentity.ReplicatedData
 */
function ReplicatedMultiMap() {
  const entries = new Map();
  const removed = new Map();
  let cleared = false;

  const EmptySet = Object.freeze(new Set());

  /**
   * Get the values for the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#get
   * @param {module:kalix.Serializable} key The key of the entry.
   * @returns {Set<module:kalix.Serializable>} The current values at the given key, or an empty Set.
   */
  this.get = (key) => {
    const entry = entries.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.values.elements() : EmptySet;
  };

  /**
   * Store a key-value pair.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#put
   * @param {module:kalix.Serializable} key The key of the entry.
   * @param {module:kalix.Serializable} value The value to add to the entry.
   * @returns {module:kalix.replicatedentity.ReplicatedMultiMap} This multimap.
   */
  this.put = function (key, value) {
    this.getOrCreateValues(key).add(value);
    return this;
  };

  /**
   * Store multiple values for a key.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#putAll
   * @param {module:kalix.Serializable} key The key of the entry.
   * @param {Iterator<module:kalix.Serializable>} values The values to add to the entry.
   * @returns {module:kalix.replicatedentity.ReplicatedMultiMap} This multimap.
   */
  this.putAll = function (key, values) {
    this.getOrCreateValues(key).addAll(values);
    return this;
  };

  /**
   * Delete a single key-value pair for the given key and value.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#delete
   * @param {module:kalix.Serializable} key The key of the entry.
   * @param {module:kalix.Serializable} value The value to remove from the entry.
   * @return {module:kalix.replicatedentity.ReplicatedMultiMap} This multimap.
   */
  this.delete = function (key, value) {
    const comparableKey = AnySupport.toComparable(key);
    const entry = entries.get(comparableKey);
    if (entry) {
      entry.values.delete(value);
      if (entry.values.size === 0) this.deleteAll(key);
    }
    return this;
  };

  /**
   * Delete all values associated with the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#deleteAll
   * @param {module:kalix.Serializable} key The key of the entry.
   * @return {module:kalix.replicatedentity.ReplicatedMultiMap} This multimap.
   */
  this.deleteAll = function (key) {
    const comparableKey = AnySupport.toComparable(key);
    if (entries.has(comparableKey)) {
      entries.delete(comparableKey);
      removed.set(comparableKey, key);
    }
    return this;
  };

  /**
   * Check whether this multimap contains at least one value for the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#has
   * @param {module:kalix.Serializable} key The key to check.
   * @returns {boolean} True if this multimap contains any values for the given key.
   */
  this.has = function (key) {
    return entries.has(AnySupport.toComparable(key));
  };

  /**
   * Check whether this multimap contains the given value associated with the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#hasValue
   * @param {module:kalix.Serializable} key The key to check.
   * @param {module:kalix.Serializable} value The value to check.
   * @returns {boolean} True if the key-value pair is in this multimap.
   */
  this.hasValue = function (key, value) {
    const comparableKey = AnySupport.toComparable(key);
    const entry = entries.get(comparableKey);
    return entry ? entry.values.has(value) : false;
  };

  /**
   * The total number of values stored in the multimap.
   *
   * @name module:kalix.replicatedentity.ReplicatedMultiMap#size
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, 'size', {
    get: function () {
      return Array.from(entries.values()).reduce(
        (sum, entry) => sum + entry.values.size,
        0,
      );
    },
  });

  /**
   * The number of keys with values stored in the multimap.
   *
   * @name module:kalix.replicatedentity.ReplicatedMultiMap#keysSize
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, 'keysSize', {
    get: function () {
      return entries.size;
    },
  });

  /**
   * Return an iterator of the keys of this multimap.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#keys
   * @returns {IterableIterator<module:kalix.Serializable>}
   */
  this.keys = function () {
    return iterators.map(entries.values(), (entry) => entry.key);
  };

  /**
   * Clear all entries from this multimap.
   *
   * @function module:kalix.replicatedentity.ReplicatedMultiMap#clear
   * @return {module:kalix.replicatedentity.ReplicatedMultiMap} This multimap.
   */
  this.clear = function () {
    if (entries.size > 0) {
      cleared = true;
      entries.clear();
      removed.clear();
    }
    return this;
  };

  this.getOrCreateValues = function (key) {
    const comparableKey = AnySupport.toComparable(key);
    const entry = entries.get(comparableKey);
    if (entry) {
      return entry.values;
    } else {
      const values = new ReplicatedSet();
      entries.set(comparableKey, { key: key, values: values });
      return values;
    }
  };

  this.getAndResetDelta = function (initial) {
    const updated = [];
    entries.forEach(({ key: key, values: values }, comparableKey) => {
      const delta = values.getAndResetDelta();
      if (delta !== null) {
        updated.push({
          key: AnySupport.serialize(key, true, true),
          delta: delta.replicatedSet,
        });
      }
    });
    if (cleared || removed.size > 0 || updated.length > 0 || initial) {
      const delta = {
        replicatedMultiMap: {
          cleared: cleared,
          removed: Array.from(removed.values()).map((key) =>
            AnySupport.serialize(key, true, true),
          ),
          updated: updated,
        },
      };
      cleared = false;
      removed.clear();
      return delta;
    } else {
      return null;
    }
  };

  this.applyDelta = function (delta, anySupport) {
    if (!delta.replicatedMultiMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedMultiMap', delta),
      );
    }
    if (delta.replicatedMultiMap.cleared) {
      entries.clear();
    }
    if (delta.replicatedMultiMap.removed) {
      delta.replicatedMultiMap.removed.forEach((serializedKey) => {
        const key = anySupport.deserialize(serializedKey);
        const comparableKey = AnySupport.toComparable(key);
        if (entries.has(comparableKey)) {
          entries.delete(comparableKey);
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

  this.toString = function () {
    return (
      'ReplicatedMultiMap(' +
      Array.from(entries.values())
        .map(
          (entry) =>
            entry.key + ' -> (' + Array.from(entry.values).join(', ') + ')',
        )
        .join(', ') +
      ')'
    );
  };
}

module.exports = ReplicatedMultiMap;
