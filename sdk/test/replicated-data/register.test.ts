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
import * as replicatedData from '../../src/replicated-data';
const ReplicatedRegister = replicatedData.ReplicatedRegister;
const Clocks = replicatedData.Clocks;
import { ReplicatedEntityServices } from '../../src/replicated-entity-support';
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

function fromAny(value?: protocol.AnyIn | null): any {
  return anySupport.deserialize(value);
}

function toNumber(n?: Long | number | null): number {
  return Long.isLong(n) ? n.toNumber() : n ?? 0;
}

describe('ReplicatedRegister', () => {
  it('should be instantiated with a value', () => {
    const register = new ReplicatedRegister<Example>(
      Example.create({ field1: 'foo' }),
    );
    register.value.field1?.should.equal('foo');
    const initial = roundTripDelta(register.getAndResetDelta()).register;
    fromAny(initial?.value).field1.should.equal('foo');
    initial?.clock?.should.eql(Clocks.DEFAULT);
  });

  it('should reflect an initial delta', () => {
    const register = new ReplicatedRegister<Example>(
      Example.create({ field1: 'bar' }),
    );
    register.applyDelta(
      roundTripDelta({
        register: {
          value: toAny(Example.create({ field1: 'foo' })),
        },
      }),
      anySupport,
    );
    register.value.field1?.should.equal('foo');
    should.equal(register.getAndResetDelta(), null);
  });

  it('should generate a delta', () => {
    const register = new ReplicatedRegister<Example>(
      Example.create({ field1: 'foo' }),
    );
    register.value = Example.create({ field1: 'bar' });
    register.value.field1?.should.equal('bar');
    const delta = roundTripDelta(register.getAndResetDelta()).register;
    fromAny(delta?.value).field1.should.equal('bar');
    delta?.clock?.should.eql(Clocks.DEFAULT);
    should.equal(register.getAndResetDelta(), null);
  });

  it('should generate deltas with a custom clock', () => {
    const register = new ReplicatedRegister<Example>(
      Example.create({ field1: 'foo' }),
    );
    register.setWithClock(Example.create({ field1: 'bar' }), Clocks.CUSTOM, 10);
    register.value.field1?.should.equal('bar');
    const delta = roundTripDelta(register.getAndResetDelta()).register;
    fromAny(delta?.value).field1.should.equal('bar');
    delta?.clock?.should.eql(Clocks.CUSTOM);
    toNumber(delta?.customClockValue).should.equal(10);
    should.equal(register.getAndResetDelta(), null);
  });

  it('should reflect a delta update', () => {
    const register = new ReplicatedRegister<Example>(
      Example.create({ field1: 'foo' }),
    );
    register.applyDelta(
      roundTripDelta({
        register: {
          value: toAny(Example.create({ field1: 'bar' })),
        },
      }),
      anySupport,
    );
    register.value.field1?.should.equal('bar');
    should.equal(register.getAndResetDelta(), null);
  });

  it('should work with primitive types', () => {
    const register = new ReplicatedRegister<string>('blah');
    register.value.should.equal('blah');
    register.value = 'hello';
    register.value.should.equal('hello');
    const delta = roundTripDelta(register.getAndResetDelta());
    fromAny(delta?.register?.value).should.equal('hello');
  });

  it('should work with json types', () => {
    const register = new ReplicatedRegister({ foo: 'bar' });
    register.value.foo.should.equal('bar');
    register.value = { foo: 'baz' };
    register.value.foo.should.equal('baz');
    const delta = roundTripDelta(register.getAndResetDelta());
    fromAny(delta?.register?.value).should.eql({ foo: 'baz' });
  });
});
