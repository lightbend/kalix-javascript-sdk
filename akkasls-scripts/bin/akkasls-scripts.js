#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const spawn = require("cross-spawn");

const akkaslsScriptDir = path.resolve(__dirname, "..");

const dockerBuild = (dockerTag) =>
  runOrFail("Building docker image", "docker", [
    "build",
    "--tag",
    dockerTag,
    ".",
  ]);

const getProtoFiles = (directory) =>
  fs.readdirSync(directory).flatMap((file) => {
    const absolutePath = path.resolve(directory, file);
    if (file.endsWith(".proto")) {
      return [absolutePath];
    } else if (fs.lstatSync(absolutePath).isDirectory()) {
      return getProtoFiles(absolutePath);
    } else {
      return [];
    }
  });

const scriptHandlers = {
  build({ protoSourceDir, akkaslsScriptDir, sourceDir, testSourceDir }) {
    const protoFiles = getProtoFiles(protoSourceDir);

    runOrFail(
      "Compiling protobuf descriptor",
      path.resolve("node_modules", ".bin", "compile-descriptor"),
      protoFiles,
      { shell: true }
    );

    runOrFail(
      "Invoking Akka Serverless codegen",
      path.resolve(akkaslsScriptDir, "bin", "akkasls-codegen-js.bin"),
      [
        "--proto-source-dir",
        protoSourceDir,
        "--source-dir",
        sourceDir,
        "--test-source-dir",
        testSourceDir,
      ]
    );
  },
  package({ dockerTag }) {
    dockerBuild(dockerTag);
  },
  deploy({ dockerTag, serviceName }) {
    const { status } = run("Verifying docker image exists", "docker", [
      "image",
      "inspect",
      dockerTag,
    ]);
    if (status === 1) {
      dockerBuild(dockerTag);
    }
    runOrFail("Pushing docker image", "docker", ["push", dockerTag]);
    runOrFail("Deploying Akka Serverless service", "akkasls", [
      "services",
      "deploy",
      serviceName,
      dockerTag,
    ]);
  },
};

const script = process.argv[2];
const handler = scriptHandlers[script];

if (handler) {
  // Extract project config from its package.json
  const packageConfig = require(path.resolve("package.json"));

  const config = {
    ...packageConfig.config,
    serviceName: packageConfig.name,
    dockerTag: `${packageConfig.config.dockerImage}:${packageConfig.version}`,
    akkaslsScriptDir,
  };

  handler(config);
} else {
  console.log(`Unknown script "${script}".`);
  console.log("Perhaps you need to update akkasls-scripts?");
}

/**
 * A wrapped version of cross-spawn's synchronous spawn with informative logging and default options for stdio.
 *
 * @param {string} actionDescription a description of the purpose of the command, to be used at the start of log messages (e.g. Reticulating splines)
 * @param {string} command the command to execute
 * @param {string[]} args arguments to pass to the command
 * @param {import("child_process").SpawnSyncOptionsWithBufferEncoding?} opts override options for the subprocess as per child_process.spawnSync. By default, stdio is inherited.
 */
function run(actionDescription, process, args, opts) {
  console.info(
    `${actionDescription} with command: ${process} ${args.join(" ")}`
  );

  return spawn.sync(process, args, {
    stdio: "inherit",
    ...opts,
  });
}

/**
 * A wrapped version of cross-spawn's synchronous spawn with informative logging, default options and error propogation on failure.
 *
 * @param {string} actionDescription a description of the purpose of the command, to be used at the start of log messages (e.g. Reticulating splines)
 * @param {string} command the command to execute
 * @param {string[]} args arguments to pass to the command
 * @param {import("child_process").SpawnSyncOptionsWithBufferEncoding?} opts override options for the subprocess as per child_process.spawnSync. By default, stdio is inherited.
 */
function runOrFail(actionDescription, process, args, opts) {
  const { status } = run(actionDescription, process, args, opts);

  if (status !== 0) {
    throw `${actionDescription} failed.`;
  }
}
