const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const packageConfig = require("../package.json");

/**
 * Downloads the appropriate version of the akkasls-codegen-js tool for your platform.
 * This is leveraged when this module is installed as a dependency.
 */

// Codegen tool version is defined in package.json
const { akkaslsCodegenVersion } = packageConfig.config;
const releases = {
  linux_x86_64: "akkasls-codegen-js-x86_64-unknown-linux-gnu",
  darwin_x86_64: "akkasls-codegen-js-x86_64-apple-darwin",
  win32_x86_64: "akkasls-codegen-js-x86_64-pc-windows-gnu",
};

const arch = process.arch === "x64" ? "x86_64" : "x86_32";
const release = `${process.platform}_${arch}`;

// Windows requires executable files to have some file extension, but we need a consistent name cross-platform
const filename = "akkasls-codegen-js.bin";

const binDir = path.resolve(__dirname, "../bin");
const targetFile = path.resolve(binDir, filename);
if (releases[release]) {
  const url =
    process.platform == "win32"
      ? `https://dl.cloudsmith.io/public/lightbend/akkaserverless/raw/names/${releases[release]}/versions/${akkaslsCodegenVersion}/${releases[release]}.exe`
      : `https://dl.cloudsmith.io/public/lightbend/akkaserverless/raw/versions/${akkaslsCodegenVersion}/${releases[release]}`;
  console.info(`Fetching akkasls-codegen-js from ${url}`);
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(
        `Error fetching Akka Serverless codegen tool from [${url}]: ${response.statusText}.`
      );
    }
    console.debug(`Saving to ${targetFile}`);
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir);
    }

    const fileWriter = fs.createWriteStream(targetFile, { mode: 0o755 });
    response.body.pipe(fileWriter);
  });
} else {
  throw new Error(
    "Unsupported platform. No prebuilt version of the Akka Serverless codegen tool exists for this platform."
  );
}
