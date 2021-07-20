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
const ReplicatedRegisterMap = require('../../src/replicated-data/register-map');
const ReplicatedMap = require('../../src/replicated-data/map');
const path = require('path');
const protobuf = require('protobufjs');
const protobufHelper = require('../../src/protobuf-helper');
const AnySupport = require('../../src/protobuf-any');

const ReplicatedEntityDelta =
  protobufHelper.moduleRoot.akkaserverless.component.replicatedentity
    .ReplicatedEntityDelta;

const root = new protobuf.Root();
root.loadSync(path.join(__dirname, '..', 'example.proto'));
root.resolveAll();
const Example = root.lookupType('com.example.Example');
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
      delta: anySupport.deserialize(entry.delta.register.value),
    };
  });
}

function registerDelta(key, value) {
  return { key: toAny(key), delta: { register: { value: toAny(value) } } };
}

describe('ReplicatedRegisterMap', () => {
  it('should have no elements when instantiated', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.size.should.equal(0);
    should.equal(registerMap.getAndResetDelta(), null);
  });

  it('should reflect an initial delta', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.applyDelta(
      roundTripDelta({
        replicatedMap: {
          added: [
            registerDelta('one', 1),
            registerDelta('two', 'foo'),
            registerDelta('three', Example.create({ field1: 'bar' })),
          ],
        },
      }),
      anySupport,
      ReplicatedData.createForDelta,
    );
    Array.from(registerMap.keys()).should.have.members(['one', 'two', 'three']);
    registerMap.get('one').should.equal(1);
    registerMap.get('two').should.equal('foo');
    registerMap.get('three').field1.should.equal('bar');
    should.equal(registerMap.getAndResetDelta(), null);
  });

  it('should wrap an initial ReplicatedMap', () => {
    const map = new ReplicatedMap();
    map.applyDelta(
      roundTripDelta({
        replicatedMap: {
          added: [
            registerDelta('one', 1),
            registerDelta('two', 'foo'),
            registerDelta('three', Example.create({ field1: 'bar' })),
          ],
        },
      }),
      anySupport,
      ReplicatedData.createForDelta,
    );
    const registerMap = new ReplicatedRegisterMap(map);
    Array.from(registerMap.keys()).should.have.members(['one', 'two', 'three']);
    registerMap.get('one').should.equal(1);
    registerMap.get('two').should.equal('foo');
    registerMap.get('three').field1.should.equal('bar');
    should.equal(registerMap.getAndResetDelta(), null);
  });

  it('should generate an added delta', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 1);
    registerMap.has('one').should.be.true;
    registerMap.size.should.equal(1);

    const delta = roundTripDelta(registerMap.getAndResetDelta());
    deltaEntries(delta.replicatedMap.added).should.have.deep.members([
      { key: 'one', delta: 1 },
    ]);
    delta.replicatedMap.updated.should.be.empty;
    delta.replicatedMap.removed.should.be.empty;
    delta.replicatedMap.cleared.should.be.false;
  });

  it('should generate a removed delta', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 1);
    registerMap.set('two', 'foo');
    registerMap.getAndResetDelta();
    registerMap.delete('one');
    registerMap.size.should.equal(1);
    registerMap.has('one').should.be.false;
    registerMap.has('two').should.be.true;

    const delta = roundTripDelta(registerMap.getAndResetDelta());
    fromAnys(delta.replicatedMap.removed).should.have.members(['one']);
    delta.replicatedMap.added.should.be.empty;
    delta.replicatedMap.updated.should.be.empty;
    delta.replicatedMap.cleared.should.be.false;
  });

  it('should generate an updated delta', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 42);
    registerMap.getAndResetDelta();
    registerMap.set('one', 'forty-two');

    const delta = roundTripDelta(registerMap.getAndResetDelta());
    deltaEntries(delta.replicatedMap.updated).should.have.deep.members([
      { key: 'one', delta: 'forty-two' },
    ]);
    delta.replicatedMap.added.should.be.empty;
    delta.replicatedMap.removed.should.be.empty;
    delta.replicatedMap.cleared.should.be.false;
  });

  it('should generate a cleared delta', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 1);
    registerMap.set('two', 2);
    registerMap.getAndResetDelta();
    registerMap.clear();
    registerMap.size.should.equal(0);

    const delta = roundTripDelta(registerMap.getAndResetDelta());
    delta.replicatedMap.cleared.should.be.true;
    delta.replicatedMap.added.should.be.empty;
    delta.replicatedMap.updated.should.be.empty;
    delta.replicatedMap.removed.should.be.empty;
  });
});
