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
const ReplicatedRegister = require('./register');
const AnySupport = require('../protobuf-any');
const protobufHelper = require('../protobuf-helper');
const iterators = require('./iterators');
const util = require('util');

const Clocks =
  protobufHelper.moduleRoot.akkaserverless.component.replicatedentity
    .ReplicatedEntityClock;

/**
 * @classdesc A replicated map of registers.
 *
 * @constructor module:kalix.replicatedentity.ReplicatedRegisterMap
 * @implements module:kalix.replicatedentity.ReplicatedData
 */
function ReplicatedRegisterMap() {
  const registers = new Map();
  const removed = new Map();
  let cleared = false;

  /**
   * Get the value at the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedRegisterMap#get
   * @param {module:kalix.Serializable} key The key to get.
   * @returns {number|undefined} The register value, or undefined if no value is defined at that key.
   */
  this.get = (key) => {
    const entry = registers.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.register.value : undefined;
  };

  /**
   * Set the register at the given key to the given value.
   *
   * @function module:kalix.replicatedentity.ReplicatedRegisterMap#set
   * @param {module:kalix.Serializable} key The key for the register.
   * @param {module:kalix.Serializable} value The new value for the register.
   * @param {module:kalix.replicatedentity.Clock} [clock=Clocks.DEFAULT] The register clock.
   * @param {number} [customClockValue=0] Clock value when using custom clock, otherwise ignored.
   * @returns {module:kalix.replicatedentity.ReplicatedRegisterMap} This register map.
   */
  this.set = function (
    key,
    value,
    clock = Clocks.DEFAULT,
    customClockValue = 0,
  ) {
    this.getOrCreateRegister(key).setWithClock(value, clock, customClockValue);
    return this;
  };

  /**
   * Check whether this map contains a value of the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedRegisterMap#has
   * @param {module:kalix.Serializable} key The key to check.
   * @returns {boolean} True if this register map contains a value for the given key.
   */
  this.has = function (key) {
    return registers.has(AnySupport.toComparable(key));
  };

  /**
   * The number of elements in this map.
   *
   * @name module:kalix.replicatedentity.ReplicatedRegisterMap#size
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, 'size', {
    get: function () {
      return registers.size;
    },
  });

  /**
   * Return an iterator of the keys of this register map.
   *
   * @function module:kalix.replicatedentity.ReplicatedRegisterMap#keys
   * @returns {IterableIterator<module:kalix.Serializable>}
   */
  this.keys = function () {
    return iterators.map(registers.values(), (entry) => entry.key);
  };

  /**
   * Delete the register at the given key.
   *
   * @function module:kalix.replicatedentity.ReplicatedRegisterMap#delete
   * @param {module:kalix.Serializable} key The key to delete.
   * @return {module:kalix.replicatedentity.ReplicatedRegisterMap} This register map.
   */
  this.delete = function (key) {
    const comparableKey = AnySupport.toComparable(key);
    if (registers.has(comparableKey)) {
      registers.delete(comparableKey);
      removed.set(comparableKey, key);
    }
    return this;
  };

  /**
   * Clear all registers from this register map.
   *
   * @function module:kalix.replicatedentity.ReplicatedRegisterMap#clear
   * @return {module:kalix.replicatedentity.ReplicatedRegisterMap} This register map.
   */
  this.clear = function () {
    if (registers.size > 0) {
      cleared = true;
      registers.clear();
      removed.clear();
    }
    return this;
  };

  this.getOrCreateRegister = function (key) {
    const comparableKey = AnySupport.toComparable(key);
    const entry = registers.get(comparableKey);
    if (entry) {
      return entry.register;
    } else {
      const register = new ReplicatedRegister({});
      registers.set(comparableKey, { key: key, register: register });
      return register;
    }
  };

  this.getAndResetDelta = function (initial) {
    const updated = [];
    registers.forEach(({ key: key, register: register }, comparableKey) => {
      const delta = register.getAndResetDelta();
      if (delta !== null) {
        updated.push({
          key: AnySupport.serialize(key, true, true),
          delta: delta.register,
        });
      }
    });
    if (cleared || removed.size > 0 || updated.length > 0 || initial) {
      const delta = {
        replicatedRegisterMap: {
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
    if (!delta.replicatedRegisterMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedRegisterMap', delta),
      );
    }
    if (delta.replicatedRegisterMap.cleared) {
      registers.clear();
    }
    if (delta.replicatedRegisterMap.removed) {
      delta.replicatedRegisterMap.removed.forEach((serializedKey) => {
        const key = anySupport.deserialize(serializedKey);
        const comparableKey = AnySupport.toComparable(key);
        if (registers.has(comparableKey)) {
          registers.delete(comparableKey);
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

  this.toString = function () {
    return (
      'ReplicatedRegisterMap(' +
      Array.from(registers.values())
        .map((entry) => entry.key + ' -> ' + entry.register.value)
        .join(', ') +
      ')'
    );
  };
}

module.exports = ReplicatedRegisterMap;
