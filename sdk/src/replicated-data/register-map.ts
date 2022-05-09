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

import { Clocks, ReplicatedData } from '.';
import ReplicatedRegister from './register';
import AnySupport, { Comparable } from '../protobuf-any';
import { Serializable } from '../serializable';
import iterators from './iterators';
import util from 'util';
import * as proto from '../../proto/protobuf-bundle';

const debug = require('debug')('kalix-replicated-entity');

namespace protocol {
  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;

  export type EntryDelta =
    proto.kalix.component.replicatedentity.IReplicatedRegisterMapEntryDelta;
}

interface Entry {
  key: Serializable;
  register: ReplicatedRegister;
}

class ReplicatedRegisterMap implements ReplicatedData {
  private registers = new Map<Comparable, Entry>();
  private removed = new Map<Comparable, Serializable>();
  private cleared = false;

  get = (key: Serializable): Serializable => {
    const entry = this.registers.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.register.value : undefined;
  };

  set = (
    key: Serializable,
    value: Serializable,
    clock = Clocks.DEFAULT,
    customClockValue = 0,
  ): ReplicatedRegisterMap => {
    this.getOrCreateRegister(key).setWithClock(value, clock, customClockValue);
    return this;
  };

  has = (key: Serializable): boolean => {
    return this.registers.has(AnySupport.toComparable(key));
  };

  get size(): number {
    return this.registers.size;
  }

  keys = (): IterableIterator<Serializable> => {
    return iterators.map(this.registers.values(), (entry) => entry.key);
  };

  delete = (key: Serializable): ReplicatedRegisterMap => {
    const comparableKey = AnySupport.toComparable(key);
    if (this.registers.has(comparableKey)) {
      this.registers.delete(comparableKey);
      this.removed.set(comparableKey, key);
    }
    return this;
  };

  clear = (): ReplicatedRegisterMap => {
    if (this.registers.size > 0) {
      this.cleared = true;
      this.registers.clear();
      this.removed.clear();
    }
    return this;
  };

  private getOrCreateRegister(key: Serializable): ReplicatedRegister {
    const comparableKey = AnySupport.toComparable(key);
    const entry = this.registers.get(comparableKey);
    if (entry) {
      return entry.register;
    } else {
      const register = new ReplicatedRegister({});
      this.registers.set(comparableKey, { key: key, register: register });
      return register;
    }
  }

  getAndResetDelta = (initial?: boolean): protocol.Delta | null => {
    const updated: protocol.EntryDelta[] = [];
    this.registers.forEach(
      ({ key: key, register: register }, _comparableKey) => {
        const delta = register.getAndResetDelta();
        if (delta !== null) {
          updated.push({
            key: AnySupport.serialize(key, true, true),
            delta: delta.register,
          });
        }
      },
    );
    if (
      this.cleared ||
      this.removed.size > 0 ||
      updated.length > 0 ||
      initial
    ) {
      const delta = {
        replicatedRegisterMap: {
          cleared: this.cleared,
          removed: Array.from(this.removed.values()).map((key) =>
            AnySupport.serialize(key, true, true),
          ),
          updated: updated,
        },
      };
      this.cleared = false;
      this.removed.clear();
      return delta;
    } else {
      return null;
    }
  };

  applyDelta = (delta: protocol.Delta, anySupport: AnySupport): void => {
    if (!delta.replicatedRegisterMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedRegisterMap', delta),
      );
    }
    if (delta.replicatedRegisterMap.cleared) {
      this.registers.clear();
    }
    if (delta.replicatedRegisterMap.removed) {
      delta.replicatedRegisterMap.removed.forEach((serializedKey) => {
        const key = anySupport.deserialize(serializedKey);
        const comparableKey = AnySupport.toComparable(key);
        if (this.registers.has(comparableKey)) {
          this.registers.delete(comparableKey);
        } else {
          debug('Key to delete [%o] is not in ReplicatedRegisterMap', key);
        }
      });
    }
    if (delta.replicatedRegisterMap.updated) {
      delta.replicatedRegisterMap.updated.forEach((entry) => {
        const key = anySupport.deserialize(entry.key);
        this.getOrCreateRegister(key).applyDelta(
          { register: entry.delta },
          anySupport,
        );
      });
    }
  };

  toString = (): string => {
    return (
      'ReplicatedRegisterMap(' +
      Array.from(this.registers.values())
        .map((entry) => entry.key + ' -> ' + entry.register.value)
        .join(', ') +
      ')'
    );
  };
}

export = ReplicatedRegisterMap;
