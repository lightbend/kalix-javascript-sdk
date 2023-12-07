#!/usr/bin/env bash

# USAGE:
# > RUNTIME_VERSION=1.0.31 ./update-runtime-versions.sh

# this script is meant to be used after a new Runtime version is out
# to facilitate the update of all the places where we usually depend on the latest version

# provide the new Runtime version you want the project to be updated to
if [[ -z "${RUNTIME_VERSION}" ]]; then
    echo "Must provide RUNTIME_VERSION in environment" 1>&2
    exit 1
fi

cd ..

echo ">>> Updating docker image versions to ${RUNTIME_VERSION}"
PROJS=$(find . -type f -name "docker-compose.yml")
for i in ${PROJS[@]}
do
  echo "Updating Dockerfile for: $i"
  sed -i.bak "s/gcr.io\/kalix-public\/kalix-runtime:\(.*\)/gcr.io\/kalix-public\/kalix-runtime:${RUNTIME_VERSION}/" $i
  rm $i.bak
done

echo ">>> Updating application.conf"
sed -i.bak "s/gcr.io\/kalix-public\/kalix-runtime:\(.*\)\"/gcr.io\/kalix-public\/kalix-runtime:${RUNTIME_VERSION}\"/" ./codegen/js-gen-cli/src/it/resources/application.conf
rm ./codegen/js-gen-cli/src/it/resources/application.conf.bak

echo ">>> Updating config.json"
sed -i.bak "s/\"frameworkVersion\": \"\(.*\)\"/\"frameworkVersion\": \"${RUNTIME_VERSION}\"/" ./sdk/config.json
rm ./sdk/config.json.bak
