# Akka Serverless JavaScript SDK

Source code for the [@lightbend/akkaserverless-javascript-sdk](https://www.npmjs.com/package/@lightbend/akkaserverless-javascript-sdk) package.

For more information see the documentation for [implementing Akka Serverless services in JavaScript](https://developer.lightbend.com/docs/akka-serverless/javascript/).

# Build locally

This project uses NPM >7 remember to upgrade locally to avoid massive diffs of the `package-lock.json` file.

To build locally remember to add this line to your configuration:
```
@lightbend:registry=https://npm.cloudsmith.io/lightbend/akkaserverless
```

to add it to your user you can:
```bash
echo "@lightbend:registry=https://npm.cloudsmith.io/lightbend/akkaserverless" >> ~/.npmrc
```
