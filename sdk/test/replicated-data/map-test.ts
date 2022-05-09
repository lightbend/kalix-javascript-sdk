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
import protobuf from 'protobufjs';
import path from 'path';
import * as replicatedData from '../../src/replicated-data';
const ReplicatedMap = replicatedData.ReplicatedMap;
import AnySupport from '../../src/protobuf-any';
import Long from 'long';
import * as proto from '../proto/protobuf-bundle';

namespace protocol {
  export type Any = proto.google.protobuf.IAny;
  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;
  export const Delta =
    proto.kalix.component.replicatedentity.ReplicatedEntityDelta;
  export type EntryDelta =
    proto.kalix.component.replicatedentity.IReplicatedMapEntryDelta;
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
  delta?: protocol.Delta | null;
}

function fromEntries(entries?: protocol.EntryDelta[] | null): Entry[] {
  return entries
    ? entries.map((entry) => {
        return {
          key: anySupport.deserialize(entry.key),
          delta: entry.delta,
        };
      })
    : [];
}

function toMapCounterEntry(key: any, value: number): protocol.EntryDelta {
  return { key: toAny(key), delta: { counter: { change: value } } };
}

describe('ReplicatedMap', () => {
  it('should have no elements when instantiated', () => {
    const map = new ReplicatedMap();
    map.size.should.equal(0);
    should.equal(map.getAndResetDelta(), null);
  });

  it('should reflect an initial delta', () => {
    const map = new ReplicatedMap();
    map.applyDelta(
      roundTripDelta({
        replicatedMap: {
          added: [toMapCounterEntry('one', 5), toMapCounterEntry('two', 7)],
        },
      }),
      anySupport,
      replicatedData.createForDelta,
    );
    map.size.should.equal(2);
    new Set(map.keys()).should.include('one', 'two');
    (map.asObject.one as replicatedData.ReplicatedCounter).value.should.equal(
      5,
    );
    (map.asObject.two as replicatedData.ReplicatedCounter).value.should.equal(
      7,
    );
    should.equal(map.getAndResetDelta(), null);
  });

  it('should generate an add delta', () => {
    const map = new ReplicatedMap().set(
      'one',
      new replicatedData.ReplicatedCounter(),
    );
    map.has('one').should.be.true;
    map.size.should.equal(1);
    const delta1 = roundTripDelta(map.getAndResetDelta());
    delta1.replicatedMap?.added?.should.have.lengthOf(1);
    const entry = fromEntries(delta1.replicatedMap?.added)[0];
    entry.key.should.equal('one');
    toNumber(entry.delta?.counter?.change).should.equal(0);
    should.equal(map.getAndResetDelta(), null);

    map.asObject.two = new replicatedData.ReplicatedCounter();
    (map.asObject.two as replicatedData.ReplicatedCounter).increment(10);
    map.size.should.equal(2);
    const delta2 = roundTripDelta(map.getAndResetDelta());
    delta2.replicatedMap?.added?.should.have.lengthOf(1);
    const entry2 = fromEntries(delta2.replicatedMap?.added)[0];
    entry2.key.should.equal('two');
    toNumber(entry2.delta?.counter?.change).should.equal(10);
    should.equal(map.getAndResetDelta(), null);

    delta2.replicatedMap?.updated?.should.have.lengthOf(0);
  });

  it('should generate a remove delta', () => {
    const map = new ReplicatedMap()
      .set('one', new replicatedData.ReplicatedCounter())
      .set('two', new replicatedData.ReplicatedCounter())
      .set('three', new replicatedData.ReplicatedCounter());
    map.getAndResetDelta();
    map.has('one').should.be.true;
    map.has('two').should.be.true;
    map.has('three').should.be.true;
    map.size.should.equal(3);
    map.delete('one').delete('two');
    map.size.should.equal(1);
    map.has('three').should.be.true;
    map.has('one').should.be.false;
    map.has('two').should.be.false;
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.removed?.should.have.lengthOf(2);
    fromAnys(delta.replicatedMap?.removed).should.include.members([
      'one',
      'two',
    ]);
    should.equal(map.getAndResetDelta(), null);
  });

  it('should generate an update delta', () => {
    const map = new ReplicatedMap().set(
      'one',
      new replicatedData.ReplicatedCounter(),
    );
    map.getAndResetDelta();
    (map.get('one') as replicatedData.ReplicatedCounter).increment(5);
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.updated?.should.have.lengthOf(1);
    const entry = fromEntries(delta.replicatedMap?.updated)[0];
    entry.key.should.equal('one');
    toNumber(entry.delta?.counter?.change).should.equal(5);
    should.equal(map.getAndResetDelta(), null);
  });

  it('should generate a clear delta', () => {
    const map = new ReplicatedMap()
      .set('one', new replicatedData.ReplicatedCounter())
      .set('two', new replicatedData.ReplicatedCounter());
    map.getAndResetDelta();
    map.clear().size.should.equal(0);
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.cleared?.should.be.true;
    should.equal(map.getAndResetDelta(), null);
  });

  it('should not generate a delta when an added element is removed', () => {
    const map = new ReplicatedMap().set(
      'one',
      new replicatedData.ReplicatedCounter(),
    );
    map.getAndResetDelta();
    map
      .set('two', new replicatedData.ReplicatedCounter())
      .delete('two')
      .size.should.equal(1);
    should.equal(map.getAndResetDelta(), null);
  });

  it('should generate a delta when a removed element is added', () => {
    const map = new ReplicatedMap()
      .set('one', new replicatedData.ReplicatedCounter())
      .set('two', new replicatedData.ReplicatedCounter());
    map.getAndResetDelta();
    map
      .delete('two')
      .set('two', new replicatedData.ReplicatedCounter())
      .size.should.equal(2);
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.removed?.should.have.lengthOf(1);
    delta.replicatedMap?.added?.should.have.lengthOf(1);
    delta.replicatedMap?.updated?.should.have.lengthOf(0);
  });

  it('should generate a delta when an already existing element is set', () => {
    const map = new ReplicatedMap().set(
      'one',
      new replicatedData.ReplicatedCounter(),
    );
    map.getAndResetDelta();
    map.set('one', new replicatedData.ReplicatedCounter()).size.should.equal(1);
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.removed?.should.have.lengthOf(1);
    delta.replicatedMap?.added?.should.have.lengthOf(1);
    delta.replicatedMap?.updated?.should.have.lengthOf(0);
  });

  it('should not generate a delta when a non existing element is removed', () => {
    const map = new ReplicatedMap().set(
      'one',
      new replicatedData.ReplicatedCounter(),
    );
    map.getAndResetDelta();
    map.delete('two').size.should.equal(1);
    should.equal(map.getAndResetDelta(), null);
  });

  it('should generate a delta when an already existing element is set', () => {
    const map = new ReplicatedMap().set(
      'one',
      new replicatedData.ReplicatedCounter(),
    );
    map.getAndResetDelta();
    map.set('one', new replicatedData.ReplicatedCounter()).size.should.equal(1);
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.removed?.should.have.lengthOf(1);
    delta.replicatedMap?.added?.should.have.lengthOf(1);
    delta.replicatedMap?.updated?.should.have.lengthOf(0);
  });

  it('clear all other deltas when the set is cleared', () => {
    const map = new ReplicatedMap()
      .set('one', new replicatedData.ReplicatedCounter())
      .set('two', new replicatedData.ReplicatedCounter());
    map.getAndResetDelta();
    (map.asObject.two as replicatedData.ReplicatedCounter).increment(10);
    map
      .set('one', new replicatedData.ReplicatedCounter())
      .clear()
      .size.should.equal(0);
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.cleared?.should.be.true;
    delta.replicatedMap?.added?.should.have.lengthOf(0);
    delta.replicatedMap?.removed?.should.have.lengthOf(0);
    delta.replicatedMap?.updated?.should.have.lengthOf(0);
  });

  it('should reflect a delta add', () => {
    const map = new ReplicatedMap().set(
      'one',
      new replicatedData.ReplicatedCounter(),
    );
    map.getAndResetDelta();
    map.applyDelta(
      roundTripDelta({
        replicatedMap: {
          added: [
            {
              key: toAny('two'),
              delta: {
                counter: { change: 4 },
              },
            },
          ],
        },
      }),
      anySupport,
      replicatedData.createForDelta,
    );
    map.size.should.equal(2);
    new Set(map.keys()).should.include('one', 'two');
    (map.asObject.two as replicatedData.ReplicatedCounter).value.should.equal(
      4,
    );
    should.equal(map.getAndResetDelta(), null);
  });

  it('should reflect a delta remove', () => {
    const map = new ReplicatedMap()
      .set('one', new replicatedData.ReplicatedCounter())
      .set('two', new replicatedData.ReplicatedCounter());
    map.getAndResetDelta();
    map.applyDelta(
      roundTripDelta({
        replicatedMap: {
          removed: [toAny('two')],
        },
      }),
      anySupport,
      replicatedData.createForDelta,
    );
    map.size.should.equal(1);
    new Set(map.keys()).should.include('one');
    should.equal(map.getAndResetDelta(), null);
  });

  it('should reflect a delta clear', () => {
    const map = new ReplicatedMap()
      .set('one', new replicatedData.ReplicatedCounter())
      .set('two', new replicatedData.ReplicatedCounter());
    map.getAndResetDelta();
    map.applyDelta(
      roundTripDelta({
        replicatedMap: {
          cleared: true,
        },
      }),
      anySupport,
      replicatedData.createForDelta,
    );
    map.size.should.equal(0);
    should.equal(map.getAndResetDelta(), null);
  });

  it('should work with protobuf keys', () => {
    const map = new ReplicatedMap()
      .set(
        Example.create({ field1: 'one' }),
        new replicatedData.ReplicatedCounter(),
      )
      .set(
        Example.create({ field1: 'two' }),
        new replicatedData.ReplicatedCounter(),
      );
    map.getAndResetDelta();
    map.delete(Example.create({ field1: 'one' }));
    map.size.should.equal(1);
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.removed?.should.have.lengthOf(1);
    fromAnys(delta.replicatedMap?.removed)[0].field1.should.equal('one');
  });

  it('should work with json types', () => {
    const map = new ReplicatedMap()
      .set({ foo: 'bar' }, new replicatedData.ReplicatedCounter())
      .set({ foo: 'baz' }, new replicatedData.ReplicatedCounter());
    map.getAndResetDelta();
    map.delete({ foo: 'bar' });
    map.size.should.equal(1);
    const delta = roundTripDelta(map.getAndResetDelta());
    delta.replicatedMap?.removed?.should.have.lengthOf(1);
    fromAnys(delta.replicatedMap?.removed)[0].foo.should.equal('bar');
  });

  it('should support empty initial deltas (for ReplicatedMap added)', () => {
    const map = new ReplicatedMap();
    map.size.should.equal(0);
    should.equal(map.getAndResetDelta(), null);
    roundTripDelta(
      map.getAndResetDelta(/* initial = */ true),
    ).replicatedMap?.added?.should.have.lengthOf(0);
  });
});
