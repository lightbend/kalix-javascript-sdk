# create-akkasls-entity

This repository provides the `create-akkasls-entity` tool to support Akka Serverless development with the NPM/JavaScript toolchain.

## Usage

This tool can be used to generate a project suitable for the general development of
[event-sourced](https://martinfowler.com/eaaDev/EventSourcing.html)
[Akka Serverless](https://www.lightbend.com/akka-serverless) applications.

To create the initial codebase for a new entity with NPM:

```sh
npx @lightbend/create-akkasls-entity my-entity
cd my-entity
npm install
npm run build
```

Or using Yarn:

```sh
yarn create @lightbend/akkasls-entity my-entity
cd my-entity
yarn
yarn build
```

This module will be included as a dependency of the created project, providing the `akkasls-codegen-js` tool binary for your platform.

## Building

To build and test locally, first install:

```sh
npm install
```

...then package:

```sh
npm pack
```

...and then install locally (substituting <some-version> with the version that the above `npm pack` reports):

```sh
npm install -g lightbend-create-akkasls-entity-<some-version>.tgz
```

As the `create-akkasls-entity` command is now locally installed, you are able to run:

```sh
create-akkasls-entity my-entity
```