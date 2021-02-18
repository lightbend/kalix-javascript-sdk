/*
 * Copyright 2019 Lightbend Inc.
 */

const util = require("util");
const Long = require("long");

/**
 * @classdesc A Positive-Negative Counter CRDT.
 *
 * A counter that can be incremented and decremented.
 *
 * The value is stored as a 64-bit signed long, hence values over `2^63 - 1` and less than `2^63` can't be represented.
 *
 * @constructor module:akkaserverless.crdt.PNCounter
 * @implements module:akkaserverless.crdt.CrdtState
 */
function PNCounter() {
  let currentValue = Long.ZERO;
  let delta = Long.ZERO;

  /**
   * The value as a long.
   *
   * @name module:akkaserverless.crdt.PNCounter#longValue
   * @type {Long}
   * @readonly
   */
  Object.defineProperty(this, "longValue", {
    get: function () {
      return currentValue;
    }
  });

  /**
   * The value as a number. Note that once the value exceeds `2^53`, this will not be an accurate
   * representation of the value. If you expect it to exceed `2^53`, {@link module:akkaserverless.crdt.PNCounter#longValue}
   * should be used instead.
   *
   * @name module:akkaserverless.crdt.PNCounter#value
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, "value", {
    get: function () {
      return currentValue.toNumber();
    }
  });

  /**
   * Increment the counter by the given number.
   *
   * @function module:akkaserverless.crdt.PNCounter#increment
   * @param {Long|number} increment The amount to increment the counter by. If negative, it will be decremented instead.
   * @returns {module:akkaserverless.crdt.PNCounter} This counter.
   */
  this.increment = function (increment) {
    currentValue = currentValue.add(increment);
    delta = delta.add(increment);
    return this;
  };

  /**
   * Decrement the counter by the given number.
   *
   * @function module:akkaserverless.crdt.PNCounter#decrement
   * @param {Long|number} decrement The amount to decrement the counter by. If negative, it will be incremented instead.
   * @returns {module:akkaserverless.crdt.PNCounter} This counter.
   */
  this.decrement = function (decrement) {
    currentValue = currentValue.subtract(decrement);
    delta = delta.subtract(decrement);
    return this;
  };

  this.getAndResetDelta = function (initial) {
    if (!delta.isZero() || initial) {
      const crdtDelta = {
        pncounter: {
          change: delta
        }
      };
      delta = Long.ZERO;
      return crdtDelta;
    } else {
      return null;
    }
  };

  this.applyDelta = function (delta) {
    if (!delta.pncounter) {
      throw new Error(util.format("Cannot apply delta %o to PNCounter", delta));
    }
    currentValue = currentValue.add(delta.pncounter.change);
  };

  this.toString = function () {
    return "PNCounter(" + currentValue + ")";
  };
}

module.exports = PNCounter;
