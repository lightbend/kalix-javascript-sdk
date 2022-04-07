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

import { Method } from 'protobufjs';
import { Metadata } from './metadata';
import { GrpcStatus } from './kalix';

// Note that there is a parallel reply.jsdoc that needs to be changed for API changes here to be visible

/**
 * Side effect for a reply.
 */
export class Effect {
  /**
   * @param method - the entity service method to invoke
   * @param message - the message to send to that service
   * @param synchronous - whether the effect should be execute synchronously or not, default is false
   * @param metadata - metadata to send with the effect
   */
  constructor(
    readonly method: Method,
    readonly message: any,
    readonly synchronous: boolean = false,
    readonly metadata?: Metadata,
  ) {}
}

/**
 * A return type to allow returning forwards or failures, and attaching effects to messages.
 */
export class Reply {
  constructor(
    private method?: Method,
    private message?: any,
    private metadata?: Metadata,
    private forward?: Reply,
    private failure?: Failure,
    private effects: Effect[] = [],
  ) {}

  /**
   * @returns the protobuf method for a forwarding reply
   */
  getMethod(): Method | undefined {
    return this.method;
  }

  /**
   * Set the protobuf method for a forwarding reply.
   *
   * @param method - the protobuf method
   * @returns the updated reply
   */
  setMethod(method: Method): Reply {
    this.method = method;
    return this;
  }

  /**
   * @returns the reply message
   */
  getMessage(): any {
    return this.message;
  }

  /**
   * Set the message for this reply.
   * @param message - the reply message
   * @returns the updated reply
   */
  setMessage(message: any): Reply {
    this.message = message;
    return this;
  }

  /**
   * @returns the metadata attached to the reply
   */
  getMetadata(): Metadata | undefined {
    return this.metadata;
  }

  /**
   * Attach metadata to this reply.
   *
   * @param metadata - metadata to send with the reply
   * @returns the updated reply
   */
  setMetadata(metadata?: Metadata): Reply {
    this.metadata = metadata;
    return this;
  }

  /**
   * @returns the forwarding reply
   */
  getForward(): Reply | undefined {
    return this.forward;
  }

  /**
   * Make this a forwarding reply.
   *
   * @param forward - the forward reply
   * @returns the updated reply
   */
  setForward(forward: Reply): Reply {
    this.forward = forward;
    return this;
  }

  /**
   * @returns the failure
   */
  getFailure(): Failure | undefined {
    return this.failure;
  }

  /**
   * Make this a failure reply.
   *
   * @param description - the failure description
   * @param status - the status code to fail with, defaults to Unknown.
   * @returns the updated reply
   */
  setFailure(description: string, status?: GrpcStatus): Reply {
    this.failure = new Failure(description, status);
    return this;
  }

  /**
   * @returns the side effects for this reply
   */
  getEffects(): Effect[] {
    return this.effects;
  }

  /**
   * Attach the given effect to this reply.
   *
   * @param method - the entity service method to invoke
   * @param message - the message to send to that service
   * @param synchronous - whether the effect should be execute synchronously or not, default is false
   * @param metadata - metadata to send with the effect
   * @returns this reply after adding the effect
   */
  addEffect(
    method: Method,
    message: any,
    synchronous: boolean = false,
    metadata: Metadata | undefined = undefined,
  ): Reply {
    this.addEffects([new Effect(method, message, synchronous, metadata)]);
    return this;
  }

  /**
   * Attach the given effects to this reply.
   *
   * @param effects - service calls to execute as side effects
   * @returns this reply after adding the effects
   */
  addEffects(effects: Effect[]): Reply {
    if (this.effects) this.effects.push(...effects);
    else this.effects = effects;
    return this;
  }

  /**
   * Whether this reply is empty: does not have a message, forward, or failure.
   *
   * @returns whether the reply is empty
   */
  isEmpty(): boolean {
    return !this.message && !this.forward && !this.failure;
  }
}

/**
 * Create a message reply.
 *
 * @param message - the message to reply with
 * @param metadata - optional metadata to pass with the reply
 * @returns a message reply
 */
export function message(
  message: any,
  metadata: Metadata | undefined = undefined,
): Reply {
  const reply = new Reply().setMessage(message).setMetadata(metadata);
  return reply;
}

/**
 * Create a forward reply.
 *
 * @param method - the service call representing the forward
 * @param message - the message to forward
 * @param metadata -  optional metadata to pass with the forwarded message
 * @returns a forward reply
 */
export function forward(
  method: protobuf.Method,
  message: any,
  metadata: Metadata | undefined = undefined,
): Reply {
  const forward = new Reply()
    .setMethod(method)
    .setMessage(message)
    .setMetadata(metadata);

  const reply = new Reply().setForward(forward);
  return reply;
}

/**
 * Create a failure reply.
 *
 * @param description - description of the failure
 * @param status - the GRPC status, defaults to Unknown
 * @return a failure reply
 */
export function failure(description: string, status?: GrpcStatus): Reply {
  const reply = new Reply().setFailure(description, status);
  return reply;
}

/**
 * Create a reply that contains neither a message nor a forward nor a failure.
 *
 * This may be useful for emitting effects without sending a message.
 *
 * @returns an empty reply
 */
export function noReply(): Reply {
  return new Reply();
}

export class Failure {
  constructor(private description: string, private status?: GrpcStatus) {
    if (status !== undefined) {
      if (status === GrpcStatus.Ok) {
        throw new Error('gRPC failure status code must not be OK');
      }
      if (status < 0 || status > 16) {
        throw new Error('Invalid gRPC status code: ' + status);
      }
    }
  }

  getDescription(): string {
    return this.description;
  }

  getStatus(): GrpcStatus | undefined {
    return this.status;
  }
}
