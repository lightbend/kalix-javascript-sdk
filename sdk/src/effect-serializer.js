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

const AnySupport = require("./protobuf-any");
const util = require("util");

module.exports = class EffectSerializer {

  constructor() {}

  serializeEffect(method, message, metadata) {
    let serviceName, commandName;
    // We support either the grpc method, or a protobufjs method being passed
    if (typeof method.path === "string") {
      const r = new RegExp("^/([^/]+)/([^/]+)$").exec(method.path);
      if (r == null) {
        throw new Error(util.format("Not a valid gRPC method path '%s' on object '%o'", method.path, method));
      }
      serviceName = r[1];
      commandName = r[2];
    } else if (method.type === "rpc") {
      serviceName = this.fullName(method.parent);
      commandName = method.name;
    }

    const command = method;
    if (command !== undefined) {
      const payload = AnySupport.serialize(command.resolvedRequestType.create(message), false, false);
      const effect = {
        serviceName: serviceName,
        commandName: commandName,
        payload: payload
      };

      if (metadata && metadata.entries) {
        effect.metadata = {
          entries: metadata.entries
        }
      }

      return effect;
    } else {
      throw new Error(util.format("Command [%s] unknown on service [%s].", commandName, serviceName))
    }
  }

  fullName(item) {
    if (item.parent && item.parent.name !== "") {
      return this.fullName(item.parent) + "." + item.name;
    } else {
      return item.name;
    }
  }

  serializeSideEffect(method, message, synchronous, metadata) {
    const msg = this.serializeEffect(method, message, metadata);
    msg.synchronous = typeof synchronous === "boolean" ? synchronous : false;
    return msg;
  }

};
