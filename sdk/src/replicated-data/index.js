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

const util = require('util');
const protobufHelper = require('../protobuf-helper');

const ReplicatedCounter = require('./counter');
const ReplicatedSet = require('./set');
const ReplicatedRegister = require('./register');
const ReplicatedMap = require('./map');
const ReplicatedCounterMap = require('./counter-map');
const ReplicatedRegisterMap = require('./register-map');
const ReplicatedMultiMap = require('./multi-map');
const Vote = require('./vote');

const Empty = protobufHelper.moduleRoot.google.protobuf.Empty;

/**
 * All Replicated Data types and Replicated Data type support classes.
 *
 * @namespace module:kalix.replicatedentity
 */

/**
 * A Replicated Data type.
 *
 * @interface module:kalix.replicatedentity.ReplicatedData
 */

/**
 * A clock that may be used by {@link module:kalix.replicatedentity.ReplicatedRegister}.
 *
 * @typedef module:kalix.replicatedentity.Clock
 * @type {number}
 */

/**
 * An enum of all clocks that can be used by {@link module:kalix.replicatedentity.ReplicatedRegister}.
 *
 * @readonly
 * @name module:kalix.replicatedentity.Clocks
 * @enum {module:kalix.replicatedentity.Clock}
 * @property DEFAULT The default clock, uses the machines system time.
 * @property REVERSE A reverse clock, for achieving first-write-wins semantics.
 * @property CUSTOM A custom clock.
 * @property CUSTOM_AUTO_INCREMENT A custom clock that automatically increments if the current clock value
 * is less than the existing clock value.
 */
const Clocks = (function () {
  const ReplicatedEntityClock =
    protobufHelper.moduleRoot.kalix.component.replicatedentity
      .ReplicatedEntityClock;
  const values = {
    DEFAULT: ReplicatedEntityClock.REPLICATED_ENTITY_CLOCK_DEFAULT_UNSPECIFIED,
    REVERSE: ReplicatedEntityClock.REPLICATED_ENTITY_CLOCK_REVERSE,
    CUSTOM: ReplicatedEntityClock.REPLICATED_ENTITY_CLOCK_CUSTOM,
    CUSTOM_AUTO_INCREMENT:
      ReplicatedEntityClock.REPLICATED_ENTITY_CLOCK_CUSTOM_AUTO_INCREMENT,
  };
  return Object.freeze(values);
})();

function createForDelta(delta) {
  if (delta.counter) {
    return new ReplicatedCounter();
  } else if (delta.replicatedSet) {
    return new ReplicatedSet();
  } else if (delta.register) {
    // It needs to be initialised with a value
    return new ReplicatedRegister(Empty.create({}));
  } else if (delta.replicatedMap) {
    return new ReplicatedMap();
  } else if (delta.replicatedCounterMap) {
    return new ReplicatedCounterMap();
  } else if (delta.replicatedRegisterMap) {
    return new ReplicatedRegisterMap();
  } else if (delta.replicatedMultiMap) {
    return new ReplicatedMultiMap();
  } else if (delta.vote) {
    return new Vote();
  } else {
    throw new Error(util.format('Unknown Replicated Data type: %o', delta));
  }
}

module.exports = {
  createForDelta: createForDelta,
  ReplicatedCounter: ReplicatedCounter,
  ReplicatedSet: ReplicatedSet,
  ReplicatedRegister: ReplicatedRegister,
  ReplicatedMap: ReplicatedMap,
  ReplicatedCounterMap: ReplicatedCounterMap,
  ReplicatedRegisterMap: ReplicatedRegisterMap,
  ReplicatedMultiMap: ReplicatedMultiMap,
  Vote: Vote,
  Clocks: Clocks,
};
