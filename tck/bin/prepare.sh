#!/bin/bash
#
# Prepare script for the javascript TCK implementation

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

# get the framework version from settings.js
readonly framework_version=$(cd "$sdk_dir" && node --print 'require("./settings").frameworkVersion')

# Delete and recreate the proto directory
rm -rf "$proto_dir"
mkdir -p "$proto_dir"

# Download and unzip the TCK protocols to the proto directory
curl -OL "https://repo1.maven.org/maven2/com/akkaserverless/akkaserverless-tck-protocol/$framework_version/akkaserverless-tck-protocol-$framework_version.zip"
unzip -j -d $tck_dir/proto "akkaserverless-tck-protocol-$framework_version.zip"
rm -f "akkaserverless-tck-protocol-$framework_version.zip"
