const request = require("request");
const fs = require("fs");
const path = require("path");

const akkaslsCodegenVersion = "0.9.21";
const releases = {
  linux_x86_64: "akkasls-codegen-js-x86_64-unknown-linux-gnu",
  darwin_x86_64: "akkasls-codegen-js-x86_64-apple-darwin",
};

const arch = process.arch === "x64" ? "x86_64" : "x86_32";
const release = `${process.platform}_${arch}`;

const targetFile = path.resolve(__dirname, "..", "akkasls-codegen-js");

if (releases[release]) {
  const url = `https://dl.bintray.com/lightbend/generic/${releases[release]}-${akkaslsCodegenVersion}`;
  console.info(`Fetching akkasls-codegen-js from ${url}`);
  request(url).on("response", (response) => {
    if (response.statusCode !== 200) {
      throw new Error(
        `Error fetching Akka Serverless codegen tool from [${url}]: ${response.statusMessage}.`
      );
    }
    console.debug(`Saving to ${targetFile}`);

    const fileWriter = fs.createWriteStream(targetFile, { mode: 0o755 });
    response.pipe(fileWriter);
  });
} else {
  throw new Error(
    "Unsupported platform. No prebuilt version of the Akka Serverless codegen tool exists for this platform."
  );
}
