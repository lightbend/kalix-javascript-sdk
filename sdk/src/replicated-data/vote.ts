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
import * as proto from '../../proto/protobuf-bundle';

namespace protocol {
  export type Delta =
    proto.kalix.component.replicatedentity.IReplicatedEntityDelta;
}

class Vote implements ReplicatedData {
  private currentSelfVote = false;
  private currentVotesFor = 0;
  private currentTotalVoters = 1;
  private delta: boolean | null = null;

  get votesFor(): number {
    return this.currentVotesFor;
  }

  get totalVoters(): number {
    return this.currentTotalVoters;
  }

  get atLeastOne(): boolean {
    return this.currentVotesFor > 0;
  }

  get majority(): boolean {
    return this.currentVotesFor > this.currentTotalVoters / 2;
  }

  get all(): boolean {
    return this.currentVotesFor === this.currentTotalVoters;
  }

  get vote(): boolean {
    return this.currentSelfVote;
  }

  set vote(value: boolean) {
    if (value && !this.currentSelfVote) {
      this.currentSelfVote = true;
      this.currentVotesFor += 1;
      this.delta = true;
    } else if (!value && this.currentSelfVote) {
      this.currentSelfVote = false;
      this.currentVotesFor -= 1;
      this.delta = false;
    }
  }

  getAndResetDelta = (initial?: boolean): protocol.Delta | null => {
    if (initial) {
      this.delta = this.currentSelfVote;
    }
    if (this.delta !== null) {
      const vote = this.delta;
      this.delta = null;
      return {
        vote: {
          selfVote: vote,
        },
      };
    } else {
      return null;
    }
  };

  applyDelta = (delta: protocol.Delta): void => {
    if (!delta.vote) {
      throw new Error(util.format('Cannot apply delta %o to Vote', delta));
    }
    this.currentSelfVote = delta.vote.selfVote ?? false;
    this.currentVotesFor = delta.vote.votesFor ?? 0;
    this.currentTotalVoters = delta.vote.totalVoters ?? 0;
  };

  toString = (): string => {
    return `Vote(${this.currentSelfVote})`;
  };
}

export = Vote;
