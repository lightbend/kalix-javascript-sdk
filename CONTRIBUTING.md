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

To use the local SDK to be tested in local you can run the following from the root directory of this project. Please look at known issues first.

    ./bin/create-local-dependencies.sh

and then add those to any sample. For example, go to samples/js/js-valueentity-shopping-cart and execute the following. Bear in mind $KALIXJSSDK needs to point to `kalix-javascript-sdk` folder.
    
    export KALIX_NPMJS_CODEGEN_BINARY="$KALIXJSSDK/codegen/js-gen-cli/target/native-image/kalix-codegen-js"
    nvm use 14
    npm install --save \
                  "$KALIXJSSDK/sdk/kalix-io-kalix-javascript-sdk-0.0.0.tgz" \
                  "$KALIXJSSDK/npm-js/kalix-scripts/kalix-io-kalix-scripts-0.0.0.tgz" \
                  "$KALIXJSSDK/testkit/kalix-io-testkit-0.0.0.tgz"
    npm install
    npm run build

if you set PROXY_SNAPSHOT_DIRECTORY pointing to your local proxy then you can use your proxy instead of the default that is downloaded from https://repo1.maven.org/maven2/io/kalix/kalix-$module-protocol/$framework_version/kalix-$module-protocol-$framework_version.zip


### Known issues

    Invoking Kalix codegen with command: /Users/francisco/Git/kalix-javascript-sdk/samples/js/js-replicated-entity-shopping-cart/node_modules/@kalix-io/kalix-scripts/bin/kalix-codegen-js.bin --proto-source-dir ./proto --source-dir ./src --generated-source-dir ./lib/generated --test-source-dir ./test
    Inspecting proto file descriptor for Kalix code generation...
    Exception in thread "main" java.lang.NoClassDefFoundError: kalix.Annotations

This happens when you generate the codegen with Java 17 instead of 11 and then you run `npm run build` on one of the `samples`.

    npm ERR! code 1
    npm ERR! path /Users/francisco/Git/kalix-javascript-sdk/sdk
    npm ERR! command failed
    npm ERR! command sh -c bin/prepare.sh

This can happens when you run `./bin/create-local-dependencies`. This is because `sdk/bin/prepare.sh` has `*` after `echo "Using snapshot of proxy and sdk protocols from '$PROXY_SNAPSHOT_DIRECTORY'"`. In iOS you need to remove the asteriscs in the two lines below.  

