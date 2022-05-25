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

import {
  CommandContext,
  EffectMethod,
  Message,
  Metadata,
} from '@kalix-io/kalix-javascript-sdk';

/** @public */
export namespace MockCommandContext {
  export interface Effect {
    method: EffectMethod;
    message: object;
    synchronous?: boolean;
    metadata?: Metadata;
  }

  export type ForwardHandler = (
    method: EffectMethod,
    message: Message,
    metadata: Metadata,
  ) => void;
}

/**
 * Generic mock CommandContext for any Kalix entity.
 *
 * @public
 */
export class MockCommandContext implements CommandContext {
  metadata: Metadata = new Metadata();

  effects: Array<MockCommandContext.Effect> = [];

  forward: MockCommandContext.ForwardHandler = () => {};

  thenForward: MockCommandContext.ForwardHandler = (
    method,
    message,
    metadata,
  ) => this.forward(method, message, metadata);

  error?: string;

  /**
   * Set the `forward` callback for this context.
   * This allows tests handling both failure and success cases for forwarded commands.
   * @param handler - the forward callback to set
   */
  onForward(handler: MockCommandContext.ForwardHandler): void {
    this.forward = handler;
  }

  fail(error: string): void {
    this.error = error;
  }

  effect(
    method: EffectMethod,
    message: object,
    synchronous?: boolean,
    metadata?: Metadata,
  ): void {
    this.effects.push({
      method,
      message,
      synchronous,
      metadata,
    });
  }
}
