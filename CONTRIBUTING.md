# Developing the SDK

## Pre-requisites

The SDK currently requires Node.js 12.
Can be useful to install `nvm` and run `nvm use` to select the right node version if you have multiple node versions 
installed.

Install other js packages with `npm install`.

`pbjs` - install through `node bin/download-protoc.js` (really needed?)

## Run a sample locally

Start local proxy, in akkaserverless-framework root: `sbt proxy-core/run`

Sample is in `samples/js-shopping-cart`

From that directory `npm start`. The service can now be accessed through the local proxy at port 9000.

## TCK

The tck is run from the akkaserverless-framework/tck project (`sbt tck/it:test`)


## Tests

Run the tests using FIXME

## Docs

Build docs in the `doc/` directory with `make`. Note that it requires a docker daemon running.
