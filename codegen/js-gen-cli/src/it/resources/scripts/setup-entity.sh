#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

pushd $1

npm link @kalix-io/kalix-scripts
npm install
npm run build

popd
