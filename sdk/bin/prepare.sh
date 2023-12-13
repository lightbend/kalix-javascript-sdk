#!/bin/bash

# Prepare script for the kalix-javascript-sdk package

# get the framework version from config.json
readonly framework_version=$(node --print 'require("./config.json").frameworkVersion')

function download_protocol {
  local module="$1"
  mkdir -p ./proto
  artifact_url="https://repo1.maven.org/maven2/io/kalix/kalix-$module-protocol/$framework_version/kalix-$module-protocol-$framework_version.zip"
  echo "Fetching protocol module $module from: $artifact_url"
  curl -OL $artifact_url
  unzip "kalix-$module-protocol-$framework_version.zip"
  cp -r "kalix-$module-protocol-$framework_version"/* proto
  rm -rf "kalix-$module-protocol-$framework_version.zip" "kalix-$module-protocol-$framework_version"
}

# Need to delete the proto directory and generated files to rebuild (including local snapshot versions)
if [ -d "./proto" ] ; then
  echo "Protocol already built ('npm run clean' first to fetch and compile again)"
  echo
else
  if [ -n "$RUNTIME_SNAPSHOT_DIRECTORY" ]; then
     # Use local runtime and sdk sources, useful for development, point RUNTIME_SNAPSHOT_DIRECTORY to the local
     # runtime project source directory
     echo "Using snapshot of proxy and sdk protocols from '$RUNTIME_SNAPSHOT_DIRECTORY'"
     cp -rf $RUNTIME_SNAPSHOT_DIRECTORY/protocols/proxy/src/main/protobuf/* ./proto/
     cp -rf $RUNTIME_SNAPSHOT_DIRECTORY/protocols/sdk/src/main/protobuf/* ./proto/
   else
     # Download and unzip the proxy and SDK protocols to the proto directory
     download_protocol proxy
     download_protocol sdk
   fi
fi

# Generate types for the proxy protocol
proto-loader-gen-types \
  --grpcLib=@grpc/grpc-js \
  --defaults \
  --includeDirs=proto \
  --outDir=types/generated/proto \
  kalix/protocol/discovery.proto \
  kalix/component/action/action.proto \
  kalix/component/eventsourcedentity/event_sourced_entity.proto \
  kalix/component/replicatedentity/replicated_entity.proto \
  kalix/component/valueentity/value_entity.proto \
  kalix/component/view/view.proto
