# Generate and compile test protos and descriptors

proto-loader-gen-types \
  --grpcLib=@grpc/grpc-js \
  --defaults \
  --includeDirs=proto \
  --includeDirs=test \
  --outDir=test/generated/proto \
  example.proto

pbjs -t static-module -w commonjs \
  -o test/generated/protobuf.js \
  test/*.proto

pbts \
  -o test/generated/protobuf.d.ts \
  test/generated/protobuf.js

bin/compile-descriptor.js \
  test/example.proto \
  --descriptor_set_out=test/generated/user-function.desc
