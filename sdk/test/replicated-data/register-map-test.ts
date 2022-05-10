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
import * as ReplicatedData from '../../src/replicated-data';
const ReplicatedRegisterMap = ReplicatedData.ReplicatedRegisterMap;
const Clocks = ReplicatedData.Clocks;
import * as path from 'path';
import * as protobuf from 'protobufjs';
import AnySupport from '../../src/protobuf-any';
import * as Long from 'long';
import * as proto from '../proto/protobuf-bundle';

namespace protocol {
  export type Any = proto.google.protobuf.IAny;
  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;
  export const Delta =
    proto.kalix.component.replicatedentity.ReplicatedEntityDelta;
  export type EntryDelta =
    proto.kalix.component.replicatedentity.IReplicatedRegisterMapEntryDelta;
}

const root = new protobuf.Root();
root.loadSync(path.join(__dirname, '..', 'example.proto'));
root.resolveAll();
const Example = root.lookupType('com.example.Example');
const anySupport = new AnySupport(root);

function roundTripDelta(delta: protocol.Delta | null): protocol.Delta {
  return delta
    ? protocol.Delta.decode(protocol.Delta.encode(delta).finish())
    : {};
}

function toAny(value: any): protocol.Any {
  return AnySupport.serialize(value, true, true);
}

function fromAnys(values?: protocol.Any[] | null): any[] {
  return values ? values.map((any) => anySupport.deserialize(any)) : [];
}

function toNumber(n?: Long | number | null): number {
  return Long.isLong(n) ? n.toNumber() : n ?? 0;
}

interface Entry {
  key: any;
  delta: any;
}

function deltaEntries(entries?: protocol.EntryDelta[] | null): Entry[] {
  return entries
    ? entries.map((entry) => {
        return {
          key: anySupport.deserialize(entry.key),
          delta: anySupport.deserialize(entry.delta?.value),
        };
      })
    : [];
}

interface EntryWithClock {
  key: any;
  value: any;
  clock: ReplicatedData.Clock | null | undefined;
  customClockValue: number;
}

function deltaEntriesWithClocks(
  entries?: protocol.EntryDelta[] | null,
): EntryWithClock[] {
  return entries
    ? entries.map((entry) => {
        return {
          key: anySupport.deserialize(entry.key),
          value: anySupport.deserialize(entry.delta?.value),
          clock: entry.delta?.clock,
          customClockValue: toNumber(entry.delta?.customClockValue),
        };
      })
    : [];
}

function registerDelta(key: any, value: any): protocol.EntryDelta {
  return { key: toAny(key), delta: { value: toAny(value) } };
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
        replicatedRegisterMap: {
          updated: [
            registerDelta('one', 1),
            registerDelta('two', 'foo'),
            registerDelta('three', Example.create({ field1: 'bar' })),
          ],
        },
      }),
      anySupport,
    );
    Array.from(registerMap.keys()).should.have.members(['one', 'two', 'three']);
    registerMap.get('one')?.should.equal(1);
    registerMap.get('two')?.should.equal('foo');
    registerMap.get('three').field1.should.equal('bar');
    should.equal(registerMap.getAndResetDelta(), null);
  });

  it('should generate an added delta', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 1);
    registerMap.has('one').should.be.true;
    registerMap.size.should.equal(1);

    const delta = roundTripDelta(registerMap.getAndResetDelta());
    deltaEntries(delta.replicatedRegisterMap?.updated).should.have.deep.members(
      [{ key: 'one', delta: 1 }],
    );
    delta.replicatedRegisterMap?.removed?.should.be.empty;
    delta.replicatedRegisterMap?.cleared?.should.be.false;
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
    fromAnys(delta.replicatedRegisterMap?.removed).should.have.members(['one']);
    delta.replicatedRegisterMap?.updated?.should.be.empty;
    delta.replicatedRegisterMap?.cleared?.should.be.false;
  });

  it('should generate an updated delta', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 42);
    registerMap.getAndResetDelta();
    registerMap.set('one', 'forty-two');

    const delta = roundTripDelta(registerMap.getAndResetDelta());
    deltaEntries(delta.replicatedRegisterMap?.updated).should.have.deep.members(
      [{ key: 'one', delta: 'forty-two' }],
    );
    delta.replicatedRegisterMap?.removed?.should.be.empty;
    delta.replicatedRegisterMap?.cleared?.should.be.false;
  });

  it('should generate a cleared delta', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 1);
    registerMap.set('two', 2);
    registerMap.getAndResetDelta();
    registerMap.clear();
    registerMap.size.should.equal(0);

    const delta = roundTripDelta(registerMap.getAndResetDelta());
    delta.replicatedRegisterMap?.cleared?.should.be.true;
    delta.replicatedRegisterMap?.updated?.should.be.empty;
    delta.replicatedRegisterMap?.removed?.should.be.empty;
  });

  it('should generate a delta with clocks', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set(1, 'foo');
    registerMap.set(2, 'bar', Clocks.REVERSE);
    registerMap.set(3, 'baz', Clocks.CUSTOM, 42);

    const delta = roundTripDelta(registerMap.getAndResetDelta());
    deltaEntriesWithClocks(
      delta.replicatedRegisterMap?.updated,
    ).should.have.deep.members([
      { key: 1, value: 'foo', clock: Clocks.DEFAULT, customClockValue: 0 },
      { key: 2, value: 'bar', clock: Clocks.REVERSE, customClockValue: 0 },
      { key: 3, value: 'baz', clock: Clocks.CUSTOM, customClockValue: 42 },
    ]);
    delta.replicatedRegisterMap?.removed?.should.be.empty;
    delta.replicatedRegisterMap?.cleared?.should.be.false;
  });

  it('should reflect a delta with added entries', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 1);
    registerMap.getAndResetDelta();
    registerMap.applyDelta(
      roundTripDelta({
        replicatedRegisterMap: {
          updated: [registerDelta('two', 2)],
        },
      }),
      anySupport,
    );
    registerMap.size.should.equal(2);
    Array.from(registerMap.keys()).should.have.members(['one', 'two']);
    registerMap.get('two')?.should.equal(2);
    should.equal(registerMap.getAndResetDelta(), null);
  });

  it('should reflect a delta with removed entries', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 1);
    registerMap.set('two', 2);
    registerMap.getAndResetDelta();
    registerMap.applyDelta(
      roundTripDelta({
        replicatedRegisterMap: {
          removed: [toAny('two')],
        },
      }),
      anySupport,
    );
    registerMap.size.should.equal(1);
    Array.from(registerMap.keys()).should.have.members(['one']);
    should.equal(registerMap.getAndResetDelta(), null);
  });

  it('should reflect a delta with cleared entries', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set('one', 1);
    registerMap.set('two', 2);
    registerMap.getAndResetDelta();
    registerMap.applyDelta(
      roundTripDelta({
        replicatedRegisterMap: {
          cleared: true,
        },
      }),
      anySupport,
    );
    registerMap.size.should.equal(0);
    should.equal(registerMap.getAndResetDelta(), null);
  });

  it('should support protobuf messages for keys', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set(Example.create({ field1: 'one' }), 1);
    registerMap.set(Example.create({ field1: 'two' }), 2);
    registerMap.getAndResetDelta();
    registerMap.delete(Example.create({ field1: 'one' }));
    registerMap.size.should.equal(1);
    const delta = roundTripDelta(registerMap.getAndResetDelta());
    delta.replicatedRegisterMap?.removed?.should.have.lengthOf(1);
    fromAnys(delta.replicatedRegisterMap?.removed)[0].field1.should.equal(
      'one',
    );
    delta.replicatedRegisterMap?.updated?.should.be.empty;
    delta.replicatedRegisterMap?.cleared?.should.be.false;
  });

  it('should support json objects for keys', () => {
    const registerMap = new ReplicatedRegisterMap();
    registerMap.set({ foo: 'one' }, 1);
    registerMap.set({ foo: 'two' }, 2);
    registerMap.getAndResetDelta();
    registerMap.delete({ foo: 'one' });
    registerMap.size.should.equal(1);
    const delta = roundTripDelta(registerMap.getAndResetDelta());
    delta.replicatedRegisterMap?.removed?.should.have.lengthOf(1);
    fromAnys(delta.replicatedRegisterMap?.removed)[0].foo.should.equal('one');
    delta.replicatedRegisterMap?.updated?.should.be.empty;
    delta.replicatedRegisterMap?.cleared?.should.be.false;
  });
});
