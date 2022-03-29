#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

pushd $1

npm link @lightbend/kalix-scripts
npm install
npm run build

popd
