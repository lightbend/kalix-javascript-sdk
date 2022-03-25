#!/usr/bin/env node
/*
 * Copyright 2021 Lightbend Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Scaffold = require('scaffold-generator');
const mustache = require('mustache');
const process = require('process');
const path = require('path');
const fs = require('fs');
const package = require('./package.json');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

/**
 * Generates a new initial codebase for an Kalix entity.
 *
 * Renders the contents of the `./template/base` directory overlayed with a second
 * subdirectory selected by the user (via the --template flag) using the Mustache
 * template engine.
 *
 * This is designed to align with expectations set by tools such as `create-react-app`,
 * see https://create-react-app.dev/docs/custom-templates
 */
const args = yargs(hideBin(process.argv))
  .env('AKKASLS_NPMJS')
  .usage(
    '$0 <entity-name>',
    'Generates a new initial codebase for an Kalix entity.',
    (yargs) => {
      yargs.positional('entity-name', {
        describe:
          'The name of the entity to generate. This is also used for the project directory.',
        type: 'string',
      });
    },
  )
  .option('template', {
    description: 'Specify a template for the created project',
    choices: ['value-entity', 'event-sourced-entity'],
    default: 'value-entity',
  })
  .option('scriptsVersion', {
    alias: 'scripts-version',
    type: 'string',
    description: 'Specify the kalix-scripts version string',
    default: `^${package.version}`,
  })
  .option('sdkVersion', {
    alias: 'sdk-version',
    type: 'string',
    description: 'Specify the kalix-javascript-sdk version string',
    default: `^${package.version}`,
  }).argv;

const baseTemplatePath = path.resolve(__dirname, 'template/base');
const templatePath = path.resolve(__dirname, 'template', args.template);
const targetPath = path.resolve(args.entityName);

if (fs.existsSync(targetPath)) {
  const existing = fs.lstatSync(targetPath);
  const type = existing.isDirectory() ? 'directory' : 'file';
  console.error(
    'A ' + type + " with the name '" + args.entityName + "' already exists.",
  );
  console.error(
    'Either try with a new entity name, remove the existing ' +
      type +
      ', or create the entity in a different directory.',
  );
  process.exit(1);
}

// Override `mustache.escape`to avoid HTML-escaping of strings
mustache.escape = (v) => v;
const scaffold = new Scaffold({
  data: {
    name: args.entityName,
    scriptsVersion: args.scriptsVersion,
    sdkVersion: args.sdkVersion,
  },
  render: mustache.render,
});

console.info(`Generating new Kalix entity '${args.entityName}'`);

scaffold
  .copy(baseTemplatePath, targetPath)
  .then(() => scaffold.copy(templatePath, targetPath))
  .then(() => {
    console.info('Entity codebase generated successfully. To get started:');
    console.info(`  cd ${args.entityName}`);
    console.info('  npm install');
    console.info('  npm run build');
  });
