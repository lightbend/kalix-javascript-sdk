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

import { should as chaiShould } from 'chai';
import EffectSerializer from '../src/effect-serializer';
import { Any } from '../src/protobuf-any';
import * as protobuf from 'protobufjs';
import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ProtoGrpcType as Descriptor } from './generated/proto/example';

const should = chaiShould();

// protobufjs services
const root = new protobuf.Root();
root.loadSync(path.join(__dirname, 'example.proto'));
const In = root.lookupType('com.example.In');
const exampleService = root.lookupService('com.example.ExampleService');
const exampleServiceTwo = root.lookupService('com.example.ExampleServiceTwo');

// grpc services
const packageDefinition = protoLoader.loadSync('example.proto', {
  includeDirs: [__dirname, path.join(__dirname, '..', 'proto')],
  defaults: true,
});
const descriptor = grpc.loadPackageDefinition(
  packageDefinition,
) as unknown as Descriptor;
const grpcExampleService = descriptor.com.example.ExampleService.service;
const grpcExampleServiceTwo = descriptor.com.example.ExampleServiceTwo.service;

describe('Effect Serializer', () => {
  it('should throw error if the service is not registered', () => {
    const es = new EffectSerializer({});

    const res = () =>
      es.serializeEffect(exampleService.methods.DoSomething, {});

    should.throw(() => res(), Error);
  });

  it('should throw error if the method is not part of this service', () => {
    const es = new EffectSerializer({});

    const res = () =>
      es.serializeEffect(exampleServiceTwo.methods.DoSomethingOne, {});

    should.throw(() => res(), Error);
  });

  it('should serialize successfully', () => {
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    const res = es.serializeEffect(exampleService.methods.DoSomething, msg);

    res.serviceName?.should.eq('com.example.ExampleService');
    res.commandName?.should.eq('DoSomething');
    Any.flip(res.payload).type_url.should.eq(
      'type.googleapis.com/com.example.In',
    );
  });

  it('should serialize successfully', () => {
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    exampleService.methods.DoSomething.resolve();
    const res = es.serializeEffect(exampleService.methods.DoSomething, msg);

    res.serviceName?.should.eq('com.example.ExampleService');
    res.commandName?.should.eq('DoSomething');
    Any.flip(res.payload).type_url.should.eq(
      'type.googleapis.com/com.example.In',
    );
  });

  it('should serialize successfully unresolved methods', () => {
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    const res = es.serializeEffect(exampleService.methods.DoSomething, msg);

    res.serviceName?.should.eq('com.example.ExampleService');
    res.commandName?.should.eq('DoSomething');
    Any.flip(res.payload).type_url.should.eq(
      'type.googleapis.com/com.example.In',
    );
  });

  it('should serialize successfully using lookup', () => {
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    const res = es.serializeEffect(exampleService.lookup('DoSomething'), msg);

    res.serviceName?.should.eq('com.example.ExampleService');
    res.commandName?.should.eq('DoSomething');
    Any.flip(res.payload).type_url.should.eq(
      'type.googleapis.com/com.example.In',
    );
  });

  it('should reject methods on the incorrect service using a gRPC method definition', () => {
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    const res = () =>
      es.serializeEffect(grpcExampleServiceTwo.DoSomethingOne, msg);

    should.throw(() => res(), Error);
  });

  it('should serialize successfully methods using a gRPC method definition', () => {
    const es = new EffectSerializer({
      'com.example.ExampleService': exampleService,
    });
    const msg = In.create({ field: 'foo' });

    const res = es.serializeEffect(grpcExampleService.DoSomething, msg);

    res.serviceName?.should.eq('com.example.ExampleService');
    res.commandName?.should.eq('DoSomething');
    Any.flip(res.payload).type_url.should.eq(
      'type.googleapis.com/com.example.In',
    );
  });
});
