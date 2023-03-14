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

import { GrpcStatus, Reply, ValueEntity } from '@kalix-io/kalix-javascript-sdk';
import { ExampleValueEntityService } from '../types/value-entity';

const entity: ExampleValueEntityService = new ValueEntity(
  'example.proto',
  'com.example.ExampleValueEntityService',
  'example-value-entity',
  {
    includeDirs: ['example/proto'],
  },
);

const ExampleState = entity.lookupType('com.example.ExampleState');

entity.setInitial(() => ExampleState.create({}));

entity.commandHandlers = {
  DoSomethingOne: (input, state, ctx) => {
    state.field1 = input.field;
    ctx.updateState(state);
    return Reply.message({ field: `ValueEntity received: ${input.field}` });
  },
  DoSomethingTwo: (input, state, ctx) => {
    state.field2 = input.field;
    ctx.updateState(state);
    return new Promise((resolve) => {
      setTimeout(
        () => resolve({ field: `ValueEntity async received: ${input.field}` }),
        1000,
      );
    });
  },
  Fail: () => Reply.failure('some-error', GrpcStatus.AlreadyExists),
};

export default entity;
