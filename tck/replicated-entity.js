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

const sdk = require('@lightbend/akkaserverless-javascript-sdk');
const ReplicatedEntity = sdk.ReplicatedEntity;
const ReplicatedData = sdk.ReplicatedData;

const tckModel = new ReplicatedEntity(
  'proto/replicated_entity.proto',
  'akkaserverless.tck.model.replicatedentity.ReplicatedEntityTckModel',
  'replicated-entity-tck-one',
);

const Response = tckModel.lookupType(
  'akkaserverless.tck.model.replicatedentity.Response',
);

tckModel.commandHandlers = {
  Process: process,
  ProcessStreamed: processStreamed,
};

function createReplicatedData(name) {
  const dataType = name.split('-')[0];
  switch (dataType) {
    case 'ReplicatedCounter':
      return new ReplicatedData.ReplicatedCounter();
    case 'ORSet':
      return new ReplicatedData.ORSet();
    case 'LWWRegister':
      return new ReplicatedData.LWWRegister('');
    case 'Flag':
      return new ReplicatedData.Flag();
    case 'ORMap':
      const map = new ReplicatedData.ORMap();
      map.defaultValue = (key) => createReplicatedData(key);
      return map;
    case 'Vote':
      return new ReplicatedData.Vote();
    default:
      throw 'Unknown Replicated Data type: ' + dataType;
  }
}

function process(request, context) {
  if (context.state === null)
    context.state = createReplicatedData(context.entityId);
  request.actions.forEach((action) => {
    if (action.update) {
      if (
        action.update.writeConsistency ===
        ReplicatedData.WriteConsistencies.LOCAL
      )
        context.writeConsistency = ReplicatedData.WriteConsistencies.LOCAL;
      else if (
        action.update.writeConsistency ===
        ReplicatedData.WriteConsistencies.MAJORITY
      )
        context.writeConsistency = ReplicatedData.WriteConsistencies.MAJORITY;
      else if (
        action.update.writeConsistency === ReplicatedData.WriteConsistencies.ALL
      )
        context.writeConsistency = ReplicatedData.WriteConsistencies.ALL;
      applyUpdate(action.update, context.state);
    } else if (action.delete) {
      context.delete();
    } else if (action.forward) {
      context.forward(two.service.methods.Call, { id: action.forward.id });
    } else if (action.effect) {
      context.effect(
        two.service.methods.Call,
        { id: action.effect.id },
        action.effect.synchronous,
      );
    } else if (action.fail) {
      context.fail(action.fail.message);
    }
  });
  return responseValue(context);
}

function processStreamed(request, context) {
  if (context.state === null)
    context.state = createReplicatedData(context.entityId);
  if (context.streamed) {
    context.onStateChange = (state, changedContext) => {
      request.effects.forEach((effect) => {
        changedContext.effect(
          two.service.methods.Call,
          { id: effect.id },
          effect.synchronous,
        );
      });
      if (
        request.endState &&
        endStateReached(changedContext.state, request.endState)
      )
        changedContext.end();
      if (!request.empty) return responseValue(changedContext);
    };
    if (request.cancelUpdate)
      context.onStreamCancel = (state) =>
        applyUpdate(request.cancelUpdate, state);
  }
  if (request.initialUpdate) applyUpdate(request.initialUpdate, context.state);
  if (!request.empty) return responseValue(context);
}

// TCK only uses ReplicatedCounter for end state tests
function endStateReached(state, endState) {
  if (state instanceof ReplicatedData.ReplicatedCounter && endState.counter) {
    return state.value === endState.counter.value.toNumber();
  }
  return false;
}

function applyUpdate(update, state) {
  if (update.counter) {
    state.increment(update.counter.change);
  } else if (update.orset) {
    if (update.orset.add) state.add(update.orset.add);
    else if (update.orset.remove) state.delete(update.orset.remove);
    else if (update.orset.clear) state.clear();
  } else if (update.lwwregister) {
    if (update.lwwregister.clock.clockType === ReplicatedData.Clocks.REVERSE)
      state.setWithClock(
        update.lwwregister.value,
        ReplicatedData.Clocks.REVERSE,
      );
    else if (
      update.lwwregister.clock.clockType === ReplicatedData.Clocks.CUSTOM
    )
      state.setWithClock(
        update.lwwregister.value,
        ReplicatedData.Clocks.CUSTOM,
        update.lwwregister.clock.customClockValue,
      );
    else if (
      update.lwwregister.clock.clockType ===
      ReplicatedData.Clocks.CUSTOM_AUTO_INCREMENT
    )
      state.setWithClock(
        update.lwwregister.value,
        ReplicatedData.Clocks.CUSTOM_AUTO_INCREMENT,
        update.lwwregister.clock.customClockValue,
      );
    else state.value = update.lwwregister.value;
  } else if (update.flag) {
    state.enable();
  } else if (update.ormap) {
    if (update.ormap.add && !state.has(update.ormap.add))
      state.set(update.ormap.add, createReplicatedData(update.ormap.add));
    else if (update.ormap.update)
      applyUpdate(
        update.ormap.update.update,
        state.get(update.ormap.update.key),
      );
    else if (update.ormap.remove) state.delete(update.ormap.remove);
    else if (update.ormap.clear) state.clear();
  } else if (update.vote) {
    state.vote = update.vote.selfVote;
  }
}

function responseValue(context) {
  return Response.create(
    context.noState ? {} : { state: replicatedDataState(context.state) },
  );
}

function replicatedDataState(state) {
  if (state instanceof ReplicatedData.ReplicatedCounter)
    return { counter: state.value ? { value: state.value } : {} };
  else if (state instanceof ReplicatedData.ORSet)
    return { orset: state.size ? { elements: sortedElements(state) } : {} };
  else if (state instanceof ReplicatedData.LWWRegister)
    return { lwwregister: state.value ? { value: state.value } : {} };
  else if (state instanceof ReplicatedData.Flag)
    return { flag: state.value ? { value: state.value } : {} };
  else if (state instanceof ReplicatedData.ORMap)
    return {
      ormap: state.size
        ? { entries: sortedEntries(state.entries(), replicatedDataState) }
        : {},
    };
  else if (state instanceof ReplicatedData.Vote)
    return {
      vote: {
        selfVote: state.vote || null,
        votesFor: state.votesFor || null,
        totalVoters: state.totalVoters,
      },
    };
}

function sortedElements(elements) {
  return Array.from(elements).sort();
}

function sortedEntries(entries, convert) {
  const converted = Array.from(entries, ([key, value]) => ({
    key: key,
    value: convert(value),
  }));
  return converted.sort((a, b) => a.key.localeCompare(b.key));
}

const two = new ReplicatedEntity(
  'proto/replicated_entity.proto',
  'akkaserverless.tck.model.replicatedentity.ReplicatedEntityTwo',
  'replicated-entity-tck-two',
);

two.commandHandlers = {
  Call: call,
};

function call(request, context) {
  // create a ReplicatedData to be able to call delete
  if (context.state === null)
    context.state = createReplicatedData(context.entityId);
  request.actions.forEach((action) => {
    if (action.delete) context.delete();
  });
  return Response.create({});
}

const configured = new ReplicatedEntity(
  'proto/replicated_entity.proto',
  'akkaserverless.tck.model.replicatedentity.ReplicatedEntityConfigured',
  'replicated-entity-configured',
  {
    entityPassivationStrategy: {
      timeout: 100, // milliseconds
    },
  },
);

configured.commandHandlers = {
  Call: (request) => Response.create(),
};

module.exports.tckModel = tckModel;
module.exports.two = two;
module.exports.configured = configured;
