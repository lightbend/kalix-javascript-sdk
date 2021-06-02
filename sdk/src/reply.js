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

/**
 * A return type to allow returning forwards or failures, and attaching effects to messages.
 *
 * @class module:akkaserverless.replies.Reply
 * @memberOf module:akkaserverless.replies
 */
class Reply {

  /**
   * Attach the given effect(s) to this reply
   *
   * @param {protobuf.Method} method The entity service method to invoke.
   * @param {object} message The message to send to that service.
   * @param {boolean} [synchronous] Whether the effect should be execute synchronously or not, default is false.
   * @param {module:akkaserverless.Metadata} [metadata] Metadata to send with the effect.
   * @return {module:akkaserverless.replies.Reply} This reply after adding the effect.
   */
  addEffect(method, message, synchronous, metadata) {
    this.addEffects([new Effect(method, message, synchronous, metadata)])
    return this
  }

  /**
   * Attach the given effect(s) to this reply
   *
   * @param {Effect[]} effects One or more service calls to execute as side effects
   * @return {module:akkaserverless.replies.Reply} This reply after adding the effects.
   */
  addEffects(effects) {
    if (this.effects) this.effects.push(...effects)
    else this.effects = effects
    return this
  }

  /**
   * Whether this reply is empty: does not have a message, forward, or failure.
   *
   * @return {boolean} Whether the reply is empty.
   */
  isEmpty() {
    return !this.message && !this.forward && !this.failure
  }
}

/**
 * @class module:akkaserverless.replies.Effect
 * @memberOf module:akkaserverless.replies
 */
class Effect {

  /**
   * @param {protobuf.Method} method The entity service method to invoke.
   * @param {object} message The message to send to that service.
   * @param {boolean} [synchronous] Whether the effect should be execute synchronously or not, default is false
   * @param {module:akkaserverless.Metadata} [metadata] Metadata to send with the effect.
   */
  constructor(method, message, synchronous, metadata) {
    this.method = method
    this.message = message
    this.synchronous = typeof synchronous === "boolean" ? synchronous : false
    this.metadata = metadata
  }
}

/**
 * Factory for creating various types of replies from a component
 * @member module:akkaserverless.replies
 */
class ReplyFactory {
  /**
   * Create a message reply.
   *
   * @param {object} message the message to reply with
   * @param {module:akkaserverless.Metadata} [metadata] Optional metadata to pass with the reply
   * @return {module:akkaserverless.replies.Reply} A message reply
   */
  message(message, metadata) {
    const reply = new Reply()
    reply.message = message
    reply.metadata = metadata
    return reply
  }

  /**
   * @param {protobuf.Method} method The service call representing the forward.
   * @param {object} message The message to forward
   * @param {module:akkaserverless.Metadata} [metadata] Optional metadata to pass with the forwarded message
   * @return {module:akkaserverless.replies.Reply} A forward reply.
   */
  forward(method, message, metadata) {
    const reply = new Reply()
    reply.forward = {
      method: method,
      message: message,
      metadata: metadata
    }
    return reply
  }

  /**
   * @param description {String} A description of the failure
   * @return {module:akkaserverless.replies.Reply} A failure reply.
   */
  failure(description) {
    const reply = new Reply()
    reply.failure = description
    return reply
  }

  /**
   * Create a reply that contains neither a message nor a forward nor a failure.
   *
   * This may be useful for emitting effects without sending a message.
   *
   * @return {module:akkaserverless.replies.Reply} An empty reply
   */
  noReply() {
    return new Reply()
  }

}

/**
 * @type {module:akkaserverless.ReplyFactory}
 */
const replies = new ReplyFactory()
replies.Reply = Reply
replies.Effect = Effect
module.exports = replies