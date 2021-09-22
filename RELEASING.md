# Releasing Akka Serverless JavaScript SDK

1. Create a `vX.Y.Z` tag and [new release](https://github.com/akkaserverless-javascript-sdk/releases/new) for the new version.
2. CircleCI will automatically publish the [@lightbend/akkaserverless-javascript-sdk package](https://www.npmjs.com/package/@lightbend/akkaserverless-javascript-sdk) to npm based on the tag.


## Publishing documentation hotfixes

Docs will be published automatically on release. Docs can also be published manually for hotfixes.

The version used in the docs will be the nearest tag. If all doc changes since the last release should be published, run (in the `docs` dir, or with `-C docs`):

```
make deploy
```

If only some doc changes are needed, branch from the last release tag, cherry-pick the needed doc changes, and then run `make deploy`.

This will publish the doc sources to the `docs/current` branch. They will be included automatically in the next build for the main docs. A build for the main docs can also be triggered by re-running the last docs build in CircleCI (on the `master` branch for dev docs, on the `current` branch for prod docs).
