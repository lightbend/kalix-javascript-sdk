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
const ReplicatedRegister = require('./register');

/**
 * @classdesc A replicated map of registers.
 *
 * @constructor module:akkaserverless.replicatedentity.ReplicatedRegisterMap
 * @implements module:akkaserverless.replicatedentity.ReplicatedData
 *
 * @param {module:akkaserverless.replicatedentity.ReplicatedMap} [initialMap] An already initialised replicated map underlying this register map.
 */
function ReplicatedRegisterMap(initialMap) {
  const map = initialMap !== undefined ? initialMap : new ReplicatedMap();

  /**
   * Get the value at the given key.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedRegisterMap#get
   * @param {module:akkaserverless.Serializable} key The key to get.
   * @returns {number|undefined} The register value, or undefined if no value is defined at that key.
   */
  this.get = (key) => {
    const register = map.get(key);
    return register !== undefined ? register.value : undefined;
  };

  /**
   * Set the register at the given key to the given value.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedRegisterMap#set
   * @param {module:akkaserverless.Serializable} key The key for the register.
   * @param {module:akkaserverless.Serializable} value The new value for the register.
   * @returns {module:akkaserverless.replicatedentity.ReplicatedRegisterMap} This register map.
   */
  this.set = function (key, value) {
    let register = map.get(key);
    if (register === undefined) {
      register = new ReplicatedRegister(value);
      map.set(key, register);
    } else {
      register.value = value;
    }
    return this;
  };

  /**
   * Check whether this map contains a value of the given key.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedRegisterMap#has
   * @param {module:akkaserverless.Serializable} key The key to check.
   * @returns {boolean} True if this register map contains a value for the given key.
   */
  this.has = function (key) {
    return map.has(key);
  };

  /**
   * The number of elements in this map.
   *
   * @name module:akkaserverless.replicatedentity.ReplicatedRegisterMap#size
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, 'size', {
    get: function () {
      return map.size;
    },
  });

  /**
   * Return an iterator of the keys of this register map.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedRegisterMap#keys
   * @returns {IterableIterator<module:akkaserverless.Serializable>}
   */
  this.keys = function () {
    return map.keys();
  };

  /**
   * Delete the register at the given key.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedRegisterMap#delete
   * @param {module:akkaserverless.Serializable} key The key to delete.
   * @return {module:akkaserverless.replicatedentity.ReplicatedRegisterMap} This register map.
   */
  this.delete = function (key) {
    map.delete(key);
    return this;
  };

  /**
   * Clear all registers from this register map.
   *
   * @function module:akkaserverless.replicatedentity.ReplicatedRegisterMap#clear
   * @return {module:akkaserverless.replicatedentity.ReplicatedRegisterMap} This register map.
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
      'ReplicatedRegisterMap(' +
      Array.from(map.entries())
        .map(([key, register]) => key + ' -> ' + register.value)
        .join(', ') +
      ')'
    );
  };
}

module.exports = ReplicatedRegisterMap;
