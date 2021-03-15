# akkasls-scripts

This package includes scripts and configuration used by the [`create-akkasls-entity` tool](https://github.com/lightbend/create-akksls-entity).

## Install
On install, this downloads the latest version of the JavaScript [codegen CLI](https://github.com/lightbend/akkaserverless-codegen)

## Scripts
### Build
 - Builds Protobuf descriptor file
 - Runs Akka Serverless JS codegen

### Package
 - Builds Docker image of the service

### Deploy
 - Deploys Docker image to specified repository
 - Invokes Akka Serverless deploy via `akkasls` CLI