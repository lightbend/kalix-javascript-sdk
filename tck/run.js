/*
 * Copyright 2021 Lightbend Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const sdk = require('@lightbend/akkaserverless-javascript-sdk');
const { GenericContainer, TestContainers, Wait } = require('testcontainers');

(async () => {
  const tckImplementation = require('./index');

  TestContainers.exposeHostPorts(8080);

  const tckImage = `gcr.io/akkaserverless-public/akkaserverless-tck:${sdk.settings.frameworkVersion}`;

  const container = await new GenericContainer(tckImage)
    .withEnv('TCK_SERVICE_HOST', 'host.testcontainers.internal')
    .start();

  const resultRegex = /Tests: succeeded (\d+), failed (\d+)/;

  const result = await new Promise((resolve) =>
    container.logs({}).then((logs) => {
      let succeeded = 0;
      let failed = 0;
      logs.on('data', (data) => {
        // Note: strip the docker API log message header (first 8 bytes/chars) from each line in log data stream
        // TODO: is there a better way to process these logs using testcontainers? Why isn't this handled already?
        data.split(/\r?\n/).forEach((lineWithHeader) => {
          const line = lineWithHeader.substring(8);
          const resultLine = resultRegex.exec(line);
          if (resultLine) {
            succeeded = parseInt(resultLine[1]);
            failed = parseInt(resultLine[2]);
          }
          if (line) console.log(line);
        });
      });
      logs.on('end', () => resolve({ succeeded: succeeded, failed: failed }));
    }),
  );

  tckImplementation.server.tryShutdown(() => {
    if (result.succeeded == 0 || result.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
})();
