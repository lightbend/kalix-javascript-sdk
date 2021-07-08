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

import { AkkaServerless } from '../src/akkaserverless';
import discovery from '../proto/akkaserverless/protocol/discovery_pb';
import { expect } from 'chai';

describe('Akkaserverless', () => {
  it('should generate working links based on error codes', () => {
    // Arrange
    const akkasls = new AkkaServerless({
      descriptorSetPath: 'test/user-function-test.desc',
    });

    // Act
    const specificLink = akkasls.docLinkFor('AS-00112');
    const componentLink = akkasls.docLinkFor('AS-001');
    const unknownLink = akkasls.docLinkFor('???');

    // Assert
    specificLink.should.equal(
      'https://developer.lightbend.com/docs/akka-serverless/javascript/views.html#changing',
    );
    componentLink.should.equal(
      'https://developer.lightbend.com/docs/akka-serverless/javascript/views.html',
    );
    unknownLink.should.equal('');
  });

  it('format correctly the source code for errors', () => {
    // Arrange
    const akkasls = new AkkaServerless({
      descriptorSetPath: 'test/user-function-test.desc',
    });
    const location = new discovery.UserFunctionError.SourceLocation();
    location.setFileName('package.test.json');
    location.setStartLine(1);
    location.setStartCol(3);
    location.setEndLine(2);
    location.setEndCol(5);
    location.setProtoPathList([]);
    const component = {
      serviceName: 'my-service',
      options: {
        includeDirs: ['./test'],
        entityType: 'my-entity-type',
      },
      componentType: () => {
        return 'my-type';
      },
    };
    akkasls.addComponent(component);

    // Act
    const errorMsg = akkasls.formatSource(location);

    // Assert
    const result = `At package.test.json:2:4:
  "name": "some-name",
  "version": "some-version"`;
    errorMsg.should.equal(result);
  });

  it('report correctly errors', () => {
    // Arrange
    const akkasls = new AkkaServerless({
      descriptorSetPath: 'test/user-function-test.desc',
    });
    const location = new discovery.UserFunctionError.SourceLocation();
    location.setFileName('package.test.json');
    location.setStartLine(1);
    location.setStartCol(3);
    location.setEndLine(2);
    location.setEndCol(5);
    location.setProtoPathList([]);
    const component = {
      serviceName: 'my-service',
      options: {
        includeDirs: ['./test'],
        entityType: 'my-entity-type',
      },
      componentType: () => {
        return 'my-type';
      },
    };
    akkasls.addComponent(component);

    const userError = new discovery.UserFunctionError();
    userError.setCode('AS-00112');
    userError.setDetail('test details');
    userError.setMessage('test message');
    userError.setSourceLocationsList([location]);

    // Act
    const errorMsg = akkasls.reportErrorLogic(
      userError.getCode(),
      userError.getMessage(),
      userError.getDetail(),
      userError.getSourceLocationsList(),
    );

    // Assert
    const result = `Error reported from Akka system: AS-00112 test message

test details See documentation: https://developer.lightbend.com/docs/akka-serverless/javascript/views.html#changing

At package.test.json:2:4:
  "name": "some-name",
  "version": "some-version"`;
    errorMsg.should.equal(result);
  });

  it('discovery service should return correct service info', () => {
    // Arrange
    const akkasls = new AkkaServerless({
      descriptorSetPath: 'test/user-function-test.desc',
      serviceName: 'my-service',
      serviceVersion: '1.2.3',
    });
    const proxyInfo = new discovery.ProxyInfo();

    // Act
    const result = akkasls.discoveryLogic(proxyInfo);
    const serviceInfo = result.getServiceInfo();

    // Assert
    result.getProto().should.equal('');
    result.getComponentsList().length.should.equal(0);
    serviceInfo?.getProtocolMajorVersion().should.equal(0);
    serviceInfo?.getProtocolMinorVersion().should.equal(7);
    serviceInfo?.getServiceName().should.equal('my-service');
    serviceInfo?.getServiceVersion().should.equal('1.2.3');
    serviceInfo?.getServiceRuntime().should.contains('node v');
    serviceInfo
      ?.getSupportLibraryName()
      .should.equal('@lightbend/akkaserverless-javascript-sdk');
    serviceInfo?.getSupportLibraryVersion().should.equal('0.0.0');
  });

  it('discovery service should return correct components', () => {
    // Arrange
    const akkasls = new AkkaServerless({
      descriptorSetPath: 'test/user-function-test.desc',
    });
    const proxyInfo = new discovery.ProxyInfo();
    proxyInfo.setProtocolMajorVersion(1);
    const entity = {
      serviceName: 'my-service',
      options: {
        includeDirs: ['./test'],
        entityType: 'my-entity-type',
        forwardHeaders: ['x-my-header'],
      },
      componentType: () => {
        return 'akkaserverless.component.valueentity.ValueEntities';
      },
    };
    const action = {
      serviceName: 'my-action',
      options: {
        includeDirs: ['./test'],
        forwardHeaders: ['x-my-header'],
      },
      componentType: () => {
        return 'akkaserverless.component.action.Actions';
      },
    };

    // Act
    akkasls.addComponent(entity);
    akkasls.addComponent(action);
    const result = akkasls.discoveryLogic(proxyInfo);

    // Assert
    result.getComponentsList().length.should.equal(2);
    const entityResult = result.getComponentsList()[0];
    entityResult.getServiceName().should.equal('my-service');
    entityResult
      .getComponentType()
      .should.equal('akkaserverless.component.valueentity.ValueEntities');
    entityResult.getEntity()?.getEntityType().should.equal('my-entity-type');
    entityResult.getEntity()?.getPassivationStrategy()?.should.be.undefined;
    entityResult
      .getEntity()
      ?.getForwardHeadersList()
      .should.have.same.members(['x-my-header']);
    const actionResult = result.getComponentsList()[1];
    actionResult.getServiceName().should.equal('my-action');
    actionResult
      .getComponentType()
      .should.equal('akkaserverless.component.action.Actions');
    actionResult.getEntity();
  });

  it('discovery service should return correct components with passivation', () => {
    // Arrange
    const akkasls = new AkkaServerless({
      descriptorSetPath: 'test/user-function-test.desc',
    });
    const proxyInfo = new discovery.ProxyInfo();
    proxyInfo.setProtocolMajorVersion(1);
    const component = {
      serviceName: 'my-service',
      options: {
        includeDirs: ['./test'],
        entityType: 'my-entity-type',
        entityPassivationStrategy: { timeout: 10 },
      },
      componentType: () => {
        return 'my-type';
      },
    };

    // Act
    akkasls.addComponent(component);
    const result = akkasls.discoveryLogic(proxyInfo);

    // Assert
    result.getComponentsList().length.should.equal(1);
    const comp = result.getComponentsList()[0];
    comp
      .getEntity()
      ?.getPassivationStrategy()
      ?.getTimeout()
      ?.getTimeout()
      .should.equal(10);
  });
});
