/*
 * Copyright 2021 Lightbend Inc.
 */

const fs = require("fs");
const path = require("path");
const protobuf = require("protobufjs");

module.exports.loadSync = function(desc, includeDirs) {
  const root = new protobuf.Root();
  root.resolvePath = function (origin, target) {
    for (let i = 0; i < includeDirs.length; i++) {
      const directory = includeDirs[i];
      const fullPath = path.resolve(directory, target);
      try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        return fullPath;
      } catch (err) {
      }
    }
    return null;
  };

  root.loadSync(desc);
  root.resolveAll();
  return root;
};

module.exports.moduleIncludeDirs = [
  path.join(__dirname, "..", "proto"),
  path.join(__dirname, "..", "protoc", "include")
];

module.exports.moduleRoot = require("../proto/protobuf-bundle");