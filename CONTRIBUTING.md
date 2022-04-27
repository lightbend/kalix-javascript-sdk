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
