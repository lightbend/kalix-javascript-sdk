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
import { ReplicatedMultiMap } from '../../src/replicated-data/multi-map';
import * as path from 'path';
import * as protobuf from 'protobufjs';
import AnySupport from '../../src/protobuf-any';
import * as proto from '../proto/protobuf-bundle';

namespace protocol {
  export type Any = proto.google.protobuf.IAny;
  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;
  export const Delta =
    proto.kalix.component.replicatedentity.ReplicatedEntityDelta;
  export type EntryDelta =
    proto.kalix.component.replicatedentity.IReplicatedMultiMapEntryDelta;
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

interface Entry {
  key: any;
  delta: { removed: any[]; added: any[] };
}

function deltaEntries(entries?: protocol.EntryDelta[] | null): Entry[] {
  return entries
    ? entries.map((entry) => {
        return {
          key: anySupport.deserialize(entry.key),
          delta: {
            removed: fromAnys(entry.delta?.removed),
            added: fromAnys(entry.delta?.added),
          },
        };
      })
    : [];
}

function valuesDelta(
  key: any,
  delta: { removed?: any[]; added?: any[] },
): protocol.EntryDelta {
  return {
    key: toAny(key),
    delta: {
      removed: (delta.removed || []).map(toAny),
      added: (delta.added || []).map(toAny),
    },
  };
}

describe('ReplicatedMultiMap', () => {
  it('should have no elements when instantiated', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.size.should.equal(0);
    should.equal(multiMap.getAndResetDelta(), null);
  });

  it('should reflect an initial delta', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.applyDelta(
      roundTripDelta({
        replicatedMultiMap: {
          updated: [
            valuesDelta('key1', { added: ['value1'] }),
            valuesDelta('key2', { added: ['value2', 'value3'] }),
          ],
        },
      }),
      anySupport,
    );
    Array.from(multiMap.keys()).should.have.members(['key1', 'key2']);
    Array.from(multiMap.get('key1')).should.have.members(['value1']);
    Array.from(multiMap.get('key2')).should.have.members(['value2', 'value3']);
    should.equal(multiMap.getAndResetDelta(), null);
  });

  it('should generate a delta with added entries', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put('key1', 'value1');
    multiMap.putAll('key2', ['value2', 'value3']);

    multiMap.keysSize.should.equal(2);
    multiMap.size.should.equal(3);
    multiMap.has('key1').should.be.true;
    multiMap.hasValue('key1', 'value1').should.be.true;
    Array.from(multiMap.get('key1')).should.have.members(['value1']);
    multiMap.has('key2').should.be.true;
    multiMap.hasValue('key2', 'value2').should.be.true;
    multiMap.hasValue('key2', 'value3').should.be.true;
    Array.from(multiMap.get('key2')).should.have.members(['value2', 'value3']);

    const delta = roundTripDelta(multiMap.getAndResetDelta());
    deltaEntries(delta.replicatedMultiMap?.updated).should.have.deep.members([
      { key: 'key1', delta: { removed: [], added: ['value1'] } },
      { key: 'key2', delta: { removed: [], added: ['value2', 'value3'] } },
    ]);
    delta.replicatedMultiMap?.removed?.should.be.empty;
    delta.replicatedMultiMap?.cleared?.should.be.false;
  });

  it('should generate a delta with removed entries', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put('key1', 'value1');
    multiMap.putAll('key2', ['value2', 'value3']);
    multiMap.putAll('key3', ['value4', 'value5', 'value6']);
    multiMap.keysSize.should.equal(3);
    multiMap.size.should.equal(6);
    multiMap.getAndResetDelta();

    multiMap.delete('key2', 'value3');
    multiMap.deleteAll('key3');
    multiMap.keysSize.should.equal(2);
    multiMap.size.should.equal(2);
    Array.from(multiMap.keys()).should.have.members(['key1', 'key2']);
    Array.from(multiMap.get('key1')).should.have.members(['value1']);
    Array.from(multiMap.get('key2')).should.have.members(['value2']);

    const delta = roundTripDelta(multiMap.getAndResetDelta());
    fromAnys(delta.replicatedMultiMap?.removed).should.have.members(['key3']);
    deltaEntries(delta.replicatedMultiMap?.updated).should.have.deep.members([
      { key: 'key2', delta: { removed: ['value3'], added: [] } },
    ]);
    delta.replicatedMultiMap?.cleared?.should.be.false;
  });

  it('should generate a delta with updated entries', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put('key1', 'value1');
    multiMap.putAll('key2', ['value2', 'value3']);
    multiMap.keysSize.should.equal(2);
    multiMap.size.should.equal(3);
    multiMap.getAndResetDelta();

    multiMap.put('key1', 'value2');
    multiMap.delete('key2', 'value2');
    multiMap.put('key2', 'value4');
    multiMap.putAll('key3', ['value5', 'value6', 'value7']);
    multiMap.keysSize.should.equal(3);
    multiMap.size.should.equal(7);
    Array.from(multiMap.keys()).should.have.members(['key1', 'key2', 'key3']);
    Array.from(multiMap.get('key1')).should.have.members(['value1', 'value2']);
    Array.from(multiMap.get('key2')).should.have.members(['value3', 'value4']);
    Array.from(multiMap.get('key3')).should.have.members([
      'value5',
      'value6',
      'value7',
    ]);

    const delta = roundTripDelta(multiMap.getAndResetDelta());
    deltaEntries(delta.replicatedMultiMap?.updated).should.have.deep.members([
      { key: 'key1', delta: { removed: [], added: ['value2'] } },
      { key: 'key2', delta: { removed: ['value2'], added: ['value4'] } },
      {
        key: 'key3',
        delta: { removed: [], added: ['value5', 'value6', 'value7'] },
      },
    ]);
    delta.replicatedMultiMap?.removed?.should.be.empty;
    delta.replicatedMultiMap?.cleared?.should.be.false;
  });

  it('should generate a delta with cleared entries', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put('key1', 'value1');
    multiMap.putAll('key2', ['value2', 'value3']);
    multiMap.keysSize.should.equal(2);
    multiMap.size.should.equal(3);
    multiMap.getAndResetDelta();

    multiMap.clear();
    multiMap.keysSize.should.equal(0);
    multiMap.size.should.equal(0);

    const delta = roundTripDelta(multiMap.getAndResetDelta());
    delta.replicatedMultiMap?.cleared?.should.be.true;
    delta.replicatedMultiMap?.updated?.should.be.empty;
    delta.replicatedMultiMap?.removed?.should.be.empty;
  });

  it('should reflect a delta with added entries', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put('key1', 'value1');
    multiMap.getAndResetDelta();

    multiMap.applyDelta(
      roundTripDelta({
        replicatedMultiMap: {
          updated: [
            valuesDelta('key2', { added: ['value2'] }),
            valuesDelta('key3', { added: ['value3', 'value4'] }),
          ],
        },
      }),
      anySupport,
    );
    multiMap.keysSize.should.equal(3);
    multiMap.size.should.equal(4);
    Array.from(multiMap.keys()).should.have.members(['key1', 'key2', 'key3']);
    Array.from(multiMap.get('key1')).should.have.members(['value1']);
    Array.from(multiMap.get('key2')).should.have.members(['value2']);
    Array.from(multiMap.get('key3')).should.have.members(['value3', 'value4']);
    should.equal(multiMap.getAndResetDelta(), null);
  });

  it('should reflect a delta with removed entries', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put('key1', 'value1');
    multiMap.putAll('key2', ['value2', 'value3']);
    multiMap.putAll('key3', ['value4', 'value5', 'value6']);
    multiMap.getAndResetDelta();

    multiMap.applyDelta(
      roundTripDelta({
        replicatedMultiMap: {
          removed: [toAny('key3')],
          updated: [valuesDelta('key2', { removed: ['value3'] })],
        },
      }),
      anySupport,
    );
    multiMap.keysSize.should.equal(2);
    multiMap.size.should.equal(2);
    Array.from(multiMap.keys()).should.have.members(['key1', 'key2']);
    Array.from(multiMap.get('key1')).should.have.members(['value1']);
    Array.from(multiMap.get('key2')).should.have.members(['value2']);
    should.equal(multiMap.getAndResetDelta(), null);
  });

  it('should reflect a delta with cleared entries', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put('key1', 'value1');
    multiMap.putAll('key2', ['value2', 'value3']);
    multiMap.keysSize.should.equal(2);
    multiMap.size.should.equal(3);
    multiMap.getAndResetDelta();

    multiMap.applyDelta(
      roundTripDelta({
        replicatedMultiMap: {
          cleared: true,
        },
      }),
      anySupport,
    );
    multiMap.keysSize.should.equal(0);
    multiMap.size.should.equal(0);
    should.equal(multiMap.getAndResetDelta(), null);
  });

  it('should support protobuf messages for keys and values', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put(
      Example.create({ field1: 'key1' }),
      Example.create({ field1: 'value1' }),
    );
    multiMap.put(
      Example.create({ field1: 'key2' }),
      Example.create({ field1: 'value2' }),
    );
    multiMap.putAll(Example.create({ field1: 'key3' }), [
      Example.create({ field1: 'value3' }),
      Example.create({ field1: 'value4' }),
    ]);

    const delta1 = roundTripDelta(multiMap.getAndResetDelta());
    deltaEntries(delta1.replicatedMultiMap?.updated).should.have.deep.members([
      {
        key: Example.create({ field1: 'key1' }),
        delta: { removed: [], added: [Example.create({ field1: 'value1' })] },
      },
      {
        key: Example.create({ field1: 'key2' }),
        delta: { removed: [], added: [Example.create({ field1: 'value2' })] },
      },
      {
        key: Example.create({ field1: 'key3' }),
        delta: {
          removed: [],
          added: [
            Example.create({ field1: 'value3' }),
            Example.create({ field1: 'value4' }),
          ],
        },
      },
    ]);
    delta1.replicatedMultiMap?.removed?.should.be.empty;
    delta1.replicatedMultiMap?.cleared?.should.be.false;

    multiMap.delete(
      Example.create({ field1: 'key3' }),
      Example.create({ field1: 'value4' }),
    );
    multiMap.deleteAll(Example.create({ field1: 'key2' }));
    multiMap.keysSize.should.equal(2);
    multiMap.size.should.equal(2);

    const delta2 = roundTripDelta(multiMap.getAndResetDelta());
    fromAnys(delta2.replicatedMultiMap?.removed).should.have.deep.members([
      Example.create({ field1: 'key2' }),
    ]);
    deltaEntries(delta2.replicatedMultiMap?.updated).should.have.deep.members([
      {
        key: Example.create({ field1: 'key3' }),
        delta: { removed: [Example.create({ field1: 'value4' })], added: [] },
      },
    ]);
    delta2.replicatedMultiMap?.cleared?.should.be.false;
  });

  it('should support json objects for keys and values', () => {
    const multiMap = new ReplicatedMultiMap();
    multiMap.put({ foo: 'key1' }, { foo: 'value1' });
    multiMap.put({ foo: 'key2' }, { foo: 'value2' });
    multiMap.putAll({ foo: 'key3' }, [{ foo: 'value3' }, { foo: 'value4' }]);

    const delta1 = roundTripDelta(multiMap.getAndResetDelta());
    deltaEntries(delta1.replicatedMultiMap?.updated).should.have.deep.members([
      {
        key: { foo: 'key1' },
        delta: { removed: [], added: [{ foo: 'value1' }] },
      },
      {
        key: { foo: 'key2' },
        delta: { removed: [], added: [{ foo: 'value2' }] },
      },
      {
        key: { foo: 'key3' },
        delta: { removed: [], added: [{ foo: 'value3' }, { foo: 'value4' }] },
      },
    ]);
    delta1.replicatedMultiMap?.removed?.should.be.empty;
    delta1.replicatedMultiMap?.cleared?.should.be.false;

    multiMap.delete({ foo: 'key3' }, { foo: 'value4' });
    multiMap.deleteAll({ foo: 'key2' });
    multiMap.keysSize.should.equal(2);
    multiMap.size.should.equal(2);

    const delta2 = roundTripDelta(multiMap.getAndResetDelta());
    fromAnys(delta2.replicatedMultiMap?.removed).should.have.deep.members([
      { foo: 'key2' },
    ]);
    deltaEntries(delta2.replicatedMultiMap?.updated).should.have.deep.members([
      {
        key: { foo: 'key3' },
        delta: { removed: [{ foo: 'value4' }], added: [] },
      },
    ]);
    delta2.replicatedMultiMap?.cleared?.should.be.false;
  });
});
