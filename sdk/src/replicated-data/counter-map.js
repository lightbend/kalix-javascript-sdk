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
const ReplicatedCounter = require('./counter');
const AnySupport = require('../protobuf-any');
const iterators = require('./iterators');
const util = require('util');

/**
 * @classdesc A replicated map of counters.
 *
 * @constructor module:kalix.replicatedentity.ReplicatedCounterMap
 * @implements module:kalix.replicatedentity.ReplicatedData
 */
function ReplicatedCounterMap() {
  const counters = new Map();
  const removed = new Map();
  let cleared = false;

  /**
   * Get the value at the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedCounterMap#get
   * @param {module:kalix.Serializable} key The key to get.
   * @returns {number|undefined} The counter value, or undefined if no value is defined at that key.
   */
  this.get = (key) => {
    const entry = counters.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.counter.value : undefined;
  };

  /**
   * Get the value as a long at the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedCounterMap#getLong
   * @param {module:kalix.Serializable} key The key to get.
   * @returns {Long|undefined} The counter value as a long, or undefined if no value is defined at that key.
   */
  this.getLong = (key) => {
    const entry = counters.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.counter.longValue : undefined;
  };

  /**
   * Increment the counter at the given key by the given number.
   *
   * @function module:kalix.replicatedentity.ReplicatedCounterMap#increment
   * @param {module:kalix.Serializable} key The key for the counter to increment.
   * @param {Long|number} increment The amount to increment the counter by. If negative, it will be decremented instead.
   * @returns {module:kalix.replicatedentity.ReplicatedCounterMap} This counter map.
   */
  this.increment = function (key, increment) {
    this.getOrCreateCounter(key).increment(increment);
    return this;
  };

  /**
   * Decrement the counter at the given key by the given number.
   *
   * @function module:kalix.replicatedentity.ReplicatedCounterMap#decrement
   * @param {module:kalix.Serializable} key The key for the counter to decrement.
   * @param {Long|number} decrement The amount to decrement the counter by. If negative, it will be incremented instead.
   * @returns {module:kalix.replicatedentity.ReplicatedCounterMap} This counter map.
   */
  this.decrement = function (key, decrement) {
    this.getOrCreateCounter(key).decrement(decrement);
    return this;
  };

  /**
   * Check whether this map contains a value of the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedCounterMap#has
   * @param {module:kalix.Serializable} key The key to check.
   * @returns {boolean} True if this counter map contains a value for the given key.
   */
  this.has = function (key) {
    return counters.has(AnySupport.toComparable(key));
  };

  /**
   * The number of elements in this map.
   *
   * @name module:kalix.replicatedentity.ReplicatedCounterMap#size
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, 'size', {
    get: function () {
      return counters.size;
    },
  });

  /**
   * Return an iterator of the keys of this counter map.
   *
   * @function module:kalix.replicatedentity.ReplicatedCounterMap#keys
   * @returns {IterableIterator<module:kalix.Serializable>}
   */
  this.keys = function () {
    return iterators.map(counters.values(), (entry) => entry.key);
  };

  /**
   * Delete the counter at the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedCounterMap#delete
   * @param {module:kalix.Serializable} key The key to delete.
   * @return {module:kalix.replicatedentity.ReplicatedCounterMap} This counter map.
   */
  this.delete = function (key) {
    const comparableKey = AnySupport.toComparable(key);
    if (counters.has(comparableKey)) {
      counters.delete(comparableKey);
      removed.set(comparableKey, key);
    }
    return this;
  };

  /**
   * Clear all counters from this counter map.
   *
   * @function module:kalix.replicatedentity.ReplicatedCounterMap#clear
   * @return {module:kalix.replicatedentity.ReplicatedCounterMap} This counter map.
   */
  this.clear = function () {
    if (counters.size > 0) {
      cleared = true;
      counters.clear();
      removed.clear();
    }
    return this;
  };

  this.getOrCreateCounter = function (key) {
    const comparableKey = AnySupport.toComparable(key);
    const entry = counters.get(comparableKey);
    if (entry) {
      return entry.counter;
    } else {
      const counter = new ReplicatedCounter();
      counters.set(comparableKey, { key: key, counter: counter });
      return counter;
    }
  };

  this.getAndResetDelta = function (initial) {
    const updated = [];
    counters.forEach(({ key: key, counter: counter }, comparableKey) => {
      const delta = counter.getAndResetDelta();
      if (delta !== null) {
        updated.push({
          key: AnySupport.serialize(key, true, true),
          delta: delta.counter,
        });
      }
    });
    if (cleared || removed.size > 0 || updated.length > 0 || initial) {
      const delta = {
        replicatedCounterMap: {
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
    if (!delta.replicatedCounterMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedCounterMap', delta),
      );
    }
    if (delta.replicatedCounterMap.cleared) {
      counters.clear();
    }
    if (delta.replicatedCounterMap.removed) {
      delta.replicatedCounterMap.removed.forEach((serializedKey) => {
        const key = anySupport.deserialize(serializedKey);
        const comparableKey = AnySupport.toComparable(key);
        if (counters.has(comparableKey)) {
          counters.delete(comparableKey);
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

  this.toString = function () {
    return (
      'ReplicatedCounterMap(' +
      Array.from(counters.values())
        .map((entry) => entry.key + ' -> ' + entry.counter.value)
        .join(', ') +
      ')'
    );
  };
}

module.exports = ReplicatedCounterMap;
