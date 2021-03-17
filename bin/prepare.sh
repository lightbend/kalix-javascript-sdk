#!/bin/bash

# Prepare script for the akkaserverless-javascript-sdk package

# Delete and recreate the proto directory
rm -rf ./proto
mkdir -p ./proto
cp -r ../protocols/proxy/src/main/protobuf/* ../protocols/sdk/src/main/protobuf/* ./proto/

# Generate the protobuf bundle and typescript definitions
pbjs -t static-module -w commonjs -o ./proto/protobuf-bundle.js -p ./proto -p ./protoc/include \
  ./proto/akkaserverless/*.proto \
  ./proto/akkaserverless/component/*.proto \
  ./proto/akkaserverless/component/*/*.proto

pbjs -t static-module -p ./proto -p ./protoc/include \
  ./proto/akkaserverless/*.proto \
  ./proto/akkaserverless/component/*.proto \
  ./proto/akkaserverless/component/*/*.proto \
  | pbts -o ./proto/protobuf-bundle.d.ts -
