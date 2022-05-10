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
import AnySupport from '../protobuf-any';
import { ReplicatedData, Clock, Clocks } from '.';
import { Serializable } from '../serializable';
import * as proto from '../../proto/protobuf-bundle';

/** @internal */
namespace protocol {
  export type Any = proto.google.protobuf.IAny;

  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;

  export type RegisterDelta =
    proto.kalix.component.replicatedentity.IReplicatedRegisterDelta;
}

/**
 * A Replicated Register data type.
 *
 * @remarks
 *
 * A ReplicatedRegister uses a clock to determine which of two concurrent updates should win. The
 * last write wins. The clock is represented as a number. The default clock uses the proxies system
 * time, custom clocks can supply a custom number to be used. If two clock values are equal, the
 * write from the node with the lowest address wins.
 *
 * @public
 */
export class ReplicatedRegister implements ReplicatedData {
  private currentValue: Serializable;
  private delta: protocol.RegisterDelta;

  /**
   * Create a new Replicated Register.
   *
   * @param value - A value to hold in the register
   * @param clock - The clock to use, otherwise default clock
   * @param customClockValue - The custom clock value, if using a custom clock
   */
  constructor(
    value: Serializable,
    clock: Clock = Clocks.DEFAULT,
    customClockValue: number | Long = 0,
  ) {
    if (value === null || value === undefined) {
      throw new Error(
        'ReplicatedRegister must be instantiated with an initial value.',
      );
    }
    // Make sure the value can be serialized.
    const serializedValue = AnySupport.serialize(value, true, true);
    this.currentValue = value;
    // Always start with the initialized value as the delta, to send this value to the proxy
    this.delta = {
      value: serializedValue,
      clock: clock,
      customClockValue: customClockValue,
    };
  }

  /**
   * Get or set the value of this register.
   *
   * @remarks Sets with the default clock.
   */
  get value(): Serializable {
    return this.currentValue;
  }

  set value(value: Serializable) {
    this.setWithClock(value);
  }

  /**
   * Set the value using a custom clock.
   *
   * @param value - The value to set
   * @param clock - The clock, otherwise the default clock
   * @param customClockValue - Custom clock value, or ignored if a custom clock isn't specified
   */
  setWithClock = (
    value: Serializable,
    clock: Clock = Clocks.DEFAULT,
    customClockValue: number | Long = 0,
  ): ReplicatedRegister => {
    this.delta = {
      value: AnySupport.serialize(value, true, true),
      clock: clock,
      customClockValue: customClockValue,
    };
    this.currentValue = value;
    return this;
  };

  private resetDelta() {
    this.delta = {
      value: null,
      clock: null,
      customClockValue: 0,
    };
  }

  /** @internal */
  getAndResetDelta = (): protocol.Delta | null => {
    if (this.delta.value !== null) {
      const toReturn = this.delta;
      this.resetDelta();
      return {
        register: toReturn,
      };
    } else {
      return null;
    }
  };

  /** @internal */
  applyDelta = (delta: protocol.Delta, anySupport: AnySupport): void => {
    if (!delta.register) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedRegister', delta),
      );
    }
    this.resetDelta();
    this.currentValue = anySupport.deserialize(delta.register.value);
  };

  toString = (): string => {
    return `ReplicatedRegister(${this.currentValue})`;
  };
}
