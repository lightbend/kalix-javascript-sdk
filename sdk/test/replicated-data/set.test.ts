/*
 * Copyright 2021-2023 Lightbend Inc.
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
import * as protobuf from 'protobufjs';
import * as path from 'path';
import { ReplicatedSet } from '../../src/replicated-data/set';
import { ReplicatedEntityServices } from '../../src/replicated-entity-support';
import AnySupport from '../../src/protobuf-any';
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

describe('ReplicatedSet', () => {
  it('should have no elements when instantiated', () => {
    const set = new ReplicatedSet();
    set.size.should.equal(0);
    should.equal(set.getAndResetDelta(), null);
  });

  it('should reflect an initial delta', () => {
    const set = new ReplicatedSet<string>();
    should.equal(set.getAndResetDelta(), null);
    set.applyDelta(
      roundTripDelta({
        replicatedSet: {
          added: [toAny('one'), toAny('two')],
        },
      }),
      anySupport,
    );
    set.size.should.equal(2);
    new Set(set).should.include('one', 'two');
    should.equal(set.getAndResetDelta(), null);
  });

  it('should generate an add delta', () => {
    const set = new ReplicatedSet<string>().add('one');
    set.has('one').should.be.true;
    set.size.should.equal(1);
    const delta1 = roundTripDelta(set.getAndResetDelta());
    delta1.replicatedSet?.added?.should.have.lengthOf(1);
    fromAnys(delta1.replicatedSet?.added).should.include('one');
    should.equal(set.getAndResetDelta(), null);

    set.add('two').add('three');
    set.size.should.equal(3);
    const delta2 = roundTripDelta(set.getAndResetDelta());
    delta2.replicatedSet?.added?.should.have.lengthOf(2);
    fromAnys(delta2.replicatedSet?.added).should.include.members([
      'two',
      'three',
    ]);
    should.equal(set.getAndResetDelta(), null);
  });

  it('should generate a remove delta', () => {
    const set = new ReplicatedSet<string>().add('one').add('two').add('three');
    set.getAndResetDelta();
    set.has('one').should.be.true;
    set.has('two').should.be.true;
    set.has('three').should.be.true;
    set.size.should.equal(3);
    set.delete('one').delete('two');
    set.size.should.equal(1);
    set.has('three').should.be.true;
    set.has('one').should.be.false;
    set.has('two').should.be.false;
    const delta = roundTripDelta(set.getAndResetDelta());
    delta.replicatedSet?.removed?.should.have.lengthOf(2);
    fromAnys(delta.replicatedSet?.removed).should.include.members([
      'one',
      'two',
    ]);
    should.equal(set.getAndResetDelta(), null);
  });

  it('should generate a clear delta', () => {
    const set = new ReplicatedSet<string>().add('one').add('two');
    set.getAndResetDelta();
    set.clear().size.should.equal(0);
    const delta = roundTripDelta(set.getAndResetDelta());
    delta.replicatedSet?.cleared?.should.be.true;
    should.equal(set.getAndResetDelta(), null);
  });

  it('should generate a clear delta when everything is removed', () => {
    const set = new ReplicatedSet<string>().add('one').add('two');
    set.getAndResetDelta();
    set.delete('one').delete('two').size.should.equal(0);
    const delta = roundTripDelta(set.getAndResetDelta());
    delta.replicatedSet?.cleared?.should.be.true;
    should.equal(set.getAndResetDelta(), null);
  });

  it('should not generate a delta when an added element is removed', () => {
    const set = new ReplicatedSet<string>().add('one');
    set.getAndResetDelta();
    set.add('two').delete('two').size.should.equal(1);
    should.equal(set.getAndResetDelta(), null);
  });

  it('should not generate a delta when a removed element is added', () => {
    const set = new ReplicatedSet<string>().add('one').add('two');
    set.getAndResetDelta();
    set.delete('two').add('two').size.should.equal(2);
    should.equal(set.getAndResetDelta(), null);
  });

  it('should not generate a delta when an already existing element is added', () => {
    const set = new ReplicatedSet<string>().add('one');
    set.getAndResetDelta();
    set.add('one').size.should.equal(1);
    should.equal(set.getAndResetDelta(), null);
  });

  it('should not generate a delta when a non existing element is removed', () => {
    const set = new ReplicatedSet().add('one');
    set.getAndResetDelta();
    set.delete('two').size.should.equal(1);
    should.equal(set.getAndResetDelta(), null);
  });

  it('clear all other deltas when the set is cleared', () => {
    const set = new ReplicatedSet<string>().add('one');
    set.getAndResetDelta();
    set.add('two').delete('one').clear().size.should.equal(0);
    const delta = roundTripDelta(set.getAndResetDelta());
    delta.replicatedSet?.cleared?.should.be.true;
    delta.replicatedSet?.added?.should.have.lengthOf(0);
    delta.replicatedSet?.removed?.should.have.lengthOf(0);
  });

  it('should reflect a delta add', () => {
    const set = new ReplicatedSet<string>().add('one');
    const delta1 = roundTripDelta(set.getAndResetDelta());
    delta1.replicatedSet?.added?.should.have.lengthOf(1);
    fromAnys(delta1.replicatedSet?.added).should.include('one');
    set.applyDelta(
      roundTripDelta({
        replicatedSet: {
          added: [toAny('two')],
        },
      }),
      anySupport,
    );
    set.size.should.equal(2);
    new Set(set).should.include('one', 'two');
    should.equal(set.getAndResetDelta(), null);
  });

  it('should reflect a delta remove', () => {
    const set = new ReplicatedSet<string>().add('one').add('two');
    const delta1 = roundTripDelta(set.getAndResetDelta());
    delta1.replicatedSet?.added?.should.have.lengthOf(2);
    fromAnys(delta1.replicatedSet?.added).should.include('one', 'two');
    set.applyDelta(
      roundTripDelta({
        replicatedSet: {
          removed: [toAny('two')],
        },
      }),
      anySupport,
    );
    set.size.should.equal(1);
    new Set(set).should.include('one');
    should.equal(set.getAndResetDelta(), null);
  });

  it('should reflect a delta clear', () => {
    const set = new ReplicatedSet<string>().add('one').add('two');
    const delta1 = roundTripDelta(set.getAndResetDelta());
    delta1.replicatedSet?.added?.should.have.lengthOf(2);
    fromAnys(delta1.replicatedSet?.added).should.include('one', 'two');
    set.applyDelta(
      roundTripDelta({
        replicatedSet: {
          cleared: true,
        },
      }),
      anySupport,
    );
    set.size.should.equal(0);
    should.equal(set.getAndResetDelta(), null);
  });

  it('should work with protobuf types', () => {
    const set = new ReplicatedSet<Example>()
      .add(Example.create({ field1: 'one' }))
      .add(Example.create({ field1: 'two' }));
    set.getAndResetDelta();
    set.delete(Example.create({ field1: 'one' }));
    set.size.should.equal(1);
    const delta = roundTripDelta(set.getAndResetDelta());
    delta.replicatedSet?.removed?.should.have.lengthOf(1);
    fromAnys(delta.replicatedSet?.removed)[0].field1.should.equal('one');
  });

  it('should work with json types', () => {
    const set = new ReplicatedSet<{ foo: string }>()
      .add({ foo: 'bar' })
      .add({ foo: 'baz' });
    set.getAndResetDelta();
    set.delete({ foo: 'bar' });
    set.size.should.equal(1);
    const delta = roundTripDelta(set.getAndResetDelta());
    delta.replicatedSet?.removed?.should.have.lengthOf(1);
    fromAnys(delta.replicatedSet?.removed)[0].foo.should.equal('bar');
  });

  it('should support empty initial deltas (for ReplicatedMap added)', () => {
    const set = new ReplicatedSet();
    set.size.should.equal(0);
    should.equal(set.getAndResetDelta(), null);
    roundTripDelta(
      set.getAndResetDelta(/* initial = */ true),
    ).replicatedSet?.added?.should.have.lengthOf(0);
  });
});
