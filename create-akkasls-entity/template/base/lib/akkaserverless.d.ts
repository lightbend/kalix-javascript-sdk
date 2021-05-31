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
