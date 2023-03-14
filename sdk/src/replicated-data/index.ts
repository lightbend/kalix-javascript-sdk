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

import * as util from 'util';
import AnySupport from '../protobuf-any';
import * as protocol from '../../types/protocol/replicated-entities';

import { ReplicatedCounter } from './counter';
import { ReplicatedSet } from './set';
import { ReplicatedRegister } from './register';
import { ReplicatedMap } from './map';
import { ReplicatedCounterMap } from './counter-map';
import { ReplicatedRegisterMap } from './register-map';
import { ReplicatedMultiMap } from './multi-map';
import { Vote } from './vote';

/**
 * A Replicated Data type.
 *
 * @public
 */
export interface ReplicatedData {
  /** @internal */
  getAndResetDelta(initial?: boolean): protocol.DeltaOut | null;

  /** @internal */
  applyDelta(
    delta: protocol.DeltaIn,
    anySupport: AnySupport,
    createForDelta: (delta: protocol.DeltaIn) => ReplicatedData,
  ): void;
}

export {
  ReplicatedCounter,
  ReplicatedSet,
  ReplicatedRegister,
  ReplicatedMap,
  ReplicatedCounterMap,
  ReplicatedRegisterMap,
  ReplicatedMultiMap,
  Vote,
};

/**
 * A clock that may be used by {@link ReplicatedRegister}.
 *
 * @public
 */
export type Clock = number;

/**
 * An enum of all clocks that can be used by {@link ReplicatedRegister}.
 *
 * @public
 */
export enum Clocks {
  /**
   * The default clock, uses the machines system time.
   */
  DEFAULT = 0,

  /**
   * A reverse clock, for achieving first - write - wins semantics.
   */
  REVERSE = 1,

  /**
   * A custom clock.
   */
  CUSTOM = 2,

  /**
   * A custom clock that automatically increments if the current clock value is less than the existing clock value.
   */
  CUSTOM_AUTO_INCREMENT = 3,
}

/** @internal */
export function createForDelta(delta: protocol.DeltaIn): ReplicatedData {
  if (delta.counter) {
    return new ReplicatedCounter();
  } else if (delta.replicatedSet) {
    return new ReplicatedSet();
  } else if (delta.register) {
    // It needs to be initialised with a value
    return new ReplicatedRegister({});
  } else if (delta.replicatedMap) {
    return new ReplicatedMap();
  } else if (delta.replicatedCounterMap) {
    return new ReplicatedCounterMap();
  } else if (delta.replicatedRegisterMap) {
    return new ReplicatedRegisterMap();
  } else if (delta.replicatedMultiMap) {
    return new ReplicatedMultiMap();
  } else if (delta.vote) {
    return new Vote();
  } else {
    throw new Error(util.format('Unknown Replicated Data type: %o', delta));
  }
}
