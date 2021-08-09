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

import { AkkaServerless } from './src/akkaserverless';
import * as replies from './src/reply';
import { Metadata } from './src/metadata';
import { ReplicatedEntityServices } from './src/replicated-entity-support';
import { ReplicatedWriteConsistency } from './src/akkaserverless';
import { IntegrationTestkit } from './src/integration-testkit';
import * as settings from './settings';

export {
  AkkaServerless,
  IntegrationTestkit,
  Metadata,
  ReplicatedEntityServices,
  ReplicatedWriteConsistency,
  replies,
  settings,
};
