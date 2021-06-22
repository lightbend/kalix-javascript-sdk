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

# Compile protobuf
./bin/compile-protobuf.sh

# Generate TS type definitions based on the JSDocs
jsdoc -t ./node_modules/@lightbend/tsd-jsdoc/dist -c ./jsdoc.json -d .
mv types.d.ts index.d.ts
# There replacements are quite dirty, but even the patched tsd-jsdoc generator can't deal with these (mostly module related) issues currently
perl -i -pe 's/declare module \"akkaserverless\"/declare module \"\@lightbend\/akkaserverless-javascript-sdk\"/g' index.d.ts
perl -i -pe 's/module:akkaserverless\.//g' index.d.ts
perl -i -pe 's/import\("akkaserverless\.([a-zA-Z.]*)([a-zA-Z]*)\"\).(?!default\W)([a-zA-Z]*)/$1$2.$3/g' index.d.ts
perl -i -pe 's/import\("akkaserverless\.([a-zA-Z.]*)([a-zA-Z]*)\"\)([.a-zA-Z]*)/$1$2/g' index.d.ts
perl -i -pe 's/Promise(?!<)/Promise<any>/g' index.d.ts
perl -i -pe 's/Component\[\]/import(\"\.\/proto\/protobuf-bundle")\.akkaserverless\.protocol\.Component\[\]/g' index.d.ts
