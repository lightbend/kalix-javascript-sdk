#!/usr/bin/env node

import path from "path";
import spawn from "cross-spawn";

import { createRequire } from "module";
import { fileURLToPath } from "url";
// Globals like __filename and __dirname aren't available in ES6 modules
const __filename = fileURLToPath(import.meta.url);
// This package uses ES6 modules, but require is necessary to load json files
const require = createRequire(import.meta.url);

const akkaslsScriptDir = path.resolve(path.dirname(__filename), "..");

const scriptNames = ["build", "deploy", "package"];
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

  import(path.resolve(akkaslsScriptDir, "scripts", `${script}.js`))
    .then(({ exec }) => exec({ scriptArgs, config, nodeArgs, runOrFail }))
    .catch((err) => {
      console.error(`Failed to execute [${script}] script.`);
      throw err;
    });
} else {
  console.log('Unknown script "' + args[0] + '".');
  console.log("Perhaps you need to update akkasls-scripts?");
}

/**
 * A wrapped version of cross-spawn's synchronous spawn with informative logging and error handling.
 * This is passed to the script handler for simplicity.
 *
 * @param {string} actionDescription a description of the purpose of the command, to be used at the start of log messages (e.g. Reticulating splines)
 * @param {string} command the command to execute
 * @param {string[]} args arguments to pass to the command
 * @param {import("child_process").SpawnSyncOptionsWithBufferEncoding?} opts override options for the subprocess as per child_process.spawnSync. By default, stdio is inherited.
 */
function runOrFail(actionDescription, process, args, opts) {
  console.info(
    `${actionDescription} with command: ${process} ${args.join(" ")}`
  );

  const result = spawn.sync(process, args, {
    stdio: "inherit",
    ...opts,
  });

  if (result.status !== 0) {
    throw `${actionDescription} failed.`;
  }
}
