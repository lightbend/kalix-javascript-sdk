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

import {
  replicatedentity,
  ReplicatedWriteConsistency,
  Serializable,
} from '@lightbend/kalix-javascript-sdk';
import protocol from '../generated/tck';

type Request = protocol.akkaserverless.tck.model.replicatedentity.Request;
type IUpdate = protocol.akkaserverless.tck.model.replicatedentity.IUpdate;
type IState = protocol.akkaserverless.tck.model.replicatedentity.IState;

const { Request, Response } =
  protocol.akkaserverless.tck.model.replicatedentity;
const { ReplicatedRegisterClockType } =
  protocol.akkaserverless.tck.model.replicatedentity;

export const tckModel = new replicatedentity.ReplicatedEntity(
  'proto/replicated_entity.proto',
  'akkaserverless.tck.model.replicatedentity.ReplicatedEntityTckModel',
  'replicated-entity-tck-one',
);

tckModel.commandHandlers = {
  Process: process,
};

function createReplicatedData(name: string) {
  const dataType = name.split('-')[0];
  switch (dataType) {
    case 'ReplicatedCounter':
      return new replicatedentity.ReplicatedCounter();
    case 'ReplicatedSet':
      return new replicatedentity.ReplicatedSet();
    case 'ReplicatedRegister':
      return new replicatedentity.ReplicatedRegister('');
    case 'ReplicatedMap':
      const map = new replicatedentity.ReplicatedMap();
      map.defaultValue = (key) => createReplicatedData(key);
      return map;
    case 'ReplicatedCounterMap':
      return new replicatedentity.ReplicatedCounterMap();
    case 'ReplicatedRegisterMap':
      return new replicatedentity.ReplicatedRegisterMap();
    case 'ReplicatedMultiMap':
      return new replicatedentity.ReplicatedMultiMap();
    case 'Vote':
      return new replicatedentity.Vote();
    default:
      throw 'Unknown Replicated Data type: ' + dataType;
  }
}

function process(
  request: Request,
  context: replicatedentity.ReplicatedEntityCommandContext,
) {
  if (context.state === null)
    context.state = createReplicatedData(context.entityId);
  request.actions.forEach((action) => {
    if (action.update) {
      applyUpdate(action.update, context.state);
    } else if (action.delete) {
      context.delete();
    } else if (action.forward) {
      context.forward(two.service.methods.Call, { id: action.forward.id });
    } else if (action.effect) {
      context.effect(
        two.service.methods.Call,
        { id: action.effect.id },
        action.effect.synchronous || false,
      );
    } else if (action.fail?.message) {
      context.fail(action.fail.message);
    }
  });
  return responseValue(context.state);
}

function applyUpdate(
  update: IUpdate | null | undefined,
  state: replicatedentity.ReplicatedData | undefined,
) {
  if (update && state) {
    if (update.counter) {
      const counter = state as replicatedentity.ReplicatedCounter;
      counter.increment(update.counter.change || 0);
    } else if (update.replicatedSet) {
      const set = state as replicatedentity.ReplicatedSet;
      if (update.replicatedSet.add) set.add(update.replicatedSet.add);
      else if (update.replicatedSet.remove)
        set.delete(update.replicatedSet.remove);
      else if (update.replicatedSet.clear) set.clear();
    } else if (update.register) {
      const register = state as replicatedentity.ReplicatedRegister;
      if (
        update.register.clock?.clockType ===
        ReplicatedRegisterClockType.REPLICATED_REGISTER_CLOCK_TYPE_REVERSE
      )
        register.setWithClock(
          update.register.value,
          replicatedentity.Clocks.REVERSE,
        );
      else if (
        update.register.clock?.clockType ===
        ReplicatedRegisterClockType.REPLICATED_REGISTER_CLOCK_TYPE_CUSTOM
      )
        register.setWithClock(
          update.register.value,
          replicatedentity.Clocks.CUSTOM,
          update.register.clock?.customClockValue as number, // FIXME
        );
      else if (
        update.register.clock?.clockType ===
        ReplicatedRegisterClockType.REPLICATED_REGISTER_CLOCK_TYPE_CUSTOM_AUTO_INCREMENT
      )
        register.setWithClock(
          update.register.value,
          replicatedentity.Clocks.CUSTOM_AUTO_INCREMENT,
          update.register.clock?.customClockValue as number, // FIXME
        );
      else register.value = update.register.value;
    } else if (update.replicatedMap) {
      const map = state as replicatedentity.ReplicatedMap;
      if (update.replicatedMap.add && !map.has(update.replicatedMap.add))
        map.set(
          update.replicatedMap.add,
          createReplicatedData(update.replicatedMap.add),
        );
      else if (update.replicatedMap.update)
        applyUpdate(
          update.replicatedMap.update.update,
          map.get(update.replicatedMap.update.key),
        );
      else if (update.replicatedMap.remove)
        map.delete(update.replicatedMap.remove);
      else if (update.replicatedMap.clear) map.clear();
    } else if (update.replicatedCounterMap) {
      const counterMap = state as replicatedentity.ReplicatedCounterMap;
      if (update.replicatedCounterMap.add)
        counterMap.increment(update.replicatedCounterMap.add, 0);
      else if (update.replicatedCounterMap.update)
        counterMap.increment(
          update.replicatedCounterMap.update.key,
          update.replicatedCounterMap.update.change || 0,
        );
      else if (update.replicatedCounterMap.remove)
        counterMap.delete(update.replicatedCounterMap.remove);
      else if (update.replicatedCounterMap.clear) counterMap.clear();
    } else if (update.replicatedRegisterMap) {
      const registerMap = state as replicatedentity.ReplicatedRegisterMap;
      if (update.replicatedRegisterMap.add)
        registerMap.set(update.replicatedRegisterMap.add, '');
      else if (update.replicatedRegisterMap.update) {
        const key = update.replicatedRegisterMap.update.key;
        const value = update.replicatedRegisterMap.update.value;
        const clock = update.replicatedRegisterMap.update.clock;
        if (
          clock?.clockType ===
          ReplicatedRegisterClockType.REPLICATED_REGISTER_CLOCK_TYPE_REVERSE
        )
          registerMap.set(key, value, replicatedentity.Clocks.REVERSE);
        else if (
          clock?.clockType ===
          ReplicatedRegisterClockType.REPLICATED_REGISTER_CLOCK_TYPE_CUSTOM
        )
          registerMap.set(
            key,
            value,
            replicatedentity.Clocks.CUSTOM,
            clock?.customClockValue as number, // FIXME
          );
        else if (
          clock?.clockType ===
          ReplicatedRegisterClockType.REPLICATED_REGISTER_CLOCK_TYPE_CUSTOM_AUTO_INCREMENT
        )
          registerMap.set(
            key,
            value,
            replicatedentity.Clocks.CUSTOM_AUTO_INCREMENT,
            clock?.customClockValue as number, // FIXME
          );
        else registerMap.set(key, value);
        registerMap.set(
          update.replicatedRegisterMap.update.key,
          update.replicatedRegisterMap.update.value,
        );
      } else if (update.replicatedRegisterMap.remove)
        registerMap.delete(update.replicatedRegisterMap.remove);
      else if (update.replicatedRegisterMap.clear) registerMap.clear();
    } else if (update.replicatedMultiMap) {
      const multiMap = state as replicatedentity.ReplicatedMultiMap;
      if (update.replicatedMultiMap.update) {
        const key = update.replicatedMultiMap.update.key;
        const value = update.replicatedMultiMap.update.update;
        if (value?.add) multiMap.put(key, value.add);
        else if (value?.remove) multiMap.delete(key, value.remove);
        else if (value?.clear) multiMap.deleteAll(key);
      } else if (update.replicatedMultiMap.remove)
        multiMap.deleteAll(update.replicatedMultiMap.remove);
      else if (update.replicatedMultiMap.clear) multiMap.clear();
    } else if (update.vote) {
      const vote = state as replicatedentity.Vote;
      vote.vote = update.vote.selfVote || false;
    }
  }
}

function responseValue(state: replicatedentity.ReplicatedData) {
  return Response.create(state ? { state: replicatedDataState(state) } : {});
}

function replicatedDataState(state: replicatedentity.ReplicatedData): IState {
  if (state instanceof replicatedentity.ReplicatedCounter)
    return { counter: state.value ? { value: state.value } : {} };
  else if (state instanceof replicatedentity.ReplicatedSet)
    return {
      replicatedSet: state.size ? { elements: sortedElements(state) } : {},
    };
  else if (state instanceof replicatedentity.ReplicatedRegister)
    return { register: state.value ? { value: state.value } : {} };
  else if (state instanceof replicatedentity.ReplicatedMap)
    return {
      replicatedMap: state.size
        ? { entries: sortedEntries(state, replicatedDataState) }
        : {},
    };
  else if (state instanceof replicatedentity.ReplicatedCounterMap)
    return {
      replicatedCounterMap: state.size
        ? { entries: sortedEntriesFromKeys(state.keys(), state.get) }
        : {},
    };
  else if (state instanceof replicatedentity.ReplicatedRegisterMap)
    return {
      replicatedRegisterMap: state.size
        ? { entries: sortedEntriesFromKeys(state.keys(), state.get) }
        : {},
    };
  else if (state instanceof replicatedentity.ReplicatedMultiMap)
    return {
      replicatedMultiMap:
        state.keysSize > 0
          ? {
              entries: sortedEntriesFromKeys(state.keys(), (key) => ({
                elements: sortedElements(state.get(key)),
              })),
            }
          : {},
    };
  else if (state instanceof replicatedentity.Vote)
    return {
      vote: {
        selfVote: state.vote || null,
        votesFor: state.votesFor || null,
        totalVoters: state.totalVoters,
      },
    };
  else return {};
}

function sortedElements(elements: Iterable<Serializable>): string[] {
  return Array.from(elements).sort();
}

function sortedEntries(
  entries: Iterable<Array<any>>,
  convert: (value: replicatedentity.ReplicatedData) => IState,
) {
  const converted = Array.from(entries, ([key, value]) => ({
    key: key,
    value: convert(value),
  }));
  return converted.sort((a, b) => a.key.localeCompare(b.key));
}

function sortedEntriesFromKeys(
  keys: Iterable<Serializable>,
  get: (key: Serializable) => Serializable,
) {
  const entries = Array.from(keys, (key) => {
    const value = get(key);
    return value ? { key: key, value: value } : { key: key };
  });
  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

export const two = new replicatedentity.ReplicatedEntity(
  'proto/replicated_entity.proto',
  'akkaserverless.tck.model.replicatedentity.ReplicatedEntityTwo',
  'replicated-entity-tck-two',
);

two.commandHandlers = {
  Call: call,
};

function call(
  request: Request,
  context: replicatedentity.ReplicatedEntityCommandContext,
) {
  // create a ReplicatedData to be able to call delete
  if (context.state === null)
    context.state = createReplicatedData(context.entityId);
  request.actions.forEach((action) => {
    if (action.delete) context.delete();
  });
  return Response.create({});
}

export const configured = new replicatedentity.ReplicatedEntity(
  'proto/replicated_entity.proto',
  'akkaserverless.tck.model.replicatedentity.ReplicatedEntityConfigured',
  'replicated-entity-configured',
  {
    entityPassivationStrategy: {
      timeout: 100, // milliseconds
    },
    replicatedWriteConsistency: ReplicatedWriteConsistency.ALL,
  },
);

configured.commandHandlers = {
  Call: () => Response.create(),
};
