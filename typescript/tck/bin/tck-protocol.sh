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
readonly js_tck_dir="$(cd "$tck_dir/../../tck" && pwd)"
readonly js_tck_proto_dir="$js_tck_dir/proto"
readonly proto_dir="$tck_dir/proto"

# Copy from the JavaScript TCK implementation, if we don't already have the TCK protocol.
# Need to delete the proto directory to fetch again (including local snapshot versions).
if [ ! -d "$proto_dir" ]; then
  $js_tck_dir/bin/prepare.sh && cp -r "$js_tck_proto_dir" "$proto_dir"
fi

# protobufjs generated proto

readonly pbjs="$tck_dir/node_modules/.bin/pbjs"
readonly pbts="$tck_dir/node_modules/.bin/pbts"
readonly generated_dir="$tck_dir/generated"

mkdir -p "$generated_dir"

"$pbjs" -t static-module -r "tck" -w commonjs --no-encode --no-decode --no-verify --no-convert --no-delimited -o "$generated_dir/tck.js" "$proto_dir"/*.proto
"$pbts" --no-comments -o "$generated_dir/tck.d.ts" "$generated_dir/tck.js"

# protoc (google-protobuf) generated proto
# note: can't currently be used with SDK

# readonly sdk_dir="$tck_dir/node_modules/@lightbend/akkaserverless-javascript-sdk"
# readonly sdk_proto_dir="$sdk_dir/proto"
# readonly sdk_protoc_dir="$sdk_dir/protoc"
# readonly sdk_protoc_include_dir="$sdk_protoc_dir/include"
# readonly generated_dir="$tck_dir/generated"
# readonly protoc="$sdk_protoc_dir/bin/protoc"
# readonly protoc_gen_ts="$tck_dir/node_modules/.bin/protoc-gen-ts"

# mkdir -p "$generated_dir"

# "$protoc" \
#   --proto_path="$proto_dir" \
#   --proto_path="$sdk_proto_dir" \
#   --proto_path="$sdk_protoc_include_dir" \
#   --plugin=protoc-gen-ts="$protoc_gen_ts" \
#   --js_out=import_style=commonjs:"$generated_dir" \
#   --ts_out="$generated_dir" \
#   "$proto_dir"/*.proto

# cp -r "$sdk_proto_dir"/* "$generated_dir"
