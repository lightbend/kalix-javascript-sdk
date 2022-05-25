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

import {
  Kalix,
  ComponentOptions,
  EntityOptions,
  Component,
} from '../src/kalix';
import discovery from '../proto/kalix/protocol/discovery_pb';
import { should } from 'chai';
should();

describe('Kalix', () => {
  it('should generate working links based on error codes', () => {
    const kalix = new Kalix({
      descriptorSetPath: 'test/user-function-test.desc',
    });

    const specificLink = kalix.docLinkFor('KLX-00112');
    const componentLink = kalix.docLinkFor('KLX-001');
    const unknownLink = kalix.docLinkFor('???');

    specificLink.should.equal(
      'https://docs.kalix.io/javascript/views.html#changing',
    );
    componentLink.should.equal('https://docs.kalix.io/javascript/views.html');
    unknownLink.should.equal('');
  });

  it('format correctly the source code for errors', () => {
    const kalix = new Kalix({
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
    kalix.addComponent(component as Component);

    const errorMsg = kalix.formatSource(location);

    const result = `At package.test.json:2:4:
  "name": "some-name",
  "version": "some-version"`;
    errorMsg.should.equal(result);
  });

  it('report correctly errors', () => {
    const kalix = new Kalix({
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
    kalix.addComponent(component as Component);

    const userError = new discovery.UserFunctionError();
    userError.setCode('KLX-00112');
    userError.setDetail('test details');
    userError.setMessage('test message');
    userError.setSourceLocationsList([location]);

    const errorMsg = kalix.reportErrorLogic(
      userError.getCode(),
      userError.getMessage(),
      userError.getDetail(),
      userError.getSourceLocationsList(),
    );

    const result = `Error reported from Kalix system: KLX-00112 test message

test details
See documentation: https://docs.kalix.io/javascript/views.html#changing

At package.test.json:2:4:
  "name": "some-name",
  "version": "some-version"`;
    errorMsg.should.equal(result);
  });

  it('discovery service should return correct service info', () => {
    const kalix = new Kalix({
      descriptorSetPath: 'test/user-function-test.desc',
      serviceName: 'my-service',
      serviceVersion: '1.2.3',
    });
    const proxyInfo = new discovery.ProxyInfo();

    const result = kalix.discoveryLogic(proxyInfo);
    const serviceInfo = result.getServiceInfo();

    result.getProto().should.equal('');
    result.getComponentsList().length.should.equal(0);
    serviceInfo?.getProtocolMajorVersion().should.equal(1);
    serviceInfo?.getProtocolMinorVersion().should.equal(0);
    serviceInfo?.getServiceName().should.equal('my-service');
    serviceInfo?.getServiceVersion().should.equal('1.2.3');
    serviceInfo?.getServiceRuntime().should.contains('node v');
    serviceInfo?.getSupportLibraryName().should.equal('@kalix-io/sdk');
    serviceInfo?.getSupportLibraryVersion().should.equal('0.0.0');
  });

  it('discovery service should return correct components', () => {
    const kalix = new Kalix({
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
        return 'kalix.component.valueentity.ValueEntities';
      },
    };
    const action = {
      serviceName: 'my-action',
      options: {
        includeDirs: ['./test'],
        forwardHeaders: ['x-my-header'],
      },
      componentType: () => {
        return 'kalix.component.action.Actions';
      },
    };

    kalix.addComponent(entity as Component);
    kalix.addComponent(action as Component);
    const result = kalix.discoveryLogic(proxyInfo);

    result.getComponentsList().length.should.equal(2);
    const entityResult = result.getComponentsList()[0];
    entityResult.getServiceName().should.equal('my-service');
    entityResult
      .getComponentType()
      .should.equal('kalix.component.valueentity.ValueEntities');
    entityResult.getEntity()?.should.not.be.undefined;
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
      .should.equal('kalix.component.action.Actions');
    entityResult.getComponent()?.should.not.be.undefined;
    entityResult
      .getComponent()
      ?.getForwardHeadersList()
      .should.have.same.members(['x-my-header']);
  });

  it('discovery service should return correct components with passivation', () => {
    const kalix = new Kalix({
      descriptorSetPath: 'test/user-function-test.desc',
    });
    const proxyInfo = new discovery.ProxyInfo();
    proxyInfo.setProtocolMajorVersion(1);
    const component = {
      serviceName: 'my-service',
      options: {
        includeDirs: ['./test'],
        entityType: 'my-entity-type-2',
        entityPassivationStrategy: { timeout: 10 },
      },
      componentType: () => {
        return 'kalix.component.valueentity.ValueEntities';
      },
    };

    kalix.addComponent(component as Component);
    const result = kalix.discoveryLogic(proxyInfo);

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
