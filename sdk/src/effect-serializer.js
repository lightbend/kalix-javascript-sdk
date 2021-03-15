/*
 * Copyright 2019 Lightbend Inc.
 */

const AnySupport = require("./protobuf-any");
const util = require("util");

module.exports = class EffectSerializer {

  constructor(allEntities) {
    this.allEntities = allEntities;
  }

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

    const service = this.allEntities[serviceName];

    if (service !== undefined) {
      const command = service.methods[commandName];
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
    } else {
      throw new Error(util.format("Service [%s] has not been registered as an entity in this user function, and so can't be used as a side effect or forward.", service))
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
    msg.synchronous = synchronous;
    return msg;
  }

};
