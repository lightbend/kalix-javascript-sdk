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

import util from 'util';
import Long from 'long';
import { ReplicatedData } from '.';
import * as proto from '../../proto/protobuf-bundle';

namespace protocol {
  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;
}

class ReplicatedCounter implements ReplicatedData {
  private currentValue = Long.ZERO;
  private delta = Long.ZERO;

  get longValue(): Long {
    return this.currentValue;
  }

  get value(): number {
    return this.currentValue.toNumber();
  }

  increment = (increment: Long | number): ReplicatedCounter => {
    this.currentValue = this.currentValue.add(increment);
    this.delta = this.delta.add(increment);
    return this;
  };

  decrement = (decrement: Long | number): ReplicatedCounter => {
    this.currentValue = this.currentValue.subtract(decrement);
    this.delta = this.delta.subtract(decrement);
    return this;
  };

  getAndResetDelta = (initial?: boolean): protocol.Delta | null => {
    if (!this.delta.isZero() || initial) {
      const currentDelta: protocol.Delta = {
        counter: {
          change: this.delta,
        },
      };
      this.delta = Long.ZERO;
      return currentDelta;
    } else {
      return null;
    }
  };

  applyDelta = (delta: protocol.Delta): void => {
    if (!delta.counter) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedCounter', delta),
      );
    }
    this.currentValue = this.currentValue.add(delta.counter.change ?? 0);
  };

  toString = (): string => {
    return `ReplicatedCounter(${this.currentValue})`;
  };
}

export = ReplicatedCounter;
