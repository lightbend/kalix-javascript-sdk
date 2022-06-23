#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const spawn = require('cross-spawn');

const requiredConfig = [
  'dockerImage',
  'sourceDir',
  'testSourceDir',
  'protoSourceDir',
  'generatedSourceDir',
  'compileDescriptorArgs',
];

const kalixScriptDir = path.resolve(__dirname, '..');

const dockerBuildArgs =
  process.arch === 'arm64'
    ? ['buildx', 'build', '--platform=linux/amd64']
    : ['build'];

const dockerBuild = (dockerTag) =>
  runOrFail('Building docker image', 'docker', [
    ...dockerBuildArgs,
    '--tag',
    dockerTag,
    '.',
  ]);

const getProtoFiles = (directory) =>
  fs.readdirSync(directory).flatMap((file) => {
    const absolutePath = path.resolve(directory, file);
    if (file.endsWith('.proto')) {
      return [absolutePath];
    } else if (fs.lstatSync(absolutePath).isDirectory()) {
      return getProtoFiles(absolutePath);
    } else {
      return [];
    }
  });

function flag(name, value) {
  return value ? [name] : [];
}

function option(name, value) {
  return value ? [name, value] : [];
}

const scriptHandlers = {
  build({
    baseDir,
    mainFile,
    descriptorSetOutputDir,
    descriptorSetFile,
    protoSourceDir,
    kalixScriptDir,
    sourceDir,
    testSourceDir,
    integrationTestSourceDir,
    generatedSourceDir,
    compileDescriptorArgs,
    typescript,
  }) {
    const protoFiles = getProtoFiles(protoSourceDir);
    fs.mkdirSync(generatedSourceDir, {
      recursive: true,
    });
    const protoJs = path.resolve(generatedSourceDir, 'proto.js');
    const protoTs = path.resolve(generatedSourceDir, 'proto.d.ts');

    const defaultCompileDescriptorArgs = [];

    if (
      !compileDescriptorArgs.some((arg) =>
        arg.startsWith('--descriptor_set_out'),
      )
    ) {
      const descriptorDir = descriptorSetOutputDir || process.cwd();
      const descriptorName = descriptorSetFile || 'user-function.desc';
      const descriptorPath = path.resolve(descriptorDir, descriptorName);
      defaultCompileDescriptorArgs.push(
        '--descriptor_set_out=' + descriptorPath,
      );
    }

    if (!compileDescriptorArgs.includes('--include_source_info')) {
      defaultCompileDescriptorArgs.push('--include_source_info');
    }

    runOrFail(
      'Compiling protobuf descriptor',
      path.resolve('node_modules', '.bin', 'compile-descriptor'),
      [
        ...protoFiles,
        ...defaultCompileDescriptorArgs,
        ...compileDescriptorArgs,
      ],
      { shell: true },
    );

    runOrFail(
      'Building static Javascript definitions from proto',
      path.resolve('node_modules', '.bin', 'pbjs'),
      [...protoFiles, '-t', 'static-module', '-o', protoJs],
      { shell: true },
    );

    runOrFail(
      'Building Typescript definitions from static JS',
      path.resolve('node_modules', '.bin', 'pbts'),
      [protoJs, '-o', protoTs],
      { shell: true },
    );

    runOrFail(
      'Invoking Kalix codegen',
      path.resolve(kalixScriptDir, 'bin', 'kalix-codegen-js.bin'),
      [
        ...flag('--typescript', typescript),
        ...option('--base-dir', baseDir),
        ...option('--main-file', mainFile),
        ...option('--descriptor-set-output-dir', descriptorSetOutputDir),
        ...option('--descriptor-set-file', descriptorSetFile),
        ...option('--proto-source-dir', protoSourceDir),
        ...option('--source-dir', sourceDir),
        ...option('--generated-source-dir', generatedSourceDir),
        ...option('--test-source-dir', testSourceDir),
        ...option('--integration-test-source-dir', integrationTestSourceDir),
      ],
    );
  },
  package({ dockerTag }) {
    dockerBuild(dockerTag);
  },
  deploy({ dockerTag, serviceName }) {
    const { status } = run('Verifying docker image exists', 'docker', [
      'image',
      'inspect',
      dockerTag,
    ]);
    if (status === 1) {
      dockerBuild(dockerTag);
    }
    runOrFail('Pushing docker image', 'docker', ['push', dockerTag]);
    runOrFail('Deploying Kalix service', 'kalix', [
      'service',
      'deploy',
      serviceName,
      dockerTag,
    ]);
  },
};

const script = process.argv[2];
const handler = scriptHandlers[script];
if (!handler) {
  console.error(`Unknown script "${script}".`);
  console.error('Perhaps you need to update kalix-scripts?');
  process.exit(1);
}

// Extract project config from its package.json
const packageConfig = require(path.resolve('package.json'));

if (packageConfig.config == undefined) {
  console.error('The "config" section of your package.json is not defined.');
  console.error('You must specify the following properties:');
  console.error(requiredConfig.join(', '));
  process.exit(1);
}

const missingConfig = requiredConfig.filter(
  (key) => (packageConfig.config && packageConfig.config[key]) == undefined,
);

if (missingConfig.length > 0) {
  console.error(
    `The "config" section of your package.json is missing the following required properties:`,
  );
  console.error(missingConfig.join(', '));
  process.exit(1);
}

const config = {
  ...packageConfig.config,
  serviceName: packageConfig.name,
  dockerTag: `${packageConfig.config.dockerImage}:${packageConfig.version}`,
  kalixScriptDir: kalixScriptDir,
};

handler(config);

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
    `${actionDescription} with command: ${process} ${args.join(' ')}`,
  );

  return spawn.sync(process, args, {
    stdio: 'inherit',
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
    console.error(
      'Running ' +
        actionDescription +
        ' failed, process: [' +
        process +
        '], args: [' +
        args +
        ']',
    );
    throw `${actionDescription} failed.`;
  }
}
