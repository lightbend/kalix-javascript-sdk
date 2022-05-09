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

import { ReplicatedData } from '.';
import ReplicatedCounter from './counter';
import AnySupport, { Comparable } from '../protobuf-any';
import { Serializable } from '../serializable';
import iterators from './iterators';
import Long from 'long';
import util from 'util';
import * as proto from '../../proto/protobuf-bundle';

const debug = require('debug')('kalix-replicated-entity');

namespace protocol {
  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;

  export type EntryDelta =
    proto.kalix.component.replicatedentity.IReplicatedCounterMapEntryDelta;
}

interface Entry {
  key: Serializable;
  counter: ReplicatedCounter;
}

class ReplicatedCounterMap implements ReplicatedData {
  private counters = new Map<Comparable, Entry>();
  private removed = new Map<Comparable, Serializable>();
  private cleared = false;

  get = (key: Serializable): number | undefined => {
    const entry = this.counters.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.counter.value : undefined;
  };

  getLong = (key: Serializable): Long | undefined => {
    const entry = this.counters.get(AnySupport.toComparable(key));
    return entry !== undefined ? entry.counter.longValue : undefined;
  };

  increment = (
    key: Serializable,
    increment: Long | number,
  ): ReplicatedCounterMap => {
    this.getOrCreateCounter(key).increment(increment);
    return this;
  };

  decrement = (
    key: Serializable,
    decrement: Long | number,
  ): ReplicatedCounterMap => {
    this.getOrCreateCounter(key).decrement(decrement);
    return this;
  };

  has = (key: Serializable): boolean => {
    return this.counters.has(AnySupport.toComparable(key));
  };

  get size(): number {
    return this.counters.size;
  }

  keys = (): IterableIterator<Serializable> => {
    return iterators.map(this.counters.values(), (entry) => entry.key);
  };

  delete = (key: Serializable): ReplicatedCounterMap => {
    const comparableKey = AnySupport.toComparable(key);
    if (this.counters.has(comparableKey)) {
      this.counters.delete(comparableKey);
      this.removed.set(comparableKey, key);
    }
    return this;
  };

  clear = (): ReplicatedCounterMap => {
    if (this.counters.size > 0) {
      this.cleared = true;
      this.counters.clear();
      this.removed.clear();
    }
    return this;
  };

  private getOrCreateCounter(key: Serializable): ReplicatedCounter {
    const comparableKey = AnySupport.toComparable(key);
    const entry = this.counters.get(comparableKey);
    if (entry) {
      return entry.counter;
    } else {
      const counter = new ReplicatedCounter();
      this.counters.set(comparableKey, { key: key, counter: counter });
      return counter;
    }
  }

  getAndResetDelta = (initial?: boolean): protocol.Delta | null => {
    const updated: protocol.EntryDelta[] = [];
    this.counters.forEach(({ key: key, counter: counter }, _comparableKey) => {
      const delta = counter.getAndResetDelta();
      if (delta !== null) {
        updated.push({
          key: AnySupport.serialize(key, true, true),
          delta: delta.counter,
        });
      }
    });
    if (
      this.cleared ||
      this.removed.size > 0 ||
      updated.length > 0 ||
      initial
    ) {
      const delta: protocol.Delta = {
        replicatedCounterMap: {
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
    if (!delta.replicatedCounterMap) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedCounterMap', delta),
      );
    }
    if (delta.replicatedCounterMap.cleared) {
      this.counters.clear();
    }
    if (delta.replicatedCounterMap.removed) {
      delta.replicatedCounterMap.removed.forEach((serializedKey) => {
        const key = anySupport.deserialize(serializedKey);
        const comparableKey = AnySupport.toComparable(key);
        if (this.counters.has(comparableKey)) {
          this.counters.delete(comparableKey);
        } else {
          debug('Key to delete [%o] is not in ReplicatedCounterMap', key);
        }
      });
    }
    if (delta.replicatedCounterMap.updated) {
      delta.replicatedCounterMap.updated.forEach((entry) => {
        const key = anySupport.deserialize(entry.key);
        this.getOrCreateCounter(key).applyDelta({ counter: entry.delta });
      });
    }
  };

  toString = (): string => {
    return (
      'ReplicatedCounterMap(' +
      Array.from(this.counters.values())
        .map((entry) => entry.key + ' -> ' + entry.counter.value)
        .join(', ') +
      ')'
    );
  };
}

export = ReplicatedCounterMap;
