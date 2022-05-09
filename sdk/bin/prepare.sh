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
  if [ -n "$PROXY_SNAPSHOT_DIRECTORY" ]; then
     # Use local proxy and sdk sources, useful for development, point PROXY_SNAPSHOTS_DIRECTORY to the local
     # proxy project source directory
     echo "Using snapshot of proxy and sdk protocols from '$PROXY_SNAPSHOT_DIRECTORY'"
     cp -rf $PROXY_SNAPSHOT_DIRECTORY/protocols/proxy/src/main/protobuf/* ./proto/
     cp -rf $PROXY_SNAPSHOT_DIRECTORY/protocols/sdk/src/main/protobuf/* ./proto/
   else
     # Download and unzip the proxy and SDK protocols to the proto directory
     download_protocol proxy
     download_protocol sdk
   fi
fi

# Compile protobuf
./bin/compile-protobuf.sh
