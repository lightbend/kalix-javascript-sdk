#!/usr/bin/env bash
#
# Update package versions in samples.
#
# If `--all` is specified, then all dependencies will be updated to latest versions,
# otherwise just the SDK and akkasls-scripts dependencies will be updated.
#
# If `--check` is specified, then don't upgrade and only check for updates.

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
readonly samples_dir="$(cd "$script_dir/.." && pwd)"
readonly npm_dir="$samples_dir/.npm"
readonly ncu="$npm_dir/bin/ncu"

all=false
upgrade=true
while [[ $# -gt 0 ]] ; do
  case "$1" in
    --all | -a ) all=true ; shift ;;
    --check | -c ) upgrade=false ; shift ;;
  esac
done

# install npm-check-updates once in a local dir
[ -f "$ncu" ] || npm install --prefix "$npm_dir" -g npm-check-updates

for sample in "$samples_dir"/*/*/ ; do
  pushd "$sample"
  filter_option=$($all && echo "" || echo --filter "@lightbend/*")
  upgrade_option=$($upgrade && echo --upgrade || echo "")
  $ncu $filter_option $upgrade_option
  $upgrade && npm install || echo "No install needed"
  popd
done
