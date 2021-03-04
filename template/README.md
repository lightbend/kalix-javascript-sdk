# {{artifactId}}

## Designing

While designing your service it is useful to read [designing Cloudstate services](https://developer.lightbend.com/docs/akka-serverless/designing/index.html)

## Developing

This project has a bare-bones skeleton service ready to go, but in order to adapt and
extend it it may be useful to read up on [developing Cloudstate services](https://developer.lightbend.com/docs/akka-serverless/developing/index.html)
and in particular the [JavaScript section](https://developer.lightbend.com/docs/akka-serverless/js-services/index.html)

## Prerequisites

No additional tooling is required for local development. To build and deploy to a cluster:

- Docker; see https://docs.docker.com/engine/install/
- Akka Serverless CLI (`akkasls`); see https://developer.lightbend.com/docs/akka-serverless/getting-started/set-up-development-env.html#_akka_serverless_cli

## Building

To build, at a minimum you need to generate and process sources, particularly when using an IDE.
A convenience is compile your project:

```
npm install
npm run build
```

## Running Locally

In order to run your application locally, you must run the Cloudstate proxy. The included `docker-compose` file contains the configuration required to run the proxy for a locally running application. To start the proxy, run the following command from this directory:

### macOS and Windows

```
docker-compose up
```

### Linux

> On Linux this requires Docker 20.10 or later (https://github.com/moby/moby/pull/40007), 
> or for a `USER_FUNCTION_HOST` environment variable to be set manually.

```
docker-compose -f docker-compose.yml -f docker-compose.linux.yml up
```

To start the application locally, use the following commands:

> Be sure to have performed `npm install` for the first time!

```
npm run build && npm run start
```

With both the proxy and your application running, any defined endpoints should be available at `http://localhost:9000`. For example, given [`grpcurl`](https://github.com/fullstorydev/grpcurl):

```
> grpcurl -plaintext -d '{"entityId": "foo"}' localhost:9000 com.example.MyServiceEntity/GetValue
ERROR:
  Code: Unknown
  Message: Unexpected entity failure
```

> Note: The failure is to be expected if you have not yet provided an implementation of `GetValue` in
> your entity.

## Deploying

To deploy your service, install the `akkasls` CLI as documented in
[Setting up a local development environment](https://developer.lightbend.com/docs/akka-serverless/getting-started/set-up-development-env.html)
and configure a Docker Registry to upload your docker image to.

You will need to update the `akkasls.dockerImage` property in the `pom.xml` and refer to
[Configuring registries](https://developer.lightbend.com/docs/akka-serverless/deploying/registries.html)
for more information on how to make your docker image available to Akka Serverless.

Finally you can or use the [Akka Serverless Console](https://console.akkaserverless.com)
to create a project and then deploy your service into the project either by using `npm run deploy`,
through the `akkasls` CLI or via the web interface. When using `npm run deploy`, NPM will also
conveniently package and publish your docker image prior to deployment.
