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
import AnySupport from '../protobuf-any';
import { ReplicatedData, Clock, Clocks } from '.';
import { Serializable } from '../serializable';
import * as proto from '../../proto/protobuf-bundle';

namespace protocol {
  export type Any = proto.google.protobuf.IAny;

  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;

  export type RegisterDelta =
    proto.kalix.component.replicatedentity.IReplicatedRegisterDelta;
}

class ReplicatedRegister implements ReplicatedData {
  private currentValue: Serializable;
  private delta: protocol.RegisterDelta;

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

  get value(): Serializable {
    return this.currentValue;
  }

  set value(value: Serializable) {
    this.setWithClock(value);
  }

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

export = ReplicatedRegister;
