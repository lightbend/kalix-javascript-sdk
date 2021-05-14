#!/usr/bin/env bash
#
# Dynamic version, Akka Serverless framework style.
# Script version of sbt-dynver usage.

set -euo pipefail

function _script_path {
  local source="${BASH_SOURCE[0]}"
  while [ -h "$source" ] ; do
    local linked="$(readlink "$source")"
    local dir="$(cd -P $(dirname "$source") && cd -P $(dirname "$linked") && pwd)"
    source="$dir/$(basename "$linked")"
  done
  echo ${source}
}

readonly script_path=$(_script_path)
readonly script_dir="$(cd -P "$(dirname "$script_path")" && pwd)"
readonly sdk_dir="$(cd "$script_dir/.." && pwd)"

# base framework version --- get from settings.js
# FIXME: the base version (and pre_version) can be removed when the SDK is separated from the main repo
readonly base=$(cd "$sdk_dir" && node --print 'require("./settings").baseVersion()')

# check if the git repo is dirty (has changes)
function dirty {
  ! git diff --no-ext-diff --quiet --exit-code HEAD
}

# returns a dynamic version based on git describe and closest tag
# strip the `v` tag prefix and the `g` commit prefix (g represents git)
function dynamic_version {
  git describe --tags --long --abbrev=8 --match "v$base.*" --dirty=-dev 2>/dev/null | sed 's/^v\(.*\)-g\([0-9a-f]\{8\}\)/\1-\2/'
}

# returns an exact version if the current commit is tagged
# strip the `v` tag prefix from the version
function exact_version {
  git describe --tags --match "v$base.*" --exact-match 2>/dev/null | sed 's/^v//'
}

# returns a `pre` version, for when there is no prior tag for the base version
function pre_version {
  local commit=$(git rev-parse --short=8 HEAD)
  local dirty_suffix=""
  dirty && dirty_suffix="-dev"
  echo "${base}.0-pre-${commit}${dirty_suffix}"
}

dirty && dynamic_version || exact_version || dynamic_version || pre_version
