/*
 * Copyright 2019 Lightbend Inc.
 */

const util = require("util");
const protobufHelper = require("../protobuf-helper");

const GCounter = require("./gcounter");
const PNCounter = require("./pncounter");
const GSet = require("./gset");
const ORSet = require("./orset");
const LWWRegister = require("./lwwregister");
const Flag = require("./flag");
const ORMap = require("./ormap");
const Vote = require("./vote");

const Empty = protobufHelper.moduleRoot.google.protobuf.Empty;

/**
 * All CRDTs and CRDT support classes.
 *
 * @namespace module:akkaserverless.crdt
 */

/**
 * A Conflict-free Replicated Data Type.
 *
 * @interface module:akkaserverless.crdt.CrdtState
 */

/**
 * A clock that may be used by {@link module:akkaserverless.crdt.LWWRegister}.
 *
 * @typedef module:akkaserverless.crdt.Clock
 */

/**
 * An enum of all clocks that can be used by {@link module:akkaserverless.crdt.LWWRegister}.
 *
 * @name module:akkaserverless.crdt.Clocks
 * @enum {module:akkaserverless.crdt.Clock}
 * @property DEFAULT The default clock, uses the machines system time.
 * @property REVERSE A reverse clock, for achieving first-write-wins semantics.
 * @property CUSTOM A custom clock.
 * @property CUSTOM_AUTO_INCREMENT A custom clock that automatically increments if the current clock value
 * is less than the existing clock value.
 */
const Clocks = protobufHelper.moduleRoot.akkaserverless.crdt.CrdtClock;

/**
 * A write consistency setting for replication of state updates.
 *
 * @typedef module:akkaserverless.crdt.WriteConsistency
 */

/**
 * An enum of write consistency settings, for replication of state updates.
 *
 * @name module:akkaserverless.crdt.WriteConsistencies
 * @enum {module:akkaserverless.crdt.WriteConsistency}
 * @property LOCAL Updates will only be written to the local replica immediately, and then asynchronously
 *                 distributed to other replicas in the background.
 * @property MAJORITY Updates will be written immediately to a majority of replicas, and then asynchronously
 *                    distributed to remaining replicas in the background.
 * @property ALL Updates will be written immediately to all replicas.
 */
const WriteConsistencies = protobufHelper.moduleRoot.akkaserverless.crdt.CrdtWriteConsistency;

function createCrdtForDelta(delta) {
  if (delta.gcounter) {
    return new GCounter();
  } else if (delta.pncounter) {
    return new PNCounter();
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
    throw new Error(util.format("Unknown CRDT: %o", delta))
  }
}

module.exports = {
  createCrdtForDelta: createCrdtForDelta,
  GCounter: GCounter,
  PNCounter: PNCounter,
  GSet: GSet,
  ORSet: ORSet,
  LWWRegister: LWWRegister,
  Flag: Flag,
  ORMap: ORMap,
  Vote: Vote,
  Clocks: Clocks,
  WriteConsistencies: WriteConsistencies
};
