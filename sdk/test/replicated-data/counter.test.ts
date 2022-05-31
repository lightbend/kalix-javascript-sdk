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
import * as Long from 'long';
import { ReplicatedCounter } from '../../src/replicated-data/counter';
import { ReplicatedEntityServices } from '../../src/replicated-entity-support';
import * as protocol from '../../types/protocol/replicated-entities';

function counterDelta(delta: protocol.DeltaOut | null): number {
  return toNumber(roundTripDelta(delta).counter?.change);
}

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

function toNumber(n?: Long | number | null): number {
  return Long.isLong(n) ? n.toNumber() : n ?? 0;
}

describe('ReplicatedCounter', () => {
  it('should have a value of zero when instantiated', () => {
    const counter = new ReplicatedCounter();
    counter.value.should.equal(0);
    should.equal(counter.getAndResetDelta(), null);
  });

  it('should reflect a delta update', () => {
    const counter = new ReplicatedCounter();
    counter.applyDelta(
      roundTripDelta({
        counter: {
          change: 10,
        },
      }),
    );
    counter.value.should.equal(10);
    // Try incrementing it again
    counter.applyDelta(
      roundTripDelta({
        counter: {
          change: -3,
        },
      }),
    );
    counter.value.should.equal(7);
  });

  it('should generate deltas', () => {
    const counter = new ReplicatedCounter();
    counter.increment(10);
    counter.value.should.equal(10);
    counterDelta(counter.getAndResetDelta()).should.equal(10);
    should.equal(counter.getAndResetDelta(), null);
    counter.decrement(3);
    counter.value.should.equal(7);
    counter.decrement(4);
    counter.value.should.equal(3);
    counterDelta(counter.getAndResetDelta()).should.equal(-7);
    should.equal(counter.getAndResetDelta(), null);
  });

  it('should support long values', () => {
    const impossibleDouble = Long.ZERO.add(Number.MAX_SAFE_INTEGER).add(1);
    const counter = new ReplicatedCounter();
    counter.increment(Number.MAX_SAFE_INTEGER);
    counter.increment(1);
    counter.longValue.should.eql(impossibleDouble);
    roundTripDelta(counter.getAndResetDelta()).counter?.change?.should.eql(
      impossibleDouble,
    );
  });

  it('should support incrementing by long values', () => {
    const impossibleDouble = Long.ZERO.add(Number.MAX_SAFE_INTEGER).add(1);
    const counter = new ReplicatedCounter();
    counter.increment(impossibleDouble);
    counter.longValue.should.eql(impossibleDouble);
    roundTripDelta(counter.getAndResetDelta()).counter?.change?.should.eql(
      impossibleDouble,
    );
  });

  it('should support empty initial deltas (for ReplicatedMap added)', () => {
    const counter = new ReplicatedCounter();
    counter.value.should.equal(0);
    should.equal(counter.getAndResetDelta(), null);
    counterDelta(counter.getAndResetDelta(/* initial = */ true)).should.eql(0);
  });
});
