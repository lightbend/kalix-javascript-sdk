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

import { MockEventSourcedEntity } from '../src';
import { expect } from 'chai';
import eventSourcedEntity from '../example/src/event-sourced-entity';

const ExampleState = eventSourcedEntity.lookupType('com.example.ExampleState');
const ExampleEventOne = eventSourcedEntity.lookupType(
  'com.example.ExampleEventOne',
);
const ExampleEventTwo = eventSourcedEntity.lookupType(
  'com.example.ExampleEventTwo',
);

describe('MockEventSourcedEntity', () => {
  it('should update state', async () => {
    const entity = new MockEventSourcedEntity(eventSourcedEntity, 'entity-id');

    expect(entity.error).to.be.undefined;
    expect(entity.state).to.deep.equal(ExampleState.create({}));

    entity.handleEvent(ExampleEventOne.create({ field: 'foo' }));
    expect(entity.state).to.deep.equal(ExampleState.create({ field1: 'foo' }));

    entity.handleEvent(ExampleEventTwo.create({ field: 'bar' }));
    expect(entity.state).to.deep.equal(
      ExampleState.create({ field1: 'foo', field2: 'bar' }),
    );

    const responseOne = await entity.handleCommand('DoSomethingOne', {
      field: 'baz',
    });

    expect(responseOne).to.deep.equal({
      field: 'EventSourcedEntity received: baz',
    });
    expect(entity.error).to.be.undefined;
    expect(entity.state).to.deep.equal(
      ExampleState.create({ field1: 'baz', field2: 'bar' }),
    );

    const responseTwo = await entity.handleCommand('DoSomethingTwo', {
      field: 'qux',
    });

    expect(responseTwo).to.deep.equal({
      field: 'EventSourcedEntity async received: qux',
    });
    expect(entity.error).to.be.undefined;
    expect(entity.state).to.deep.equal(
      ExampleState.create({ field1: 'baz', field2: 'qux' }),
    );
  });

  it('should record error message', async () => {
    const entity = new MockEventSourcedEntity(eventSourcedEntity, 'entity-id');

    const response = await entity.handleCommand('Fail', {});

    expect(response).to.be.undefined;
    expect(entity.error).to.equal('some-error');
    expect(entity.state).to.deep.equal(ExampleState.create({}));
  });
});
