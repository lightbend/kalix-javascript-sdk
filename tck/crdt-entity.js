/*
 * Copyright 2019 Lightbend Inc.
 */

const crdt = require("@lightbend/akkaserverless-javascript-sdk").crdt;

const tckModel = new crdt.Crdt(
  "proto/crdt_entity.proto",
  "akkaserverless.tck.model.crdtentity.CrdtTckModel",
  "crdt-tck-one",
);

const Response = tckModel.lookupType("akkaserverless.tck.model.crdtentity.Response");

tckModel.commandHandlers = {
  Process: process,
  ProcessStreamed: processStreamed
};

function createCrdt(name) {
  const crdtType = name.split("-")[0];
  switch (crdtType) {
    case "GCounter":
      return new crdt.GCounter();
    case "PNCounter":
      return new crdt.PNCounter();
    case "GSet":
      return new crdt.GSet();
    case "ORSet":
      return new crdt.ORSet();
    case "LWWRegister":
      return new crdt.LWWRegister("");
    case "Flag":
      return new crdt.Flag();
    case "ORMap":
      const map = new crdt.ORMap();
      map.defaultValue = (key) => createCrdt(key);
      return map;
    case "Vote":
      return new crdt.Vote();
    default:
      throw "Unknown CRDT type: " + crdtType;
  }
}

function process(request, context) {
  if (context.state === null) context.state = createCrdt(context.entityId);
  request.actions.forEach(action => {
    if (action.update) {
      if (action.update.writeConsistency === crdt.WriteConsistencies.LOCAL)
        context.writeConsistency = crdt.WriteConsistencies.LOCAL
      else if (action.update.writeConsistency === crdt.WriteConsistencies.MAJORITY)
        context.writeConsistency = crdt.WriteConsistencies.MAJORITY
      else if (action.update.writeConsistency === crdt.WriteConsistencies.ALL)
        context.writeConsistency = crdt.WriteConsistencies.ALL
      applyUpdate(action.update, context.state);
    } else if (action.delete) {
      context.delete();
    } else if (action.forward) {
      context.forward(two.service.methods.Call, { id: action.forward.id });
    } else if (action.effect) {
      context.effect(two.service.methods.Call, { id: action.effect.id }, action.effect.synchronous);
    } else if (action.fail) {
      context.fail(action.fail.message);
    }
  });
  return responseValue(context);
}

function processStreamed(request, context) {
  if (context.state === null) context.state = createCrdt(context.entityId);
  if (context.streamed) {
    context.onStateChange = (state, changedContext) => {
      request.effects.forEach(effect => {
        changedContext.effect(two.service.methods.Call, { id: effect.id }, effect.synchronous);
      });
      if (request.endState && endStateReached(changedContext.state, request.endState))
        changedContext.end();
      if (!request.empty) return responseValue(changedContext);
    }
    if (request.cancelUpdate)
      context.onStreamCancel = state => applyUpdate(request.cancelUpdate, state);
  }
  if (request.initialUpdate)
    applyUpdate(request.initialUpdate, context.state);
  if (!request.empty) return responseValue(context);
}

// TCK only uses GCounter for end state tests
function endStateReached(state, endState) {
  if ((state instanceof crdt.GCounter) && endState.gcounter) {
    return state.value === endState.gcounter.value.toNumber();
  }
  return false;
}

function applyUpdate(update, state) {
  if (update.gcounter) {
    state.increment(update.gcounter.increment);
  } else if (update.pncounter) {
    state.increment(update.pncounter.change);
  } else if (update.gset) {
    state.add(update.gset.add);
  } else if (update.orset) {
    if (update.orset.add)
      state.add(update.orset.add);
    else if (update.orset.remove)
      state.delete(update.orset.remove);
    else if (update.orset.clear)
      state.clear();
  } else if (update.lwwregister) {
    if (update.lwwregister.clock.clockType === crdt.Clocks.REVERSE)
      state.setWithClock(update.lwwregister.value, crdt.Clocks.REVERSE);
    else if (update.lwwregister.clock.clockType === crdt.Clocks.CUSTOM)
      state.setWithClock(update.lwwregister.value, crdt.Clocks.CUSTOM, update.lwwregister.clock.customClockValue);
    else if (update.lwwregister.clock.clockType === crdt.Clocks.CUSTOM_AUTO_INCREMENT)
      state.setWithClock(update.lwwregister.value, crdt.Clocks.CUSTOM_AUTO_INCREMENT, update.lwwregister.clock.customClockValue);
    else
      state.value = update.lwwregister.value;
  } else if (update.flag) {
    state.enable()
  } else if (update.ormap) {
    if (update.ormap.add && !state.has(update.ormap.add))
      state.set(update.ormap.add, createCrdt(update.ormap.add));
    else if (update.ormap.update)
      applyUpdate(update.ormap.update.update, state.get(update.ormap.update.key));
    else if (update.ormap.remove)
      state.delete(update.ormap.remove);
    else if (update.ormap.clear)
      state.clear();
  } else if (update.vote) {
    state.vote = update.vote.selfVote;
  }
}

function responseValue(context) {
  return Response.create(context.noState ? {} : { state: crdtState(context.state) });
}

function crdtState(state) {
  if (state instanceof crdt.GCounter)
    return { gcounter: state.value ? { value: state.value } : {} };
  else if (state instanceof crdt.PNCounter)
    return { pncounter: state.value ? { value: state.value } : {} };
  else if (state instanceof crdt.GSet)
    return { gset: state.size ? { elements: sortedElements(state) } : {} };
  else if (state instanceof crdt.ORSet)
    return { orset: state.size ? { elements: sortedElements(state) } : {} };
  else if (state instanceof crdt.LWWRegister)
    return { lwwregister: state.value ? { value: state.value } : {} };
  else if (state instanceof crdt.Flag)
    return { flag: state.value ? { value: state.value } : {} };
  else if (state instanceof crdt.ORMap)
    return { ormap: state.size ? { entries: sortedEntries(state.entries(), crdtState) } : {} };
  else if (state instanceof crdt.Vote)
    return { vote: { selfVote: state.vote || null, votesFor: state.votesFor || null, totalVoters: state.totalVoters } };
}

function sortedElements(elements) {
  return Array.from(elements).sort();
}

function sortedEntries(entries, convert) {
  const converted = Array.from(entries, ([key, value]) => ({ key: key, value: convert(value) }));
  return converted.sort((a, b) => a.key.localeCompare(b.key));
}

const two = new crdt.Crdt(
  "proto/crdt_entity.proto",
  "akkaserverless.tck.model.crdtentity.CrdtTwo",
  "crdt-tck-two"
);

two.commandHandlers = {
  Call: call
};

function call(request, context) {
  // create a CRDT to be able to call delete
  if (context.state === null) context.state = createCrdt(context.entityId);
  request.actions.forEach(action => {
    if (action.delete) context.delete();
  });
  return Response.create({});
}

const configured = new crdt.Crdt(
  "proto/crdt_entity.proto",
  "akkaserverless.tck.model.crdtentity.CrdtConfigured",
  "crdt-configured",
  {
    entityPassivationStrategy: {
      timeout: 100 // milliseconds
    }
  }
);

configured.commandHandlers = {
  Call: request => Response.create()
};

module.exports.tckModel = tckModel;
module.exports.two = two;
module.exports.configured = configured;
