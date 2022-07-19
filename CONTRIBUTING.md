# Developing the JavaScript SDK


## Prerequisites

The JavaScript SDK requires Node.js 14.

It can be useful to install `nvm` and run `nvm use` to select the right node version if you have multiple node versions installed.

Install package dependencies with `npm install`.


## Tests

Run the tests for the SDK with `npm test` (in the `sdk` directory).

Run integration tests with `npm run integration-test` (in the `sdk` directory, requires Docker).

See [.circleci/config.yml] for all tests that run for CI.


## Samples

Each sample under `samples` can be run locally. See their READMEs for details.


## TCK

To run the Kalix TCK, see [tck/README.md].


## Docs

Build docs in the `doc/` directory with `make`. Note that it requires a docker daemon running.

## Formatting

Auto-update formatting with:

    npm run prettier-format

## Local development

To use the local SDK to be tested in local you can run the following.

    ./create-local-dependencies.sh

and then add those to any sample. For example, go to samples/js/js-valueentity-shopping-cart and execute the following.
    nvm use 14
    npm install --save \
                  "$KALIXJSSDK/sdk/kalix-io-kalix-javascript-sdk-0.0.0.tgz" \
                  "$KALIXJSSDK/npm-js/kalix-scripts/kalix-io-kalix-scripts-0.0.0.tgz" \
                  "$KALIXJSSDK/testkit/kalix-io-testkit-0.0.0.tgz"
    npm install
    npm run build

if you set PROXY_SNAPSHOT_DIRECTORY pointing to your local proxy then you can use it instead of the default downloaded from https://repo1.maven.org/maven2/io/kalix/kalix-$module-protocol/$framework_version/kalix-$module-protocol-$framework_version.zip
