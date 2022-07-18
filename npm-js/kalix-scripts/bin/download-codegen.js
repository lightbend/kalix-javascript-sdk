const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const util = require('util');
const packageConfig = require('../package.json');

/**
 * Downloads the appropriate version of the kalix-codegen-js tool for your platform.
 * This is leveraged when this module is installed as a dependency.
 */

// Codegen tool version is the same as this version
const kalixCodegenVersion = packageConfig.version;
const releases = {
  linux_x86_64: 'kalix-codegen-js-x86_64-unknown-linux-gnu',
  darwin_x86_64: 'kalix-codegen-js-x86_64-apple-darwin',
  win32_x86_64: 'kalix-codegen-js-x86_64-pc-windows-gnu',
};

const arch =
  process.platform === 'darwin' && process.arch === 'arm64'
    ? 'x86_64' // use rosetta for darwin arm64 for now
    : process.arch === 'x64'
    ? 'x86_64'
    : 'x86_32';

const release = `${process.platform}_${arch}`;

// Windows requires executable files to have some file extension, but we need a consistent name cross-platform
const filename = 'kalix-codegen-js.bin';

const binDir = path.resolve(__dirname, '../bin');
const targetFile = path.resolve(binDir, filename);
// for testing and local development:
// if the env var KALIX_NPMJS_CODEGEN_BINARY is set the file is fetched from the local filesystem
const localBinary = process.env.KALIX_NPMJS_CODEGEN_BINARY;
if (localBinary) {
  console.info(`Copying kalix-codegen-js from ${localBinary}`);
  fs.copyFile(localBinary, targetFile, (err) => {
    if (err) throw err;
  });
} else if (releases[release]) {
  const url =
    process.platform == 'win32'
      ? `https://repo.lightbend.com/raw/kalix/versions/${kalixCodegenVersion}/${releases[release]}.exe`
      : `https://repo.lightbend.com/raw/kalix/versions/${kalixCodegenVersion}/${releases[release]}`;
  console.info(`Fetching kalix-codegen-js from ${url}`);

  axios
    .get(url, { responseType: 'stream' })
    .then((response) => {
      console.debug(`Saving to ${targetFile}`);
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir);
      }

      const streamPipeline = util.promisify(stream.pipeline);
      const fileWriter = fs.createWriteStream(targetFile, { mode: 0o755 });
      return streamPipeline(response.data, fileWriter);
    })
    .catch((error) => {
      const failure = error.isAxiosError ? error.response.statusText : error;
      console.error('Failed to download Kalix codegen binary:', failure);
      if (fs.existsSync(targetFile)) {
        fs.rmSync(targetFile);
      }
      process.exit(1);
    });
} else {
  throw new Error(
    'Unsupported platform. No prebuilt version of the Kalix codegen tool exists for this platform.',
  );
}
