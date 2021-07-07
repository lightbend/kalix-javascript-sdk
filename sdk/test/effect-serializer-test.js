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

const should = require('chai').should();
const EffectSerializer = require('../src/effect-serializer');

const protobuf = require('protobufjs');
const path = require('path');

const root = new protobuf.Root();
root.loadSync(path.join(__dirname, 'example.proto'));
const In = root.lookupType('com.example.In');
const exampleService = root.lookupService('com.example.ExampleService');
const exampleServiceTwo = root.lookupService('com.example.ExampleServiceTwo');
const exampleServiceGenerated = require('./proto/example_grpc_pb');

describe('Effect Serializer', () => {
  it('should throw error if the service is not registered', () => {
    // Arrange
    const es = new EffectSerializer();

    // Act
    const res = () =>
      es.serializeEffect(exampleService.methods.DoSomething, {}, {});

    // Assert
    should.throw(() => res(), Error);
  });

  it('should throw error if the method is not part of this service', () => {
    // Arrange
    const es = new EffectSerializer();

    // Act
    const res = () =>
      es.serializeEffect(exampleServiceTwo.methods.DoSomethingOne, {}, {});

    // Assert
    should.throw(() => res(), Error);
  });

  it('should serialize successfully', () => {
    // Arrange
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    // Act
    const res = es.serializeEffect(exampleService.methods.DoSomething, msg, {});

    // Assert
    res.serviceName.should.eq('com.example.ExampleService');
    res.commandName.should.eq('DoSomething');
    res.payload.type_url.should.eq('type.googleapis.com/com.example.In');
  });

  it('should serialize successfully', () => {
    // Arrange
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    // Act
    const res = es.serializeEffect(
      exampleService.methods.DoSomething.resolve(),
      msg,
      {},
    );

    // Assert
    res.serviceName.should.eq('com.example.ExampleService');
    res.commandName.should.eq('DoSomething');
    res.payload.type_url.should.eq('type.googleapis.com/com.example.In');
  });

  it('should serialize successfully unresolved methods', () => {
    // Arrange
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    // Act
    const res = es.serializeEffect(exampleService.methods.DoSomething, msg, {});

    // Assert
    res.serviceName.should.eq('com.example.ExampleService');
    res.commandName.should.eq('DoSomething');
    res.payload.type_url.should.eq('type.googleapis.com/com.example.In');
  });

  it('should serialize successfully using lookup', () => {
    // Arrange
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    // Act
    const res = es.serializeEffect(
      exampleService.lookup('DoSomething'),
      msg,
      {},
    );

    // Assert
    res.serviceName.should.eq('com.example.ExampleService');
    res.commandName.should.eq('DoSomething');
    res.payload.type_url.should.eq('type.googleapis.com/com.example.In');
  });

  it('should reject methods on the incorrect service using the generated gRPC definition', () => {
    // Arrange
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    // Act
    const res = () =>
      es.serializeEffect(
        exampleServiceGenerated.ExampleServiceTwoService.doSomethingOne,
        msg,
        {},
      );

    // Assert
    should.throw(() => res(), Error);
  });

  it('should serialize successfully methods using the generated gRPC definition', () => {
    // Arrange
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    // Act
    const res = es.serializeEffect(
      exampleServiceGenerated.ExampleServiceService.doSomething,
      msg,
      {},
    );

    // Assert
    res.serviceName.should.eq('com.example.ExampleService');
    res.commandName.should.eq('DoSomething');
    res.payload.type_url.should.eq('type.googleapis.com/com.example.In');
  });
});
