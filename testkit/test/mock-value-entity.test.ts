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

import { MockValueEntity } from '../src';
import { expect } from 'chai';
import valueEntity from '../example/src/value-entity';

const ExampleState = valueEntity.lookupType('com.example.ExampleState');

describe('MockValueEntity', () => {
  it('should update state', () => {
    const entity = new MockValueEntity(valueEntity, 'entity-id');

    expect(entity.error).to.be.undefined;
    expect(entity.state).to.deep.equal(ExampleState.create({}));

    const response = entity.handleCommand('DoSomethingOne', {
      field: 'foo',
    });

    expect(response).to.deep.equal({ field: 'ValueEntity received: foo' });
    expect(entity.error).to.be.undefined;
    expect(entity.state).to.deep.equal(
      ExampleState.create({ field1: 'foo', field2: '' }),
    );
  });

  it('should record error message', () => {
    const entity = new MockValueEntity(valueEntity, 'entity-id');

    const response = entity.handleCommand('Fail', {});

    expect(response).to.be.undefined;
    expect(entity.error).to.equal('some-error');
    expect(entity.state).to.deep.equal(ExampleState.create({}));
  });
});
