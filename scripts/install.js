const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

/**
 * Downloads the appropriate version of the akkasls-codegen-js tool for your platform.
 * This is leveraged when this module is installed as a dependency.
 */

const akkaslsCodegenVersion = "0.10.4";
const releases = {
  linux_x86_64: `akkasls-codegen-js-x86_64-unknown-linux-gnu-${akkaslsCodegenVersion}`,
  darwin_x86_64: `akkasls-codegen-js-x86_64-apple-darwin-${akkaslsCodegenVersion}`,
  win32_x86_64: `akkasls-codegen-js-x86_64-pc-windows-gnu-${akkaslsCodegenVersion}.exe`,
};

const arch = process.arch === "x64" ? "x86_64" : "x86_32";
const release = `${process.platform}_${arch}`;

const filename =
  process.platform == "win32" ? "akkasls-codegen-js.exe" : "akkasls-codegen-js";
const targetFile = path.resolve(__dirname, "..", filename);

if (releases[release]) {
  const url = `https://dl.bintray.com/lightbend/generic/${releases[release]}`;
  console.info(`Fetching akkasls-codegen-js from ${url}`);
  fetch(url).then(response => {
    if (!response.ok) {
      throw new Error(
        `Error fetching Akka Serverless codegen tool from [${url}]: ${response.statusText}.`
      );
    }
    console.debug(`Saving to ${targetFile}`);

    const fileWriter = fs.createWriteStream(targetFile, { mode: 0o755 });
    response.body.pipe(fileWriter);

  })
} else {
  throw new Error(
    "Unsupported platform. No prebuilt version of the Akka Serverless codegen tool exists for this platform."
  );
}
