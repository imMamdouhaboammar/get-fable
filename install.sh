#!/bin/sh
# Public bootstrap: install the released CLI, not a source-only GitHub checkout.
set -eu

if ! command -v bun >/dev/null 2>&1; then
  printf '%s\n' 'get-fable requires Bun 1.3+. Install Bun and rerun this script.' >&2
  exit 1
fi

if [ "$#" -ne 0 ]; then
  printf '%s\n' 'Usage: sh install.sh (no arguments). Configure hosts later with get-fable install.' >&2
  exit 2
fi

printf '%s\n' 'Installing the published get-fable CLI with Bun...'
bun add -g get-fable

if ! command -v get-fable >/dev/null 2>&1; then
  printf '%s\n' 'The package installed, but get-fable is not on PATH. Check the Bun global binary directory.' >&2
  exit 1
fi

get-fable --version
printf '%s\n' 'From your project root, run:'
printf '%s\n' '  get-fable init'
printf '%s\n' '  get-fable install all'
printf '%s\n' '  get-fable skills install all'
printf '%s\n' '  get-fable doctor --json-v1'
