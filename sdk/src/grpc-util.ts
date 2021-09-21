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

import * as util from 'util';

export class GrpcUtil {
  /**
   * INTERNAL API
   *
   * Monkey patch async versions of unary request methods onto all clients in the given grpc descriptor hierarchy
   */
  static promisifyAllClients(grpc: any) {
    Object.entries(grpc).forEach(([key, value]) => {
      if (key == key.toLowerCase()) {
        // package (lower case name), recurse
        this.promisifyAllClients(value);
      } else {
        // @ts-ignore
        if (value.service) {
          // a service client, patch it!
          grpc[key] = GrpcUtil.promisifyClient(value, '');
        }
      }
    });
  }

  /**
   * INTERNAL API
   *
   * add async versions of unary request methods, suffixed with the given suffix
   */
  static promisifyClient(client: any, suffix: String) {
    Object.keys(Object.getPrototypeOf(client)).forEach((methodName) => {
      const methodFunction = client[methodName];
      if (
        methodFunction.requestStream == false &&
        methodFunction.responseStream == false
      ) {
        client[methodName + suffix] = util
          .promisify(methodFunction)
          .bind(client);
      }
    });
    return client;
  }
}
