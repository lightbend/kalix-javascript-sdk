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
const GSet = require('./gset');
const ORSet = require('./orset');
const LWWRegister = require('./lwwregister');
const Flag = require('./flag');
const ORMap = require('./ormap');
const Vote = require('./vote');

const Empty = protobufHelper.moduleRoot.google.protobuf.Empty;

/**
 * All Replicated Data types and Replicated Data type support classes.
 *
 * @namespace module:akkaserverless.replicatedentity
 */

/**
 * A Replicated Data type.
 *
 * @interface module:akkaserverless.replicatedentity.ReplicatedData
 */

/**
 * A clock that may be used by {@link module:akkaserverless.replicatedentity.LWWRegister}.
 *
 * @typedef module:akkaserverless.replicatedentity.Clock
 */

/**
 * An enum of all clocks that can be used by {@link module:akkaserverless.replicatedentity.LWWRegister}.
 *
 * @name module:akkaserverless.replicatedentity.Clocks
 * @enum {module:akkaserverless.replicatedentity.Clock}
 * @property DEFAULT The default clock, uses the machines system time.
 * @property REVERSE A reverse clock, for achieving first-write-wins semantics.
 * @property CUSTOM A custom clock.
 * @property CUSTOM_AUTO_INCREMENT A custom clock that automatically increments if the current clock value
 * is less than the existing clock value.
 */
const Clocks = (function () {
  const ReplicatedEntityClock =
    protobufHelper.moduleRoot.akkaserverless.component.replicatedentity
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

/**
 * A write consistency setting for replication of state updates.
 *
 * @typedef module:akkaserverless.replicatedentity.WriteConsistency
 */

/**
 * An enum of write consistency settings, for replication of state updates.
 *
 * @name module:akkaserverless.replicatedentity.WriteConsistencies
 * @enum {module:akkaserverless.replicatedentity.WriteConsistency}
 * @property LOCAL Updates will only be written to the local replica immediately, and then asynchronously
 *                 distributed to other replicas in the background.
 * @property MAJORITY Updates will be written immediately to a majority of replicas, and then asynchronously
 *                    distributed to remaining replicas in the background.
 * @property ALL Updates will be written immediately to all replicas.
 */
const WriteConsistencies = (function () {
  const ReplicatedEntityWriteConsistency =
    protobufHelper.moduleRoot.akkaserverless.component.replicatedentity
      .ReplicatedEntityWriteConsistency;
  const values = {
    LOCAL:
      ReplicatedEntityWriteConsistency.REPLICATED_ENTITY_WRITE_CONSISTENCY_LOCAL_UNSPECIFIED,
    MAJORITY:
      ReplicatedEntityWriteConsistency.REPLICATED_ENTITY_WRITE_CONSISTENCY_MAJORITY,
    ALL: ReplicatedEntityWriteConsistency.REPLICATED_ENTITY_WRITE_CONSISTENCY_ALL,
  };
  return Object.freeze(values);
})();

function createForDelta(delta) {
  if (delta.counter) {
    return new ReplicatedCounter();
  } else if (delta.gset) {
    return new GSet();
  } else if (delta.orset) {
    return new ORSet();
  } else if (delta.lwwregister) {
    // It needs to be initialised with a value
    return new LWWRegister(Empty.create({}));
  } else if (delta.flag) {
    return new Flag();
  } else if (delta.ormap) {
    return new ORMap();
  } else if (delta.vote) {
    return new Vote();
  } else {
    throw new Error(util.format('Unknown Replicated Data type: %o', delta));
  }
}

module.exports = {
  createForDelta: createForDelta,
  ReplicatedCounter: ReplicatedCounter,
  GSet: GSet,
  ORSet: ORSet,
  LWWRegister: LWWRegister,
  Flag: Flag,
  ORMap: ORMap,
  Vote: Vote,
  Clocks: Clocks,
  WriteConsistencies: WriteConsistencies,
};
