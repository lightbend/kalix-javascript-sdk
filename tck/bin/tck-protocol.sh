#!/bin/bash
#
# Fetch and compile TCK protocols for TypeScript implementation

set -e

function _script_path {
  local source="${BASH_SOURCE[0]}"
  while [ -h "$source" ] ; do
    local linked="$(readlink "$source")"
    local dir="$(cd -P $(dirname "$source") && cd -P $(dirname "$linked") && pwd)"
    source="$dir/$(basename "$linked")"
  done
  echo ${source}
}

readonly script_path=$(_script_path)
readonly script_dir="$(cd -P "$(dirname "$script_path")" && pwd)"
readonly tck_dir="$(cd "$script_dir/.." && pwd)"
readonly sdk_dir="$(cd "$tck_dir/../sdk" && pwd)"
readonly proto_dir="$tck_dir/proto"
readonly generated_dir="$tck_dir/generated"
readonly descriptor_file="$tck_dir/user-function.desc"

# Need to delete the proto directory and generated files to rebuild (including local snapshot versions)
if [ -d "$proto_dir" ] && [ -d "$generated_dir" ] && [ -f "$descriptor_file" ] ; then
  echo "TCK protocol already built ('npm run clean' first to fetch and compile again)"
  echo
else
  # get the framework version from config.json
  readonly framework_version=$(cd "$sdk_dir" && node --print 'require("./config.json").frameworkVersion')

  rm -rf "$proto_dir"
  mkdir -p "$proto_dir"

  if [ -n "$PROXY_SNAPSHOT_DIRECTORY" ]; then
    # Use local sources by pointing PROXY_SNAPSHOTS_DIRECTORY to local framework directory
    echo "Using snapshot of TCK protocols from '$PROXY_SNAPSHOT_DIRECTORY'"
    cp -f $PROXY_SNAPSHOT_DIRECTORY/protocols/tck/src/main/protobuf/kalix/tck/model/*/*.proto "$proto_dir"
  else
    # Download and unzip the TCK protocols to the proto directory
    artifact_url="https://repo1.maven.org/maven2/io/kalix/kalix-tck-protocol/$framework_version/kalix-tck-protocol-$framework_version.zip"
    echo "Fetching TCK protocol module from: $artifact_url"
    curl -OL $artifact_url
    unzip -j -d "$proto_dir" "kalix-tck-protocol-$framework_version.zip"
    rm -f "kalix-tck-protocol-$framework_version.zip"
  fi

  # protobufjs generated proto

  readonly pbjs="$tck_dir/node_modules/.bin/pbjs"
  readonly pbts="$tck_dir/node_modules/.bin/pbts"

  mkdir -p "$generated_dir"

  "$pbjs" -t static-module -r "tck" -w commonjs --no-encode --no-decode --no-verify --no-convert --no-delimited -o "$generated_dir/tck.js" "$proto_dir"/*.proto
  "$pbts" --no-comments -o "$generated_dir/tck.d.ts" "$generated_dir/tck.js"

  # compile protobuf descriptor

  readonly compile_descriptor="$tck_dir/node_modules/.bin/compile-descriptor"

  "$compile_descriptor" "$proto_dir"/*.proto
fi
