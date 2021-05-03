/*
 * Copyright 2021 Lightbend Inc.
 */

/**
 * CloudEvent data.
 *
 * @interface module:akkaserverless.CloudEvent
 * @property {string} specversion The CloudEvent spec version
 */
function toCloudevent(metadata) {
  return {
    get specversion() {
      return metadata["ce-specversion"];
    },
    get id() {
      return metadata["ce-id"];
    },
    set id(id) {
      metadata["ce-id"] = id;
    },
    get source() {
      return metadata["ce-source"];
    },
    set source(source) {
      metadata["ce-source"] = source;
    },
    get type() {
      return metadata["ce-type"];
    },
    set type(type) {
      metadata["ce-type"] = type;
    },
    get datacontenttype() {
      return metadata["Content-Type"];
    },
    set datacontenttype(datacontenttype) {
      metadata["Content-Type"] = datacontentype;
    },
    get dataschema() {
      return metadata["ce-dataschema"];
    },
    set dataschema(dataschema) {
      metadata["ce-dataschema"] = dataschema;
    },
    get subject() {
      return metadata["ce-subject"];
    },
    set subject(subject) {
      metadata["ce-subject"] = subject;
    },
    get time() {
      return metadata["ce-time"];
    },
    set time(time) {
      metadata["ce-time"] = time;
    },
  };
}

module.exports = {
  toCloudevent
};