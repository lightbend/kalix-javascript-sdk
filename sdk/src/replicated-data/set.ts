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
import { ReplicatedData } from '.';
import AnySupport, { Comparable } from '../protobuf-any';
import { Serializable } from '../serializable';
import * as proto from '../../proto/protobuf-bundle';

const debug = require('debug')('kalix-replicated-entity');

namespace protocol {
  export type Any = proto.google.protobuf.IAny;

  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;
}

namespace ReplicatedSet {
  export type ForEachCallback = (element: Serializable) => void;
}

class ReplicatedSet implements ReplicatedData, Iterable<Serializable> {
  // Map of a comparable form (that compares correctly using ===) of the elements to the elements
  private currentValue = new Map<Comparable, Serializable>();
  private delta = {
    added: new Map<Comparable, protocol.Any>(),
    removed: new Map<Comparable, protocol.Any>(),
    cleared: false,
  };

  has = (element: Serializable): boolean => {
    return this.currentValue.has(AnySupport.toComparable(element));
  };

  get size(): number {
    return this.currentValue.size;
  }

  forEach = (callback: ReplicatedSet.ForEachCallback): void => {
    return this.currentValue.forEach((value, _key) => callback(value));
  };

  [Symbol.iterator] = (): Iterator<Serializable> => {
    return this.currentValue.values();
  };

  elements = (): Set<Serializable> => {
    return new Set(this.currentValue.values());
  };

  add = (element: Serializable): ReplicatedSet => {
    const comparable = AnySupport.toComparable(element);
    if (!this.currentValue.has(comparable)) {
      if (this.delta.removed.has(comparable)) {
        this.delta.removed.delete(comparable);
      } else {
        const serializedElement = AnySupport.serialize(element, true, true);
        this.delta.added.set(comparable, serializedElement);
      }
      this.currentValue.set(comparable, element);
    }
    return this;
  };

  addAll = (elements: Iterable<Serializable>): ReplicatedSet => {
    for (const element of elements) {
      this.add(element);
    }
    return this;
  };

  delete = (element: Serializable): ReplicatedSet => {
    const comparable = AnySupport.toComparable(element);
    if (this.currentValue.has(comparable)) {
      if (this.currentValue.size === 1) {
        this.clear();
      } else {
        this.currentValue.delete(comparable);
        if (this.delta.added.has(comparable)) {
          this.delta.added.delete(comparable);
        } else {
          const serializedElement = AnySupport.serialize(element, true, true);
          this.delta.removed.set(comparable, serializedElement);
        }
      }
    }
    return this;
  };

  clear = (): ReplicatedSet => {
    if (this.currentValue.size > 0) {
      this.delta.cleared = true;
      this.delta.added.clear();
      this.delta.removed.clear();
      this.currentValue.clear();
    }
    return this;
  };

  getAndResetDelta = (initial?: boolean): protocol.Delta | null => {
    if (
      this.delta.cleared ||
      this.delta.added.size > 0 ||
      this.delta.removed.size > 0 ||
      initial
    ) {
      const currentDelta: protocol.Delta = {
        replicatedSet: {
          cleared: this.delta.cleared,
          removed: Array.from(this.delta.removed.values()),
          added: Array.from(this.delta.added.values()),
        },
      };
      this.delta.cleared = false;
      this.delta.added.clear();
      this.delta.removed.clear();
      return currentDelta;
    } else {
      return null;
    }
  };

  applyDelta = (delta: protocol.Delta, anySupport: AnySupport): void => {
    if (!delta.replicatedSet) {
      throw new Error(
        util.format('Cannot apply delta %o to ReplicatedSet', delta),
      );
    }
    if (delta.replicatedSet.cleared) {
      this.currentValue.clear();
    }
    if (delta.replicatedSet.removed) {
      delta.replicatedSet.removed.forEach((element) => {
        const value = anySupport.deserialize(element);
        const comparable = AnySupport.toComparable(value);
        if (this.currentValue.has(comparable)) {
          this.currentValue.delete(comparable);
        } else {
          debug(
            "Delta instructed to delete element [%o], but it wasn't in the ReplicatedSet.",
            comparable,
          );
        }
      });
    }
    if (delta.replicatedSet.added) {
      delta.replicatedSet.added.forEach((element) => {
        const value = anySupport.deserialize(element);
        const comparable = AnySupport.toComparable(value);
        if (this.currentValue.has(comparable)) {
          debug(
            "Delta instructed to add value [%o], but it's already present in the ReplicatedSet",
            comparable,
          );
        } else {
          this.currentValue.set(comparable, value);
        }
      });
    }
  };

  toString = (): string => {
    return `ReplicatedSet(${Array.from(this.currentValue).join(',')})`;
  };
}

export = ReplicatedSet;
