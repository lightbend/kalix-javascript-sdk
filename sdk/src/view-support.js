/*
 * Copyright 2019 Lightbend Inc.
 */

const debug = require("debug")("akkaserverless-view");
// Bind to stdout
debug.log = console.log.bind(console);

class ViewSupport {
  constructor(root, service) {
    this.root = root;
    this.service = service;
  }
}

module.exports = class ViewServices {

  constructor() {
    this.services = {};
  }

  addService(component, allComponents) {
    this.services[component.serviceName] = new ViewSupport(component.root, component.service);
  }

  componentType() {
    return "akkaserverless.component.view.Views";
  }

  register(server) {
    // Nothing to register
  }
};
