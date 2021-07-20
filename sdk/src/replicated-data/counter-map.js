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

const ReplicatedMap = require('./map');
const ReplicatedCounter = require('./counter');

/**
 * @classdesc A replicated map of counters.
 *
 * @constructor module:akkaserverless.replicatedentity.ReplicatedCounterMap
 * @implements module:akkaserverless.replicatedentity.ReplicatedData
 *
 * @param {module:akkaserverless.replicatedentity.ReplicatedMap} [initialMap] An already initialised replicated map underlying this counter map.
 */
function ReplicatedCounterMap(initialMap) {
  const map = initialMap !== undefined ? initialMap : new ReplicatedMap();

  /**
   * Get the value at the given key.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedCounterMap#get
   * @param {module:akkaserverless.Serializable} key The key to get.
   * @returns {number|undefined} The counter value, or undefined if no value is defined at that key.
   */
  this.get = (key) => {
    const counter = map.get(key);
    return counter !== undefined ? counter.value : undefined;
  };

  /**
   * Get the value as a long at the given key.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedCounterMap#getLong
   * @param {module:akkaserverless.Serializable} key The key to get.
   * @returns {Long|undefined} The counter value as a long, or undefined if no value is defined at that key.
   */
  this.getLong = (key) => {
    const counter = map.get(key);
    return counter !== undefined ? counter.longValue : undefined;
  };

  /**
   * Increment the counter at the given key by the given number.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedCounterMap#increment
   * @param {module:akkaserverless.Serializable} key The key for the counter to increment.
   * @param {Long|number} increment The amount to increment the counter by. If negative, it will be decremented instead.
   * @returns {module:akkaserverless.replicatedentity.ReplicatedCounterMap} This counter map.
   */
  this.increment = function (key, increment) {
    let counter = map.get(key);
    if (counter === undefined) {
      counter = new ReplicatedCounter();
      map.set(key, counter);
    }
    counter.increment(increment);
    return this;
  };

  /**
   * Decrement the counter at the given key by the given number.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedCounterMap#decrement
   * @param {module:akkaserverless.Serializable} key The key for the counter to decrement.
   * @param {Long|number} decrement The amount to decrement the counter by. If negative, it will be decremented instead.
   * @returns {module:akkaserverless.replicatedentity.ReplicatedCounterMap} This counter map.
   */
  this.decrement = function (key, decrement) {
    let counter = map.get(key);
    if (counter === undefined) {
      counter = new ReplicatedCounter();
      map.set(key, counter);
    }
    counter.decrement(decrement);
    return this;
  };

  /**
   * Check whether this map contains a value of the given key.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedCounterMap#has
   * @param {module:akkaserverless.Serializable} key The key to check.
   * @returns {boolean} True if this counter map contains a value for the given key.
   */
  this.has = function (key) {
    return map.has(key);
  };

  /**
   * The number of elements in this map.
   *
   * @name module:akkaserverless.replicatedentity.ReplicatedCounterMap#size
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, 'size', {
    get: function () {
      return map.size;
    },
  });

  /**
   * Return an iterator of the keys of this counter map.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedCounterMap#keys
   * @returns {IterableIterator<module:akkaserverless.Serializable>}
   */
  this.keys = function () {
    return map.keys();
  };

  /**
   * Delete the counter at the given key.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedCounterMap#delete
   * @param {module:akkaserverless.Serializable} key The key to delete.
   * @return {module:akkaserverless.replicatedentity.ReplicatedCounterMap} This counter map.
   */
  this.delete = function (key) {
    map.delete(key);
    return this;
  };

  /**
   * Clear all counters from this counter map.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedCounterMap#clear
   * @return {module:akkaserverless.replicatedentity.ReplicatedCounterMap} This counter map.
   */
  this.clear = function () {
    map.clear();
    return this;
  };

  this.getAndResetDelta = function (initial) {
    return map.getAndResetDelta(initial);
  };

  this.applyDelta = function (delta, anySupport, createForDelta) {
    map.applyDelta(delta, anySupport, createForDelta);
  };

  this.toString = function () {
    return (
      'ReplicatedCounterMap(' +
      Array.from(map.entries())
        .map(([key, counter]) => key + ' -> ' + counter.value)
        .join(', ') +
      ')'
    );
  };
}

module.exports = ReplicatedCounterMap;
