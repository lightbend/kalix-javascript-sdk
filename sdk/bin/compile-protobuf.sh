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

# Statically generates code from proto files
OUT_DIR="${PWD}/proto"
TS_OUT_DIR="${PWD}/proto"
IN_DIR="${PWD}/proto"
PROTOC="$(npm bin)/grpc_tools_node_protoc"
PROTOC_GEN_TS_PATH="$(npm bin)/protoc-gen-ts"
PROTOC_GEN_GRPC_PATH="$(npm bin)/grpc_tools_node_protoc_plugin"

$PROTOC \
    --proto_path="${PWD}/proto/" \
    --plugin=protoc-gen-ts=$PROTOC_GEN_TS_PATH \
    --plugin=protoc-gen-grpc=${PROTOC_GEN_GRPC_PATH} \
    --js_out=import_style=commonjs:$OUT_DIR \
    --grpc_out=grpc_js:$OUT_DIR \
    --ts_out=grpc_js:$TS_OUT_DIR \
    ${PWD}/proto/akkaserverless/*.proto \
    ${PWD}/proto/akkaserverless/protocol/*.proto \
    ${PWD}/proto/akkaserverless/component/*.proto \
    ${PWD}/proto/akkaserverless/component/*/*.proto
