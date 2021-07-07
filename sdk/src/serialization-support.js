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

import * as protobufHelper from './protobuf-helper';
import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import AnySupport from './protobuf-any';
import EffectSerializer from './effect-serializer';

export class ProtobufjsSerializationSupport {
  constructor(desc, serviceName, includeDirs) {
    this.desc = desc;
    this.serviceName = serviceName;
    if (includeDirs) {
      this.includeDirs = includeDirs;
    } else {
      this.includeDirs = ['.'];
    }
  }

  setComponents(allComponents) {
    this.allComponents = allComponents;
  }

  getAnySupport() {
    if (!this.root) {
      this.validate();
    }
    return new AnySupport(this.root);
  }

  getEffectSerializer() {
    if (!this.allComponents) {
      throw new Error('Please run `setComponents` first');
    } else {
      return new EffectSerializer(this.allComponents);
    }
  }

  getGrpc() {
    if (!this.grpc) {
      this.validate();
    }
    return this.grpc;
  }

  getService() {
    if (!this.service) {
      this.validate();
    }
    return this.service;
  }

  validate() {
    const allIncludeDirs = protobufHelper.moduleIncludeDirs.concat(
      this.includeDirs,
    );

    this.root = protobufHelper.loadSync(this.desc, allIncludeDirs);

    // Eagerly lookup the service to fail early
    this.service = this.root.lookupService(this.serviceName);

    const packageDefinition = protoLoader.loadSync(this.desc, {
      includeDirs: allIncludeDirs,
    });

    this.grpc = grpc.loadPackageDefinition(packageDefinition);
  }
}
