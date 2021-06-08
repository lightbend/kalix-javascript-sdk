/*
Copyright 2021 Lightbend Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import EventSourcedEntity from "@lightbend/akkaserverless-javascript-sdk/src/event-sourced-entity";
import ValueEntity from "@lightbend/akkaserverless-javascript-sdk/src/value-entity";
import Metadata from "@lightbend/akkaserverless-javascript-sdk/src/metadata";

/**
 * A typed extension of the EventSourcedEntity type enforcing State, Event and Command types
 * as generated from your proto. A TypeScript aware editor such as VS Code should leverage this
 * to ensure all required handlers are implemented and provide hinting around types.
 */
interface TypedEventSourcedEntity<State, EventHandlers, CommandHandlers>
  extends EventSourcedEntity {
  setInitial: (
    callback: (entityId: string) => State
  ) => TypedEventSourcedEntity<State, EventHandlers, CommandHandlers>;

  setBehavior: (
    callback: (
      state: State
    ) => {
      commandHandlers: CommandHandlers;
      eventHandlers: EventHandlers;
    }
  ) => TypedEventSourcedEntity<State, EventHandlers, CommandHandlers>;
}

/**
 * A typed extension of the ValueEntity type enforcing State and Command types
 * as generated from your proto. A TypeScript aware editor such as VS Code should leverage this
 * to ensure all required handlers are implemented and provide hinting around types.
 */
interface TypedValueEntity<State, CommandHandlers> extends ValueEntity {
  setInitial: (
    callback: (entityId: string) => State
  ) => TypedValueEntity<State, CommandHandlers>;

  setCommandHandlers: (
    commandHandlers: CommandHandlers
  ) => TypedValueEntity<State, CommandHandlers>;
}

/**
 * The context passed to all command handlers.
 */
type CommandContext = {
  effect(
    method: unknown,
    message: unknown,
    synchronous: boolean,
    metadata: Metadata
  ): void;
  fail(message: String): never;
  forward(method: unknown, message: string, metadata: Metadata);
  entityId: string;
  commandId: Long;
};

/**
 * The context passed to EventSourced command handlers, enforcing the derived Event types
 */
type EventSourcedCommandContext<Event> = CommandContext & {
  emit(event: Event): void;
};

/**
 * The context passed to ValueEntity command handlers, enforcing the derived State type
 */
type ValueEntityCommandContext<State> = CommandContext & {
  updateState(state: State): void;
  deleteState(): void;
};
