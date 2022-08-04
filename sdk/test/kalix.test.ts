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

import { Kalix, Component, ComponentServices, ServiceMap } from '../src/kalix';
import * as discovery from '../types/protocol/discovery';
import * as fs from 'fs';
import { PreStartSettings } from '../src/kalix';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
chai.should();

const proxyInfo: discovery.ProxyInfo = {
  protocolMajorVersion: 1,
  protocolMinorVersion: 0,
  proxyName: 'kalix-proxy-test',
  proxyVersion: '1.0.0',
  supportedEntityTypes: [],
  devMode: false,
  proxyHostname: 'localhost',
  identificationInfo: null, // FIXME,
  internalProxyHostname: 'localhost',
  proxyPort: 9000,
};

describe('Kalix', () => {
  it('should generate working links based on error codes', () => {
    const kalix = new Kalix({
      descriptorSetPath: 'test/generated/user-function.desc',
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
      descriptorSetPath: 'test/generated/user-function.desc',
    });
    const location: discovery.SourceLocation = {
      fileName: 'package.test.json',
      startLine: 1,
      startCol: 3,
      endLine: 2,
      endCol: 5,
      protoPath: [],
    };
    const component: unknown = {
      serviceName: 'my-service',
      options: {
        includeDirs: ['./test'],
        entityType: 'my-entity-type',
      },
      componentType: () => {
        return 'my-type';
      },
      preStart(settings: PreStartSettings): void {},
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
      descriptorSetPath: 'test/generated/user-function.desc',
    });
    const location: discovery.SourceLocation = {
      fileName: 'package.test.json',
      startLine: 1,
      startCol: 3,
      endLine: 2,
      endCol: 5,
      protoPath: [],
    };
    const component: unknown = {
      serviceName: 'my-service',
      options: {
        includeDirs: ['./test'],
        entityType: 'my-entity-type',
      },
      componentType: () => {
        return 'my-type';
      },
      preStart(settings: PreStartSettings): void {},
    };
    kalix.addComponent(component as Component);

    const userError: discovery.UserFunctionError = {
      code: 'KLX-00112',
      detail: 'test details',
      message: 'test message',
      sourceLocations: [location],
      severity: discovery.Severity.ERROR,
    };

    const errorMsg = kalix.reportErrorLogic(
      userError.code,
      userError.message,
      userError.detail,
      userError.sourceLocations,
      userError.severity,
    );

    const result = `Error reported from Kalix system: KLX-00112 test message

test details
See documentation: https://docs.kalix.io/javascript/views.html#changing

At package.test.json:2:4:
  "name": "some-name",
  "version": "some-version"`;
    errorMsg.should.equal(result);
  });

  it('report user function errors with error severity with console.error', () => {
    sinon.stub(console, 'info');
    sinon.stub(console, 'warn');
    sinon.stub(console, 'error');

    const kalix = new Kalix({
      descriptorSetPath: 'test/generated/user-function.desc',
    });

    kalix.reportError({
      code: 'KLX-00001',
      detail: '',
      message: 'Some error message',
      sourceLocations: [],
      severity: discovery.Severity.ERROR,
    });

    console.error.should.have.been.calledOnceWith(
      'Error reported from Kalix system: KLX-00001 Some error message',
    );

    console.info.should.not.have.been.called;
    console.warn.should.not.have.been.called;

    sinon.restore();
  });

  it('report user function errors with warning severity with console.warn', () => {
    sinon.stub(console, 'info');
    sinon.stub(console, 'warn');
    sinon.stub(console, 'error');

    const kalix = new Kalix({
      descriptorSetPath: 'test/generated/user-function.desc',
    });

    kalix.reportError({
      code: 'KLX-00002',
      detail: '',
      message: 'Some warning message',
      sourceLocations: [],
      severity: discovery.Severity.WARNING,
    });

    console.warn.should.have.been.calledOnceWith(
      'Warning reported from Kalix system: KLX-00002 Some warning message',
    );

    console.info.should.not.have.been.called;
    console.error.should.not.have.been.called;

    sinon.restore();
  });

  it('report user function errors with info severity with console.info', () => {
    sinon.stub(console, 'info');
    sinon.stub(console, 'warn');
    sinon.stub(console, 'error');

    const kalix = new Kalix({
      descriptorSetPath: 'test/generated/user-function.desc',
    });

    kalix.reportError({
      code: 'KLX-00003',
      detail: '',
      message: 'Some info message',
      sourceLocations: [],
      severity: discovery.Severity.INFO,
    });

    console.info.should.have.been.calledOnceWith(
      'Message reported from Kalix system: KLX-00003 Some info message',
    );

    console.warn.should.not.have.been.called;
    console.error.should.not.have.been.called;

    sinon.restore();
  });

  it('discovery service should return correct service info', () => {
    const kalix = new Kalix({
      descriptorSetPath: 'test/generated/user-function.desc',
      serviceName: 'my-service',
      serviceVersion: '1.2.3',
    });

    const result = kalix.discoveryLogic(proxyInfo);
    const serviceInfo = result.serviceInfo;

    const expectedProto = fs.readFileSync('test/generated/user-function.desc');

    result.proto?.should.deep.equal(expectedProto);
    result.components?.length.should.equal(0);
    serviceInfo?.protocolMajorVersion?.should.equal(1);
    serviceInfo?.protocolMinorVersion?.should.equal(0);
    serviceInfo?.serviceName?.should.equal('my-service');
    serviceInfo?.serviceVersion?.should.equal('1.2.3');
    serviceInfo?.serviceRuntime?.should.contains('node v');
    serviceInfo?.supportLibraryName?.should.equal(
      '@kalix-io/kalix-javascript-sdk',
    );
    serviceInfo?.supportLibraryVersion?.should.equal('0.0.0');
  });

  it('discovery service should return correct components', () => {
    const kalix = new Kalix({
      descriptorSetPath: 'test/generated/user-function.desc',
    });
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
      preStart(settings: PreStartSettings): void {},
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
      preStart(settings: PreStartSettings): void {},
    };

    kalix.addComponent(entity as Component);
    kalix.addComponent(action as Component);
    const result = kalix.discoveryLogic(proxyInfo);

    result.components?.length.should.equal(2);
    const entityResult = (result.components ?? [])[0];
    entityResult.serviceName?.should.equal('my-service');
    entityResult.componentType?.should.equal(
      'kalix.component.valueentity.ValueEntities',
    );
    entityResult.entity?.should.not.be.undefined;
    entityResult.entity?.entityType?.should.equal('my-entity-type');
    entityResult.entity?.passivationStrategy?.should.be.undefined;
    entityResult.entity?.forwardHeaders?.should.have.same.members([
      'x-my-header',
    ]);
    const actionResult = (result.components ?? [])[1];
    actionResult.serviceName?.should.equal('my-action');
    actionResult.componentType?.should.equal('kalix.component.action.Actions');
    entityResult.component?.should.not.be.undefined;
    entityResult.component?.forwardHeaders?.should.have.same.members([
      'x-my-header',
    ]);
  });

  it('discovery service should return correct components with passivation', () => {
    const kalix = new Kalix({
      descriptorSetPath: 'test/generated/user-function.desc',
    });
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
      preStart(settings: PreStartSettings): void {},
    };

    kalix.addComponent(component as Component);
    const result = kalix.discoveryLogic(proxyInfo);

    result.components?.length.should.equal(1);
    const comp = (result.components ?? [])[0];
    comp.entity?.passivationStrategy?.timeout?.timeout?.should.equal(10);
  });

  it('discovered components should get preStarted', () => {
    const kalix = new Kalix({
      descriptorSetPath: 'test/generated/user-function.desc',
    });
    let seenSettings: PreStartSettings | undefined = undefined;
    const action: unknown = {
      serviceName: 'my-action',
      options: {
        includeDirs: ['./test'],
        forwardHeaders: ['x-my-header'],
      },
      componentType: () => {
        return 'kalix.component.action.Actions';
      },
      preStart(settings: PreStartSettings): void {
        seenSettings = settings;
      },
    };
    kalix.addComponent(action as Component);
    const result = kalix.discoveryLogic(proxyInfo);

    seenSettings!.proxyHostname!.should.equal('localhost');
  });
});
