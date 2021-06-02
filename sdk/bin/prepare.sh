#!/bin/bash

# Prepare script for the akkaserverless-javascript-sdk package

# Delete and recreate the proto directory
rm -rf ./proto
mkdir -p ./proto

# get the framework version from settings.js
readonly framework_version=$(node --print 'require("./settings").frameworkVersion')

function download_protocol {
  local module="$1"
  curl -OL "https://repo1.maven.org/maven2/com/akkaserverless/akkaserverless-$module-protocol/$framework_version/akkaserverless-$module-protocol-$framework_version.zip"
  unzip "akkaserverless-$module-protocol-$framework_version.zip"
  cp -r "akkaserverless-$module-protocol-$framework_version"/* proto
  rm -rf "akkaserverless-$module-protocol-$framework_version.zip" "akkaserverless-$module-protocol-$framework_version"
}

# Download and unzip the proxy and SDK protocols to the proto directory
download_protocol proxy
download_protocol sdk

# Generate the protobuf bundle and typescript definitions
pbjs -t static-module -w commonjs -o ./proto/protobuf-bundle.js -p ./proto -p ./protoc/include \
  ./proto/akkaserverless/*.proto \
  ./proto/akkaserverless/protocol/*.proto \
  ./proto/akkaserverless/component/*.proto \
  ./proto/akkaserverless/component/*/*.proto

pbjs -t static-module -p ./proto -p ./protoc/include \
  ./proto/akkaserverless/*.proto \
  ./proto/akkaserverless/protocol/*.proto \
  ./proto/akkaserverless/component/*.proto \
  ./proto/akkaserverless/component/*/*.proto \
  | pbts -o ./proto/protobuf-bundle.d.ts -

tsc