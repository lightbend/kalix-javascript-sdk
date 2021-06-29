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

import { Method } from "protobufjs";
import { Metadata } from "./metadata";

/**
 * @memberOf module:akkaserverless.replies
 */
class Effect {
  /**
   * @param {protobuf.Method} method The entity service method to invoke.
   * @param {object} message The message to send to that service.
   * @param {module:akkaserverless.Metadata} [metadata] Metadata to send with the effect.
   * @param {boolean} [synchronous] Whether the effect should be execute synchronously or not, default is false
   */
  constructor(
    readonly method: Method,
    readonly message: any,
    readonly synchronous: boolean = false,
    readonly metadata: Metadata) {}
}

/**
 * A return type to allow returning forwards or failures, and attaching effects to messages.
 *
 * @memberOf module:akkaserverless.replies
 */
export class Reply {

  constructor(
    private method: Method | undefined = undefined,
    private message: any | undefined = undefined,
    private metadata: Metadata | undefined = undefined,
    private forward: Reply | undefined = undefined,
    private failure: string | undefined = undefined,
    private effects: Effect[] = []) {}

  getMethod() {
    return this.method;
  }
  setMethod(method: Method): Reply {
    this.method = method;
    return this;
  }

  getMessage() {
    return this.message;
  }
  setMessage(message: any): Reply {
    this.message = message;
    return this;
  }

  getMetadata() {
    return this.metadata;
  }
  setMetadata(metadata: Metadata): Reply {
    this.metadata = metadata;
    return this;
  }

  getForward() {
    return this.forward;
  }
  setForward(forward: Reply): Reply {
    this.forward = forward;
    return this;
  }

  getFailure() {
    return this.failure;
  }
  setFailure(failure: string): Reply {
    this.failure = failure;
    return this;
  }

  getEffects() {
    return this.effects;
  }

  /**
   * Attach the given effect(s) to this reply
   *
   * @param {protobuf.Method} method The entity service method to invoke.
   * @param {object} message The message to send to that service.
   * @param {module:akkaserverless.Metadata} [metadata] Metadata to send with the effect.
   * @param {boolean} [synchronous] Whether the effect should be execute synchronously or not, default is false.
   * @return {module:akkaserverless.replies.Reply} This reply after adding the effect.
   */
  addEffect(method: Method, message: any, synchronous: boolean, metadata: Metadata): Reply {
    this.addEffects([new Effect(method, message, synchronous, metadata)]);
    return this;
  }

  /**
   * Attach the given effect(s) to this reply
   *
   * @param {Effect[]} effects One or more service calls to execute as side effects
   * @return {module:akkaserverless.replies.Reply} This reply after adding the effects.
   */
  addEffects(effects: Effect[]): Reply {
    if (this.effects) this.effects.push(...effects);
    else this.effects = effects;
    return this;
  }

  /**
   * Whether this reply is empty: does not have a message, forward, or failure.
   *
   * @return {boolean} Whether the reply is empty.
   */
  isEmpty(): boolean {
    return !this.message && !this.forward && !this.failure;
  }
}

/**
 * Factory for creating various types of replies from a component
 * @memberOf module:akkaserverless.replies
 */
// class ReplyFactory {
  /**
   * Create a message reply.
   *
   * @param {object} message the message to reply with
   * @param {module:akkaserverless.Metadata} [metadata] Optional metadata to pass with the reply
   * @return {module:akkaserverless.replies.Reply} A message reply
   */
export function message(message: any, metadata: Metadata): Reply {
    const reply = new Reply()
      .setMessage(message)
      .setMetadata(metadata);
    return reply;
  }

  /**
   * @param {protobuf.Method} method The service call representing the forward.
   * @param {object} message The message to forward
   * @param {module:akkaserverless.Metadata} [metadata] Optional metadata to pass with the forwarded message
   * @return {module:akkaserverless.replies.Reply} A forward reply.
   */
export function forward(method: protobuf.Method, message: any, metadata: Metadata): Reply {
    
    const forward = new Reply()
      .setMethod(method)
      .setMessage(message)
      .setMetadata(metadata);

    const reply = new Reply().setForward(forward);
    return reply;
  }

  /**
   * @param {String} description A description of the failure
   * @return {module:akkaserverless.replies.Reply} A failure reply.
   */
export function failure(description: string): Reply {
    const reply = new Reply().setFailure(description);
    return reply;
  }

  /**
   * Create a reply that contains neither a message nor a forward nor a failure.
   *
   * This may be useful for emitting effects without sending a message.
   *
   * @return {module:akkaserverless.replies.Reply} An empty reply
   */
export function noReply(): Reply {
    return new Reply();
  }
// }

// export const replies = new ReplyFactory();
