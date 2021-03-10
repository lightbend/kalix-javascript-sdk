/**
 * Mocks the behaviour of a single Akka Serverless entity.
 *
 * Handles any commands and events, internally tracking the state and maintaining an event log.
 *
 * NOTE: Entity IDs are not handled, so all commands are assumed to refer to a single entity.
 */
export class AkkaServerlessTestKitEntity {
  events = [];
  state;
  error;

  constructor(entity, entityId) {
    this.entity = entity;
    this.entityId = entityId;
    this.state = entity.initial(entityId);
  }

  /**
   * Handle the provided command, and return the result. Any emitted events are also handled.
   *
   * @param {string} commandName the command method name (as per the entity proto definition)
   * @param {object} command the request body
   * @param {AkkaServerlessTestKitContext} ctx override the context object for this handler for advanced behaviour
   * @returns the result of the command
   */
  handleCommand(
    commandName,
    command,
    ctx = new AkkaServerlessTestKitContext()
  ) {
    const behaviors = this.entity.behavior(this.state);
    const handler = behaviors.commandHandlers[commandName];

    const result = handler(command, this.state, ctx);
    ctx.events.forEach((event) => this.handleEvent(event));
    this.error = ctx.error;
    return result;
  }

  /**
   * Handle the provied event, and add it to the event log.
   * @param {object} event the event payload
   */
  handleEvent(event) {
    const behaviors = this.entity.behavior(this.state);
    const handler = behaviors.eventHandlers[event.type];

    this.state = handler(event, this.state);
    this.events.push(event);
  }
}

/**
 * Mocks the behaviour of the command context object within Akka Serverless.
 *
 * By default, calls to [AkkaServerlessTestKitEntity~handleCommand] will
 * construct their own instance of this class, however for making assertions on
 * forwarding or emmitted effects you may provide your own.
 */
export class AkkaServerlessTestKitContext {
  events = [];
  effects = [];
  thenForward = () => {};
  error;

  emit(event) {
    this.events.push(event);
  }

  fail(error) {
    this.error = error;
  }

  onForward(handler) {
    this.thenForward = handler;
  }

  effect(method, message, synchronous, metadata) {
    effects.push({
      method,
      message,
      synchronous,
      metadata,
    });
  }
}
