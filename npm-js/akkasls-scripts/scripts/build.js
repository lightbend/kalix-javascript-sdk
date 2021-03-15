import path from "path";

export function exec({ nodeArgs, config, runOrFail }) {
  const { protoSourceDir, akkaslsScriptDir } = config;

  runOrFail(
    "Compiling protobuf descriptor",
    process.execPath,
    [
      ...nodeArgs,
      "./node_modules/.bin/compile-descriptor",
      path.resolve(protoSourceDir, "*.proto"),
    ],
    { shell: true }
  );

  runOrFail(
    "Invoking Akka Serverless codegen",
    path.resolve(akkaslsScriptDir, "bin", "akkasls-codegen-js.bin"),
    ["--proto-source-dir", protoSourceDir]
  );
}
