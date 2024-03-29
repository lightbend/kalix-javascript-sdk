/*
 * Copyright 2021-2023 Lightbend Inc.
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

import { EffectMethod } from './effect';
import { Metadata } from './metadata';
import { GrpcStatus } from './grpc-status';

/**
 * Side effect for a reply.
 *
 * @public
 */
export class Effect {
  /**
   * @param method - the entity service method to invoke
   * @param message - the message to send to that service
   * @param synchronous - whether the effect should be execute synchronously or not, default is false
   * @param metadata - metadata to send with the effect
   */
  constructor(
    readonly method: EffectMethod,
    readonly message: any,
    readonly synchronous: boolean = false,
    readonly metadata?: Metadata,
  ) {}
}

/**
 * A return type to allow returning forwards or failures, and attaching effects to messages.
 *
 * @typeParam Message - the type of the reply message
 *
 * @public
 */
export class Reply<Message = any> {
  constructor(
    private method?: EffectMethod,
    private message?: Message,
    private metadata?: Metadata,
    private forward?: Reply,
    private failure?: Failure,
    private effects: Effect[] = [],
  ) {}

  /**
   * Create a message reply.
   *
   * @typeParam Message - the type of the reply message
   * @param message - the message to reply with
   * @param metadata - optional metadata to pass with the reply
   * @returns a message reply
   */
  static message<Message>(
    message: Message,
    metadata?: Metadata,
  ): Reply<Message> {
    const reply = new Reply<Message>()
      .setMessage(message)
      .setMetadata(metadata);
    return reply;
  }

  /**
   * Create a forward reply.
   *
   * @typeParam Message - the type of the reply message
   * @param method - the service call representing the forward
   * @param message - the message to forward
   * @param metadata -  optional metadata to pass with the forwarded message
   * @returns a forward reply
   */
  static forward<Message>(
    method: EffectMethod,
    message: any,
    metadata?: Metadata,
  ): Reply<Message> {
    const forward = new Reply()
      .setMethod(method)
      .setMessage(message)
      .setMetadata(metadata);
    const reply = new Reply<Message>().setForward(forward);
    return reply;
  }

  /**
   * Create a failure reply.
   *
   * @typeParam Message - the type of the reply message
   * @param description - description of the failure
   * @param status - the GRPC status, defaults to Unknown
   * @returns a failure reply
   */
  static failure<Message>(
    description: string,
    status?: GrpcStatus,
  ): Reply<Message> {
    const reply = new Reply<Message>().setFailure(description, status);
    return reply;
  }

  /**
   * Create a reply that contains neither a message nor a forward nor a failure.
   *
   * This may be useful for emitting effects while sending an empty message.
   *
   * @typeParam Message - the type of the reply message
   * @returns an empty reply
   */
  static empty<Message>(): Reply<Message> {
    return new Reply<Message>();
  }

  /**
   * @returns the protobuf method for a forwarding reply
   */
  getMethod(): EffectMethod | undefined {
    return this.method;
  }

  /**
   * Set the protobuf service method for a forwarding reply.
   *
   * @param method - the protobuf service method
   * @returns the updated reply
   */
  setMethod(method: EffectMethod): Reply<Message> {
    this.method = method;
    return this;
  }

  /**
   * @returns the reply message
   */
  getMessage(): Message | undefined {
    return this.message;
  }

  /**
   * Set the message for this reply.
   * @param message - the reply message
   * @returns the updated reply
   */
  setMessage(message: Message): Reply<Message> {
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
  setMetadata(metadata?: Metadata): Reply<Message> {
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
  setForward(forward: Reply): Reply<Message> {
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
  setFailure(description: string, status?: GrpcStatus): Reply<Message> {
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
    method: EffectMethod,
    message: any,
    synchronous: boolean = false,
    metadata: Metadata | undefined = undefined,
  ): Reply<Message> {
    this.addEffects([new Effect(method, message, synchronous, metadata)]);
    return this;
  }

  /**
   * Attach the given effects to this reply.
   *
   * @param effects - service calls to execute as side effects
   * @returns this reply after adding the effects
   */
  addEffects(effects: Effect[]): Reply<Message> {
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
 * @typeParam Message - the type of the reply message
 * @param message - the message to reply with
 * @param metadata - optional metadata to pass with the reply
 * @returns a message reply
 *
 * @see also provided by {@link Reply.message}
 *
 * @public
 */
export function message<Message>(
  message: Message,
  metadata?: Metadata,
): Reply<Message> {
  return Reply.message(message, metadata);
}

/**
 * Create a forward reply.
 *
 * @typeParam Message - the type of the reply message
 * @param method - the service call representing the forward
 * @param message - the message to forward
 * @param metadata -  optional metadata to pass with the forwarded message
 * @returns a forward reply
 *
 * @see also provided by {@link Reply.forward}
 *
 * @public
 */
export function forward<Message>(
  method: EffectMethod,
  message: any,
  metadata?: Metadata,
): Reply<Message> {
  return Reply.forward<Message>(method, message, metadata);
}

/**
 * Create a failure reply.
 *
 * @typeParam Message - the type of the reply message
 * @param description - description of the failure
 * @param status - the GRPC status, defaults to Unknown
 * @returns a failure reply
 *
 * @see also provided by {@link Reply.failure}
 *
 * @public
 */
export function failure<Message>(
  description: string,
  status?: GrpcStatus,
): Reply<Message> {
  return Reply.failure<Message>(description, status);
}

/**
 * Create a reply that contains neither a message nor a forward nor a failure.
 *
 * This may be useful for emitting effects while sending an empty message.
 *
 * @typeParam Message - the type of the reply message
 * @returns an empty reply
 *
 * @see also provided by {@link Reply.empty}
 *
 * @public
 */
export function emptyReply<Message>(): Reply<Message> {
  return Reply.empty<Message>();
}

/** @public */
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
