import EventSourcedEntity from "@lightbend/akkaserverless-javascript-sdk/src/event-sourced-entity";
import Metadata from "@lightbend/akkaserverless-javascript-sdk/src/metadata";

/**
 * A typed extension of the EventSourcedEntity type enforcing State, Event and Command types
 * as generated from your proto. A TypeScript aware editor such as VS Code should leverage this
 * to ensure all required handlers are implemented and provide hinting around types.
 */
interface TypedEventSourcedEntity<State, EventHandlers, CommandHandlers>
  extends EventSourcedEntity {
  setInitial: (callback: (entityId: string) => State) => void;

  setBehavior: (
    callback: (
      state: State
    ) => {
      commandHandlers: CommandHandlers;
      eventHandlers: EventHandlers;
    }
  ) => void;
}

/**
 * The context passed to command handlers, enforcing the derived Event types
 */
type EventSourcedCommandContext<Event> = {
  effect(
    method: unknown,
    message: unknown,
    synchronous: boolean,
    metadata: Metadata
  ): void;
  emit(event: Event): void;
  fail(message: String): never;
  forward(method: unknown, message: string, metadata: Metadata);
};
