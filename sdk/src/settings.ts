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
 * Kalix framework version.
 *
 * @public
 */
export const frameworkVersion: string =
  require('../config.json').frameworkVersion;

/**
 * Kalix protocol version.
 *
 * @public
 */
export interface ProtocolVersion {
  major: string;
  minor: string;
}

/**
 * Kalix protocol version.
 *
 * @public
 */
export const protocolVersion = function (): ProtocolVersion {
  const versions = frameworkVersion.split(/[.-]/);
  return { major: versions[0], minor: versions[1] };
};

/**
 * Kalix protocol base version.
 *
 * @public
 */
export const baseVersion = function (): string {
  const version = protocolVersion();
  return `${version.major}.${version.minor}`;
};
