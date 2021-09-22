# Releasing Akka Serverless JavaScript SDK

1. Create a `vX.Y.Z` tag and [new release](https://github.com/akkaserverless-javascript-sdk/releases/new) for the new version.
2. CircleCI will automatically publish the [@lightbend/akkaserverless-javascript-sdk package](https://www.npmjs.com/package/@lightbend/akkaserverless-javascript-sdk) to npm based on the tag.
3. Run `samples/bin/update.sh` to update the samples to the latest released versions.
