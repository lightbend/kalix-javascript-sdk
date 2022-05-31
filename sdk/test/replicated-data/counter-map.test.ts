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
import { ReplicatedCounterMap } from '../../src/replicated-data/counter-map';
import { ReplicatedEntityServices } from '../../src/replicated-entity-support';
import * as path from 'path';
import * as protobuf from 'protobufjs';
import AnySupport from '../../src/protobuf-any';
import * as Long from 'long';
import * as proto from '../generated/protobuf';
import * as protocol from '../../types/protocol/replicated-entities';

const root = new protobuf.Root();
root.loadSync(path.join(__dirname, '..', 'example.proto'));
root.resolveAll();
const anySupport = new AnySupport(root);

// serialized state needs to be reflective type
type Example = proto.com.example.IExample & protobuf.Message;
const Example = root.lookupType('com.example.Example');

const service = ReplicatedEntityServices.loadProtocol();

function roundTripDelta(delta: protocol.DeltaOut | null): protocol.DeltaIn {
  return (
    service.Handle.responseDeserialize(
      service.Handle.responseSerialize({
        reply: { stateAction: { update: delta } },
      }),
    ).reply?.stateAction?.update ?? {}
  );
}

function toAny(value: any): protocol.AnyOut {
  return AnySupport.serialize(value, true, true);
}

function fromAnys(values?: protocol.AnyIn[] | null): any[] {
  return values ? values.map((any) => anySupport.deserialize(any)) : [];
}

function toNumber(n?: Long | number | null): number {
  return Long.isLong(n) ? n.toNumber() : n ?? 0;
}

interface Entry {
  key: any;
  delta: number;
}

function deltaEntries(
  entries?: protocol.CounterMapEntryDeltaIn[] | null,
): Entry[] {
  return entries
    ? entries.map((entry) => {
        return {
          key: anySupport.deserialize(entry.key),
          delta: toNumber(entry.delta?.change),
        };
      })
    : [];
}

function counterDelta(
  key: any,
  value: number,
): protocol.CounterMapEntryDeltaOut {
  return { key: toAny(key), delta: { change: value } };
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
        replicatedCounterMap: {
          updated: [counterDelta('one', 1), counterDelta('two', 2)],
        },
      }),
      anySupport,
    );
    Array.from(counterMap.keys()).should.have.members(['one', 'two']);
    counterMap.get('one')?.should.equal(1);
    counterMap.get('two')?.should.equal(2);
    counterMap.getLong('one')?.toNumber().should.equal(1);
    counterMap.getLong('two')?.toNumber().should.equal(2);
    should.equal(counterMap.getAndResetDelta(), null);
  });

  it('should generate an added delta', () => {
    const counterMap = new ReplicatedCounterMap<string>();
    counterMap.increment('one', 1);
    counterMap.has('one').should.be.true;
    counterMap.size.should.equal(1);

    const delta = roundTripDelta(counterMap.getAndResetDelta());
    deltaEntries(delta.replicatedCounterMap?.updated).should.have.deep.members([
      { key: 'one', delta: 1 },
    ]);
    delta.replicatedCounterMap?.removed?.should.be.empty;
    delta.replicatedCounterMap?.cleared?.should.be.false;
  });

  it('should generate a removed delta', () => {
    const counterMap = new ReplicatedCounterMap<string>();
    counterMap.increment('one', 1);
    counterMap.increment('two', 2);
    counterMap.getAndResetDelta();
    counterMap.delete('one');
    counterMap.size.should.equal(1);
    counterMap.has('one').should.be.false;
    counterMap.has('two').should.be.true;

    const delta = roundTripDelta(counterMap.getAndResetDelta());
    fromAnys(delta.replicatedCounterMap?.removed).should.have.members(['one']);
    delta.replicatedCounterMap?.updated?.should.be.empty;
    delta.replicatedCounterMap?.cleared?.should.be.false;
  });

  it('should generate an updated delta', () => {
    const counterMap = new ReplicatedCounterMap<string>();
    counterMap.increment('one', 1);
    counterMap.getAndResetDelta();
    counterMap.increment('one', 42);

    const delta = roundTripDelta(counterMap.getAndResetDelta());
    deltaEntries(delta.replicatedCounterMap?.updated).should.have.deep.members([
      { key: 'one', delta: 42 },
    ]);
    delta.replicatedCounterMap?.removed?.should.be.empty;
    delta.replicatedCounterMap?.cleared?.should.be.false;
  });

  it('should generate a cleared delta', () => {
    const counterMap = new ReplicatedCounterMap<string>();
    counterMap.increment('one', 1);
    counterMap.increment('two', 2);
    counterMap.getAndResetDelta();
    counterMap.clear();
    counterMap.size.should.equal(0);

    const delta = roundTripDelta(counterMap.getAndResetDelta());
    delta.replicatedCounterMap?.cleared?.should.be.true;
    delta.replicatedCounterMap?.updated?.should.be.empty;
    delta.replicatedCounterMap?.removed?.should.be.empty;
  });

  it('should reflect a delta with added entries', () => {
    const counterMap = new ReplicatedCounterMap<string>();
    counterMap.increment('one', 1);
    counterMap.getAndResetDelta();
    counterMap.applyDelta(
      roundTripDelta({
        replicatedCounterMap: {
          updated: [counterDelta('two', 2)],
        },
      }),
      anySupport,
    );
    counterMap.size.should.equal(2);
    Array.from(counterMap.keys()).should.have.members(['one', 'two']);
    counterMap.get('two')?.should.equal(2);
    should.equal(counterMap.getAndResetDelta(), null);
  });

  it('should reflect a delta with removed entries', () => {
    const counterMap = new ReplicatedCounterMap<string>();
    counterMap.increment('one', 1);
    counterMap.increment('two', 2);
    counterMap.getAndResetDelta();
    counterMap.applyDelta(
      roundTripDelta({
        replicatedCounterMap: {
          removed: [toAny('two')],
        },
      }),
      anySupport,
    );
    counterMap.size.should.equal(1);
    Array.from(counterMap.keys()).should.have.members(['one']);
    should.equal(counterMap.getAndResetDelta(), null);
  });

  it('should reflect a delta with cleared entries', () => {
    const counterMap = new ReplicatedCounterMap<string>();
    counterMap.increment('one', 1);
    counterMap.increment('two', 2);
    counterMap.getAndResetDelta();
    counterMap.applyDelta(
      roundTripDelta({
        replicatedCounterMap: {
          cleared: true,
        },
      }),
      anySupport,
    );
    counterMap.size.should.equal(0);
    should.equal(counterMap.getAndResetDelta(), null);
  });

  it('should support protobuf messages for keys', () => {
    const counterMap = new ReplicatedCounterMap<Example>();
    counterMap.increment(Example.create({ field1: 'one' }), 1);
    counterMap.increment(Example.create({ field1: 'two' }), 2);
    counterMap.getAndResetDelta();
    counterMap.delete(Example.create({ field1: 'one' }));
    counterMap.size.should.equal(1);
    const delta = roundTripDelta(counterMap.getAndResetDelta());
    delta.replicatedCounterMap?.removed?.should.have.lengthOf(1);
    fromAnys(delta.replicatedCounterMap?.removed)[0].field1.should.equal('one');
    delta.replicatedCounterMap?.updated?.should.be.empty;
    delta.replicatedCounterMap?.cleared?.should.be.false;
  });

  it('should support json objects for keys', () => {
    const counterMap = new ReplicatedCounterMap<{ foo: string }>();
    counterMap.increment({ foo: 'one' }, 1);
    counterMap.increment({ foo: 'two' }, 2);
    counterMap.getAndResetDelta();
    counterMap.delete({ foo: 'one' });
    counterMap.size.should.equal(1);
    const delta = roundTripDelta(counterMap.getAndResetDelta());
    delta.replicatedCounterMap?.removed?.should.have.lengthOf(1);
    fromAnys(delta.replicatedCounterMap?.removed)[0].foo.should.equal('one');
    delta.replicatedCounterMap?.updated?.should.be.empty;
    delta.replicatedCounterMap?.cleared?.should.be.false;
  });
});
