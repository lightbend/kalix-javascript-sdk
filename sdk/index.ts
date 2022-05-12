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

export {
  Kalix,
  KalixOptions,
  Component,
  Entity,
  ComponentOptions,
  EntityOptions,
  EntityPassivationStrategy,
  ReplicatedWriteConsistency,
  ServiceBinding,
} from './src/kalix';

export { Action } from './src/action';

export { ValueEntity } from './src/value-entity';

export { EventSourcedEntity } from './src/event-sourced-entity';

import * as replicatedentity from './src/replicated-entity';
export { replicatedentity };

export { View } from './src/view';

export {
  CommandContext,
  EffectContext,
  EntityContext,
  Message,
  UserReply,
} from './src/command';

export { EffectMethod } from './src/effect';

export {
  Metadata,
  MetadataEntry,
  MetadataMap,
  MetadataValue,
} from './src/metadata';
export { Cloudevent } from './src/cloudevent';
export { JwtClaims } from './src/jwt-claims';

export { Serializable, TypedJson } from './src/serializable';

import * as replies from './src/reply';
export { replies };
export { Reply } from './src/reply';

export { GrpcStatus } from './src/grpc-status';
export {
  GrpcClient,
  GrpcClientCreator,
  GrpcClientLookup,
  GrpcUtil,
} from './src/grpc-util';

export { IntegrationTestkit } from './src/integration-testkit';

import * as settings from './settings';
export { settings };
