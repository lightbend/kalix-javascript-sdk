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

import * as util from 'util';
import * as Long from 'long';
import { ReplicatedData } from '.';
import * as protocol from '../../types/protocol/replicated-entities';

/**
 * A Replicated Counter data type.
 *
 * A counter that can be incremented and decremented.
 *
 * @remarks
 *
 * The value is stored as a 64-bit signed long, hence values over `2^63 - 1` and less than `2^63`
 * can't be represented.
 *
 * @public
 */
export class ReplicatedCounter implements ReplicatedData {
  private currentValue = Long.ZERO;
  private delta = Long.ZERO;

  /**
   * The value as a long.
   */
  get longValue(): Long.Long {
    return this.currentValue;
  }

  /**
   * The value as a number.
   *
   * @remarks
   *
   * Note that once the value exceeds `2^53`, this will not be an accurate representation of the
   * value. If you expect it to exceed `2^53`, {@link longValue} should be used
   * instead.
   */
  get value(): number {
    return this.currentValue.toNumber();
  }

  /**
   * Increment the counter by the given number.
   *
   * @param increment - The amount to increment the counter by. If negative, it will be decremented instead
   * @returns This counter
   */
  increment = (increment: Long.Long | number): ReplicatedCounter => {
    this.currentValue = this.currentValue.add(increment);
    this.delta = this.delta.add(increment);
    return this;
  };

  /**
   * Decrement the counter by the given number.
   *
   * @param decrement - The amount to decrement the counter by. If negative, it will be incremented instead
   * @returns This counter
   */
  decrement = (decrement: Long.Long | number): ReplicatedCounter => {
    this.currentValue = this.currentValue.subtract(decrement);
    this.delta = this.delta.subtract(decrement);
    return this;
  };

  /** @internal */
  getAndResetDelta = (initial?: boolean): protocol.DeltaOut | null => {
    if (!this.delta.isZero() || initial) {
      const currentDelta: protocol.DeltaOut = {
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

  /** @internal */
  applyDelta = (delta: protocol.DeltaIn): void => {
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
