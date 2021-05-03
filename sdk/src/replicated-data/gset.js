/*
 * Copyright 2021 Lightbend Inc.
 */

const debug = require("debug")("akkaserverless-replicated-entity");
const util = require("util");
const AnySupport = require("../protobuf-any");

/**
 * @classdesc A Grow-only Set Replicated Data type.
 *
 * A grow only set can have elements added to it, but not removed.
 *
 * @constructor module:akkaserverless.replicatedentity.GSet
 * @implements module:akkaserverless.replicatedentity.ReplicatedData
 */
function GSet() {
  // Map of a comparable form (that compares correctly using ===) of the elements to the elements
  let currentValue = new Map();
  let delta = new Set();

  /**
   * Does this set contain the given element?
   *
   * @function module:akkaserverless.replicatedentity.GSet#has
   * @param {module:akkaserverless.Serializable} element The element to check.
   * @returns {boolean} True if the set contains the element.
   */
  this.has = function (element) {
    return currentValue.has(AnySupport.toComparable(element));
  };

  /**
   * The size of this set.
   *
   * @name module:akkaserverless.replicatedentity.GSet#size
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, "size", {
    get: function () {
      return currentValue.size;
    }
  });

  /**
   * Callback for handling elements iterated through by {@link module:akkaserverless.replicatedentity.GSet#forEach}.
   *
   * @callback module:akkaserverless.replicatedentity.GSet~forEachCallback
   * @param {module:akkaserverless.Serializable} element The element.
   */

  /**
   * Execute the given callback for each element.
   *
   * @function module:akkaserverless.replicatedentity.GSet#forEach
   * @param {module:akkaserverless.replicatedentity.GSet~forEachCallback} callback The callback to handle each element.
   */
  this.forEach = function (callback) {
    currentValue.forEach((value, key) => callback(value));
  };

  /**
   * Create an iterator for this set.
   *
   * @function module:akkaserverless.replicatedentity.GSet#@@iterator
   * @returns {iterator<module:akkaserverless.Serializable>}
   */
  this[Symbol.iterator] = function () {
    return currentValue.values();
  };

  /**
   * Add an element to this set.
   *
   * @function module:akkaserverless.replicatedentity.GSet#add
   * @param {module:akkaserverless.Serializable} element The element to add.
   * @return {module:akkaserverless.replicatedentity.GSet} This set.
   */
  this.add = function (element) {
    const comparable = AnySupport.toComparable(element);
    const serializedElement = AnySupport.serialize(element, true, true);

    if (!currentValue.has(comparable)) {
      currentValue.set(comparable, element);
      delta.add(serializedElement);
    }
    return this;
  };

  this.getAndResetDelta = function (initial) {
    if (delta.size > 0 || initial) {
      const currentDelta = {
        gset: {
          added: Array.from(delta)
        }
      };
      delta.clear();
      return currentDelta;
    } else {
      return null;
    }
  };

  this.applyDelta = function (delta, anySupport) {
    if (!delta.gset) {
      throw new Error(util.format("Cannot apply delta %o to GSet", delta));
    }
    if (delta.gset.added !== undefined) {
      delta.gset.added.forEach(element => {
        const value = anySupport.deserialize(element);
        const comparable = AnySupport.toComparable(value);
        currentValue.set(comparable, value);
      });
    } else {
      debug("GSet delta with no items to add?");
    }
  };

  this.toString = function () {
    return "GSet(" + Array.from(currentValue.keys()).join(",") + ")";
  };
}

module.exports = GSet;
