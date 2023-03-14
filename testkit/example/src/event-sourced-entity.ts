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

import {
  EventSourcedEntity,
  GrpcStatus,
  Reply,
} from '@kalix-io/kalix-javascript-sdk';
import { ExampleEventSourcedEntityService } from '../types/event-sourced-entity';

const entity: ExampleEventSourcedEntityService = new EventSourcedEntity(
  'example.proto',
  'com.example.ExampleEventSourcedEntityService',
  'example-event-sourced-entity',
  {
    includeDirs: ['example/proto'],
  },
);

const ExampleState = entity.lookupType('com.example.ExampleState');
const ExampleEventOne = entity.lookupType('com.example.ExampleEventOne');
const ExampleEventTwo = entity.lookupType('com.example.ExampleEventTwo');

entity.setInitial(() => ExampleState.create({}));

entity.setBehavior(() => {
  return {
    commandHandlers: {
      DoSomethingOne: (input, _state, ctx) => {
        ctx.emit(ExampleEventOne.create({ field: input.field }));
        return Reply.message({
          field: 'EventSourcedEntity received: ' + input.field,
        });
      },
      DoSomethingTwo: (input, _state, ctx) => {
        ctx.emit(ExampleEventTwo.create({ field: input.field }));
        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                field: 'EventSourcedEntity async received: ' + input.field,
              }),
            1000,
          );
        });
      },
      Fail: () => Reply.failure('some-error', GrpcStatus.AlreadyExists),
    },
    eventHandlers: {
      ExampleEventOne(event, state) {
        state.field1 = event.field;
        return state;
      },
      ExampleEventTwo(event, state) {
        state.field2 = event.field;
        return state;
      },
    },
  };
});

export default entity;
