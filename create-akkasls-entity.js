#!/usr/bin/env node

const Scaffold = require("scaffold-generator");
const mustache = require("mustache");
const process = require("process");
const path = require("path");
const fs = require("fs");

if (process.argv.length <= 2) {
  console.error("Please specify the entity name:");
  console.error("  @lightbend/create-akkasls-entity <entity-name>");
  process.exit(1);
}

const name = process.argv[2];

const templatePath = path.resolve(__dirname, "template");
const targetPath = path.resolve(name);

if (fs.existsSync(targetPath)) {
  const existing = fs.lstatSync(targetPath);
  const type = existing.isDirectory() ? "directory" : "file";
  console.error("A " + type + " with the name '" + name + "' already exists.");
  console.error(
    "Either try with a new entity name, remove the existing " +
      type +
      ", or create the entity in a different directory."
  );
  process.exit(1);
}

// Override `mustache.escape`to avoid HTML-escaping of strings
mustache.escape = (v) => v;
console.info(`Generating new Akka Serverless entity '${name}'`);
new Scaffold({
  data: {
    name,
  },
  render: mustache.render,
})
  .copy(templatePath, targetPath)
  .then(() => {
    console.info("Entity codebase generated successfully. To get started:");
    console.info(`  cd ${name}`);
    console.info("  npm install");
    console.info("  npm run build");
  });
