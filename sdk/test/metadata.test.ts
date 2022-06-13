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
import {
  Metadata,
  PredefinedPrincipal,
  LocalServicePrincipal,
} from '../src/metadata';

describe('Metadata', () => {
  it('should return empty array for missing keys', () => {
    // Arrange
    const meta = new Metadata();

    // Act
    const res = meta.get('something');

    // Assert
    expect(res.length).to.be.equal(0);
  });

  it('should return data that is set', () => {
    // Arrange
    const meta = new Metadata();
    meta.set('key1', 'hello');

    // Act
    const res = meta.get('key1');

    // Assert
    expect(res).to.have.ordered.members(['hello']);
  });

  it('should return multiple data that if set', () => {
    // Arrange
    const meta = new Metadata();
    meta.set('key1', 'hello1');
    meta.set('key1', 'hello2');

    // Act
    const res = meta.get('key1');

    // Assert
    expect(res).to.have.ordered.members(['hello1', 'hello2']);
  });

  it('should return empty array if all the data have been removed', () => {
    // Arrange
    const meta = new Metadata();
    meta.set('key1', 'hello1');
    meta.set('key1', 'hello2');
    meta.delete('key1');

    // Act
    const res = meta.get('key1');

    // Assert
    expect(res.length).to.be.equal(0);
  });

  it('should return data that have not been removed', () => {
    // Arrange
    const meta = new Metadata();
    meta.set('key1', 'hello1');
    meta.set('key2', 'hello2');
    meta.delete('key1');

    // Act
    const res = meta.get('key2');

    // Assert
    expect(res.length).to.be.equal(1);
    expect(res[0]).to.be.equal('hello2');
  });

  it('should clear the entire data', () => {
    // Arrange
    const meta = new Metadata();
    meta.set('key1', 'hello1');
    meta.set('key2', 'hello2');
    meta.clear();

    // Act
    const res = meta.get('key1').concat(meta.get('key2'));

    // Assert
    expect(res.length).to.be.equal(0);
  });

  it('allows access to Cloudevent subject', () => {
    // Arrange
    const meta = new Metadata();
    meta.set('ce-subject', 'hello1');

    // Act
    const res = meta.cloudevent.subject;

    // Assert
    expect(res).to.be.equal('hello1');
  });

  it('should make string entries accessible as a map', () => {
    const meta = new Metadata();
    meta.set('foo', 'string');
    meta.set('foo', Buffer.from('bytes'));
    expect(meta.asMap.foo).to.be.equal('string');
  });

  it('should make byte entries accessible as a map', () => {
    const meta = new Metadata();
    meta.set('foo', Buffer.from('bytes'));
    meta.set('foo', 'string');
    expect((meta.asMap.foo as Buffer).toString()).to.be.equal('bytes');
  });

  it('changes to the map should be reflected in the metadata', () => {
    const meta = new Metadata();
    meta.set('foo', 'string');
    meta.set('foo', Buffer.from('bytes'));
    meta.asMap.foo = 'new string';
    expect(meta.entries.length).to.be.equal(1);
    expect(meta.entries[0].stringValue).to.be.equal('new string');
  });

  it('allows deleting properties from the map', () => {
    const meta = new Metadata();
    meta.set('foo', 'string');
    meta.set('foo', Buffer.from('bytes'));
    delete meta.asMap.foo;
    expect(meta.entries.length).to.be.equal(0);
  });

  it('correctly handles Cloudevent times', () => {
    const now = new Date();
    const meta = new Metadata();
    meta.set('ce-time', now.toISOString());
    expect((meta.cloudevent.time as Date).getTime()).to.be.equal(now.getTime());
  });

  it('allows getting the JWT subject', () => {
    const meta = new Metadata();
    meta.set('_kalix-jwt-claim-sub', 'some-subject');
    expect(meta.jwtClaims.subject).to.be.equal('some-subject');
  });

  it('allows getting the JWT expiration time', () => {
    const meta = new Metadata();
    meta.set('_kalix-jwt-claim-exp', '12345');
    expect((meta.jwtClaims.expirationTime as Date).getTime()).to.be.equal(
      12345000,
    );
  });

  it('allows getting JWT object claims', () => {
    const meta = new Metadata();
    meta.set('_kalix-jwt-claim-foo', '{"a":"b"}');
    expect((meta.jwtClaims.getObject('foo') as any).a).to.be.equal('b');
  });

  it('allows getting JWT number claims', () => {
    const meta = new Metadata();
    meta.set('_kalix-jwt-claim-foo', '123');
    expect(meta.jwtClaims.getNumber('foo')).to.be.equal(123);
  });

  it('allows getting JWT string array claims', () => {
    const meta = new Metadata();
    meta.set('_kalix-jwt-claim-foo', '["foo","bar"]');
    expect(meta.jwtClaims.getStringArray('foo')).to.eql(['foo', 'bar']);
  });

  it('allows inspecting the Self principal', () => {
    const meta = new Metadata();
    meta.set('_kalix-src', 'self');
    expect(meta.principals().getLocalService()).to.be.undefined;
    expect(meta.principals().isInternet()).to.be.false;
    expect(meta.principals().isBackoffice()).to.be.false;
    expect(meta.principals().isLocalService('servicename')).to.be.false;
    expect(meta.principals().isAnyLocalService()).to.be.false;
    expect(meta.principals().isSelf()).to.be.true;
    expect(meta.principals().get()).to.be.deep.equal([
      PredefinedPrincipal.Self,
    ]);
  });

  it('allows inspecting other Kalix service principal', () => {
    const meta = new Metadata();
    meta.set('_kalix-src-svc', 'servicename');
    expect(meta.principals().getLocalService()).to.be.equal('servicename');
    expect(meta.principals().isInternet()).to.be.false;
    expect(meta.principals().isBackoffice()).to.be.false;
    expect(meta.principals().isLocalService('servicename')).to.be.true;
    expect(meta.principals().isLocalService('otherservicename')).to.be.false;
    expect(meta.principals().isAnyLocalService()).to.be.true;
    expect(meta.principals().isSelf()).to.be.false;
    expect(meta.principals().get()).to.be.deep.equal([
      new LocalServicePrincipal('servicename'),
    ]);
  });

  it('allows inspecting Internet principal', () => {
    const meta = new Metadata();
    meta.set('_kalix-src', 'internet');
    expect(meta.principals().getLocalService()).to.be.undefined;
    expect(meta.principals().isInternet()).to.be.true;
    expect(meta.principals().isBackoffice()).to.be.false;
    expect(meta.principals().isLocalService('servicename')).to.be.false;
    expect(meta.principals().isAnyLocalService()).to.be.false;
    expect(meta.principals().isSelf()).to.be.false;
    expect(meta.principals().get()).to.be.deep.equal([
      PredefinedPrincipal.Internet,
    ]);
  });

  it('allows inspecting backoffice principal', () => {
    const meta = new Metadata();
    meta.set('_kalix-src', 'backoffice');
    expect(meta.principals().getLocalService()).to.be.undefined;
    expect(meta.principals().isInternet()).to.be.false;
    expect(meta.principals().isBackoffice()).to.be.true;
    expect(meta.principals().isLocalService('servicename')).to.be.false;
    expect(meta.principals().isAnyLocalService()).to.be.false;
    expect(meta.principals().isSelf()).to.be.false;
    expect(meta.principals().get()).to.be.deep.equal([
      PredefinedPrincipal.Backoffice,
    ]);
  });
});
