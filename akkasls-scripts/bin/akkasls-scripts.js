#!/usr/bin/env node

const path = require("path");
const spawn = require("cross-spawn");

const akkaslsScriptDir = path.resolve(__dirname, "..");

const dockerBuild = (dockerTag) =>
  runOrFail("Building docker image", "docker", [
    "build",
    "--tag",
    dockerTag,
    ".",
  ]);

const scriptHandlers = {
  build({ nodeArgs, config }) {
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
  },
  package({ config }) {
    const { dockerTag } = config;
    dockerBuild(dockerTag);
  },
  deploy({ config }) {
    const { dockerTag, serviceName } = config;
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

const scriptNames = Object.keys(scriptHandlers);
const args = process.argv.slice(2);
const scriptIndex = args.findIndex((arg) => scriptNames.includes(arg));

if (scriptIndex > -1) {
  const script = args[scriptIndex];
  const scriptArgs = args.slice(scriptIndex + 1);
  // Arguments before the named script should be treated as arguments to node itself, and reused in any spawned node processes
  const nodeArgs = args.slice(0, scriptIndex);

  // Extract project config from its package.json
  const packageConfig = require(path.resolve("package.json"));
  const config = {
    ...packageConfig.config,
    serviceName: packageConfig.name,
    dockerTag: `${packageConfig.config.dockerImage}:${packageConfig.version}`,
    akkaslsScriptDir,
  };

  scriptHandlers[script]({ config, nodeArgs, scriptArgs });
} else {
  console.log('Unknown script "' + args[0] + '".');
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
