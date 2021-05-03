/*
 * Copyright 2021 Lightbend Inc.
 */

const util = require("util");

/**
 * @classdesc A Vote Replicated Data type.
 *
 * A Vote Replicated Data type allows all nodes an a cluster to vote on a condition, such as whether a user is online.
 *
 * @constructor module:akkaserverless.replicatedentity.Vote
 * @extends module:akkaserverless.replicatedentity.ReplicatedData
 */
function Vote() {
  let currentSelfVote = false;
  let currentVotesFor = 0;
  let currentTotalVoters = 1;
  let delta = null;

  /**
   * The number of nodes that have voted for this condition.
   *
   * @name module:akkaserverless.replicatedentity.Vote#votesFor
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, "votesFor", {
    get: function () {
      return currentVotesFor;
    }
  });

  /**
   * The total number of nodes that have voted.
   *
   * @name module:akkaserverless.replicatedentity.Vote#totalVoters
   * @type {number}
   * @readonly
   */
  Object.defineProperty(this, "totalVoters", {
    get: function () {
      return currentTotalVoters;
    }
  });

  /**
   * Whether at least one node has voted for this condition.
   *
   * @name module:akkaserverless.replicatedentity.Vote#atLeastOne
   * @type {boolean}
   * @readonly
   */
  Object.defineProperty(this, "atLeastOne", {
    get: function () {
      return currentVotesFor > 0;
    }
  });

  /**
   * Whether a majority of nodes have voted for this condition.
   *
   * @name module:akkaserverless.replicatedentity.Vote#majority
   * @type {boolean}
   * @readonly
   */
  Object.defineProperty(this, "majority", {
    get: function () {
      return currentVotesFor > currentTotalVoters / 2;
    }
  });

  /**
   * Whether all of nodes have voted for this condition.
   *
   * @name module:akkaserverless.replicatedentity.Vote#all
   * @type {boolean}
   * @readonly
   */
  Object.defineProperty(this, "all", {
    get: function () {
      return currentVotesFor === currentTotalVoters;
    }
  });

  /**
   * The current nodes vote.
   *
   * Setting this will update the current nodes vote accordingly.
   *
   * @name module:akkaserverless.replicatedentity.Vote#vote
   * @type {boolean}
   */
  Object.defineProperty(this, "vote", {
    get: function () {
      return currentSelfVote;
    },
    set: function(value) {
      if (value && !currentSelfVote) {
        currentSelfVote = true;
        currentVotesFor += 1;
        delta = true;
      } else if (!value && currentSelfVote) {
        currentSelfVote = false;
        currentVotesFor -= 1;
        delta = false;
      }
    }
  });

  this.getAndResetDelta = function (initial) {
    if (initial) {
      delta = currentSelfVote;
    }
    if (delta !== null) {
      const vote = delta;
      delta = null;
      return {
        vote: {
          selfVote: vote
        }
      };
    } else {
      return null;
    }
  };

  this.applyDelta = function (delta) {
    if (!delta.vote) {
      throw new Error(util.format("Cannot apply delta %o to Vote", delta));
    }
    currentSelfVote = delta.vote.selfVote;
    currentVotesFor = delta.vote.votesFor;
    currentTotalVoters = delta.vote.totalVoters;
  };

  this.toString = function () {
    return "Vote(" + currentSelfVote + ")";
  };
}

module.exports = Vote;
