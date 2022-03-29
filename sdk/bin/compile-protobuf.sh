# Generate the protobuf bundle and typescript definitions
pbjs -t static-module -w commonjs -o ./proto/protobuf-bundle.js -p ./proto -p ./protoc/include \
  ./proto/kalix/*.proto \
  ./proto/kalix/protocol/*.proto \
  ./proto/kalix/component/*.proto \
  ./proto/kalix/component/*/*.proto

pbjs -t static-module -p ./proto -p ./protoc/include \
  ./proto/kalix/*.proto \
  ./proto/kalix/protocol/*.proto \
  ./proto/kalix/component/*.proto \
  ./proto/kalix/component/*/*.proto \
  | pbts -o ./proto/protobuf-bundle.d.ts -

# Statically generates code from proto files
OUT_DIR="${PWD}/proto"
TS_OUT_DIR="${PWD}/proto"
IN_DIR="${PWD}/proto"
PROTOC="${PWD}/protoc/bin/protoc"
PROTOC_GEN_TS_PATH="$(npm bin)/protoc-gen-ts"
PROTOC_GEN_GRPC_PATH="$(npm bin)/grpc_tools_node_protoc_plugin"

$PROTOC \
    --proto_path="${PWD}/proto/" \
    --plugin=protoc-gen-ts=$PROTOC_GEN_TS_PATH \
    --plugin=protoc-gen-grpc=${PROTOC_GEN_GRPC_PATH} \
    --js_out=import_style=commonjs:$OUT_DIR \
    --grpc_out=grpc_js:$OUT_DIR \
    --ts_out=grpc_js:$TS_OUT_DIR \
    ${PWD}/proto/google/api/*.proto \
    ${PWD}/proto/kalix/*.proto \
    ${PWD}/proto/kalix/protocol/*.proto \
    ${PWD}/proto/kalix/component/*.proto \
    ${PWD}/proto/kalix/component/*/*.proto

# Compile test protos
rm -rf test/proto
cp -r proto test/

OUT_DIR="${PWD}/test/proto"
TS_OUT_DIR="${PWD}/test/proto"

$PROTOC \
    --proto_path="${PWD}/test/proto/" \
    --proto_path="${PWD}/test/" \
    --plugin=protoc-gen-ts=$PROTOC_GEN_TS_PATH \
    --plugin=protoc-gen-grpc=${PROTOC_GEN_GRPC_PATH} \
    --js_out=import_style=commonjs:$OUT_DIR \
    --grpc_out=grpc_js:$OUT_DIR \
    --ts_out=grpc_js:$TS_OUT_DIR \
    ${PWD}/test/example.proto
