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

const should = require('chai').should();
const ReplicatedData = require('../../src/replicated-data');
const ReplicatedCounterMap = require('../../src/replicated-data/counter-map');
const ReplicatedMap = require('../../src/replicated-data/map');
const protobuf = require('protobufjs');
const protobufHelper = require('../../src/protobuf-helper');
const AnySupport = require('../../src/protobuf-any');

const ReplicatedEntityDelta =
  protobufHelper.moduleRoot.akkaserverless.component.replicatedentity
    .ReplicatedEntityDelta;

const root = new protobuf.Root();
const anySupport = new AnySupport(root);

function roundTripDelta(delta) {
  return ReplicatedEntityDelta.decode(
    ReplicatedEntityDelta.encode(delta).finish(),
  );
}

function toAny(value) {
  return AnySupport.serialize(value, true, true);
}

function fromAnys(values) {
  return values.map((any) => anySupport.deserialize(any));
}

function deltaEntries(entries) {
  return entries.map((entry) => {
    return {
      key: anySupport.deserialize(entry.key),
      delta: entry.delta.counter.change.toNumber(),
    };
  });
}

function counterDelta(key, value) {
  return { key: toAny(key), delta: { counter: { change: value } } };
}

describe('ReplicatedCounterMap', () => {
  it('should have no elements when instantiated', () => {
    const counterMap = new ReplicatedCounterMap();
    counterMap.size.should.equal(0);
    should.equal(counterMap.getAndResetDelta(), null);
  });

  it('should reflect an initial delta', () => {
    const counterMap = new ReplicatedCounterMap();
    counterMap.applyDelta(
      roundTripDelta({
        replicatedMap: {
          added: [counterDelta('one', 1), counterDelta('two', 2)],
        },
      }),
      anySupport,
      ReplicatedData.createForDelta,
    );
    Array.from(counterMap.keys()).should.have.members(['one', 'two']);
    counterMap.get('one').should.equal(1);
    counterMap.get('two').should.equal(2);
    counterMap.getLong('one').toNumber().should.equal(1);
    counterMap.getLong('two').toNumber().should.equal(2);
    should.equal(counterMap.getAndResetDelta(), null);
  });

  it('should wrap an initial ReplicatedMap', () => {
    const map = new ReplicatedMap();
    map.applyDelta(
      roundTripDelta({
        replicatedMap: {
          added: [counterDelta('one', 3), counterDelta('two', 4)],
        },
      }),
      anySupport,
      ReplicatedData.createForDelta,
    );
    const counterMap = new ReplicatedCounterMap(map);
    Array.from(counterMap.keys()).should.have.members(['one', 'two']);
    counterMap.get('one').should.equal(3);
    counterMap.get('two').should.equal(4);
    should.equal(counterMap.getAndResetDelta(), null);
  });

  it('should generate an added delta', () => {
    const counterMap = new ReplicatedCounterMap();
    counterMap.increment('one', 1);
    counterMap.has('one').should.be.true;
    counterMap.size.should.equal(1);

    const delta = roundTripDelta(counterMap.getAndResetDelta());
    deltaEntries(delta.replicatedMap.added).should.have.deep.members([
      { key: 'one', delta: 1 },
    ]);
    delta.replicatedMap.updated.should.be.empty;
    delta.replicatedMap.removed.should.be.empty;
    delta.replicatedMap.cleared.should.be.false;
  });

  it('should generate a removed delta', () => {
    const counterMap = new ReplicatedCounterMap();
    counterMap.increment('one', 1);
    counterMap.increment('two', 2);
    counterMap.getAndResetDelta();
    counterMap.delete('one');
    counterMap.size.should.equal(1);
    counterMap.has('one').should.be.false;
    counterMap.has('two').should.be.true;

    const delta = roundTripDelta(counterMap.getAndResetDelta());
    fromAnys(delta.replicatedMap.removed).should.have.members(['one']);
    delta.replicatedMap.added.should.be.empty;
    delta.replicatedMap.updated.should.be.empty;
    delta.replicatedMap.cleared.should.be.false;
  });

  it('should generate an updated delta', () => {
    const counterMap = new ReplicatedCounterMap();
    counterMap.increment('one', 1);
    counterMap.getAndResetDelta();
    counterMap.increment('one', 42);

    const delta = roundTripDelta(counterMap.getAndResetDelta());
    deltaEntries(delta.replicatedMap.updated).should.have.deep.members([
      { key: 'one', delta: 42 },
    ]);
    delta.replicatedMap.added.should.be.empty;
    delta.replicatedMap.removed.should.be.empty;
    delta.replicatedMap.cleared.should.be.false;
  });

  it('should generate a cleared delta', () => {
    const counterMap = new ReplicatedCounterMap();
    counterMap.increment('one', 1);
    counterMap.increment('two', 2);
    counterMap.getAndResetDelta();
    counterMap.clear();
    counterMap.size.should.equal(0);

    const delta = roundTripDelta(counterMap.getAndResetDelta());
    delta.replicatedMap.cleared.should.be.true;
    delta.replicatedMap.added.should.be.empty;
    delta.replicatedMap.updated.should.be.empty;
    delta.replicatedMap.removed.should.be.empty;
  });
});
