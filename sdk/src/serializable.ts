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

/**
 * Any type that has a `type` property on it can be serialized as JSON, with the value of the type
 * property describing the type of the value.
 *
 * @public
 */
export interface TypedJson {
  /**
   * The type of the object.
   */
  type: string;
}

/**
 * A type that is serializable.
 *
 * @public
 */
export type Serializable =
  | protobuf.Message
  | TypedJson
  | object
  | string
  | number
  | boolean
  | Long
  | Buffer;
