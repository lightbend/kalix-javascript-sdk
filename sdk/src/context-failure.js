/*
 * Copyright 2019 Lightbend Inc.
 */

module.exports = class ContextFailure extends Error {
  constructor(msg) {
    super(msg);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContextFailure);
    }
    this.name = "ContextFailure";
  }
};
