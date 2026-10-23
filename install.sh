#!/bin/sh
# Public bootstrap: install the released CLI, not a source-only GitHub checkout.
set -eu

if command -v bun >/dev/null 2>&1; then
  printf '%s\n' 'Installing the published get-fable CLI with Bun...'
  bun add -g get-fable
elif command -v npm >/dev/null 2>&1; then
  printf '%s\n' 'Installing the published get-fable CLI with npm...'
  npm install -g get-fable
else
  printf '%s\n' 'get-fable requires Bun or Node/npm. Please install Bun (https://bun.sh) or Node.js and rerun.' >&2
  exit 1
fi

if ! command -v get-fable >/dev/null 2>&1; then
  printf '%s\n' 'The package installed, but get-fable is not on PATH. Check your global binary directory.' >&2
  exit 1
fi

get-fable --version
printf '%s\n' 'Installation complete! From your project root, run:'
printf '%s\n' '  get-fable init'
printf '%s\n' '  get-fable install all'
printf '%s\n' '  get-fable skills install all'
printf '%s\n' '  get-fable doctor --json-v1'
