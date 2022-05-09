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

import { expect } from 'chai';
import * as protobuf from 'protobufjs';
import { Metadata } from '../src/metadata';
import * as replies from '../src/reply';
import { GrpcStatus } from '../src/grpc-status';

describe('Replies', () => {
  it('should create an empty Reply', () => {
    const reply = replies.emptyReply();

    expect(reply.isEmpty()).to.be.true;
    expect(reply.getMethod()).to.be.undefined;
    expect(reply.getMessage()).to.be.undefined;
    expect(reply.getMetadata()).to.be.undefined;
    expect(reply.getForward()).to.be.undefined;
    expect(reply.getFailure()).to.be.undefined;
    expect(reply.getEffects()).to.be.empty;
  });

  it('should create a failure Reply', () => {
    const reply = replies.failure('my-msg');

    expect(reply.isEmpty()).to.be.false;
    expect(reply.getMethod()).to.be.undefined;
    expect(reply.getMessage()).to.be.undefined;
    expect(reply.getMetadata()).to.be.undefined;
    expect(reply.getForward()).to.be.undefined;
    expect(reply.getEffects()).to.be.empty;

    expect(reply.getFailure()).to.not.be.undefined;
    expect(reply.getFailure()?.getDescription()).to.be.eq('my-msg');
    expect(reply.getFailure()?.getStatus()).to.be.undefined;
  });

  it('should create a failure Reply with status', () => {
    const reply = replies.failure('my-msg', GrpcStatus.AlreadyExists);

    expect(reply.isEmpty()).to.be.false;
    expect(reply.getMethod()).to.be.undefined;
    expect(reply.getMessage()).to.be.undefined;
    expect(reply.getMetadata()).to.be.undefined;
    expect(reply.getForward()).to.be.undefined;
    expect(reply.getEffects()).to.be.empty;

    expect(reply.getFailure()).to.not.be.undefined;
    expect(reply.getFailure()?.getDescription()).to.be.eq('my-msg');
    expect(reply.getFailure()?.getStatus()).to.be.eq(GrpcStatus.AlreadyExists);
  });

  it('should create a forward Reply', () => {
    // Arrange
    const reply = replies.forward(
      new protobuf.Method('my-method', 'rpc', 'my-request', 'my-response'),
      'my-msg',
      new Metadata(),
    );

    // Act
    const forward = reply.getForward();

    // Assert
    expect(reply.isEmpty()).to.be.false;
    expect(reply.getMethod()).to.be.undefined;
    expect(reply.getMessage()).to.be.undefined;
    expect(reply.getMetadata()).to.be.undefined;
    expect(reply.getFailure()).to.be.undefined;
    expect(reply.getEffects()).to.be.empty;
    expect(forward?.getMethod()?.name).to.be.eq('my-method');
    expect(forward?.getMessage()).to.be.eq('my-msg');
  });

  it('should create a message Reply', () => {
    const reply = replies.message('my-msg', new Metadata());

    expect(reply.isEmpty()).to.be.false;
    expect(reply.getMethod()).to.be.undefined;
    expect(reply.getMessage()).to.be.eq('my-msg');
    expect(reply.getMetadata()?.entries).to.be.empty;
    expect(reply.getFailure()).to.be.undefined;
    expect(reply.getEffects()).to.be.empty;
    expect(reply.getForward()).to.be.undefined;
  });

  it('should add synchronous effects to a message', () => {
    // Arrange
    const reply = replies.message('my-msg', new Metadata());

    // Act
    reply.addEffect(
      new protobuf.Method('my-method', 'rpc', 'my-request', 'my-response'),
      'my-msg',
      true,
      new Metadata(),
    );
    const effect = reply.getEffects()[0];

    // Assert
    expect(effect.method.name).to.be.eq('my-method');
    expect(effect.message).to.be.eq('my-msg');
    expect(effect.synchronous).to.be.true;
  });

  it('should add not synchronous effects to a message', () => {
    // Arrange
    const reply = replies.message('my-msg', new Metadata());

    // Act
    reply.addEffect(
      new protobuf.Method('my-method', 'rpc', 'my-request', 'my-response'),
      'my-msg',
      false,
      new Metadata(),
    );
    const effect = reply.getEffects()[0];

    // Assert
    expect(effect.method.name).to.be.eq('my-method');
    expect(effect.message).to.be.eq('my-msg');
    expect(effect.synchronous).to.be.false;
  });
});
