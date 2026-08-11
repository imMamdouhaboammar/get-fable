#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/imMamdouhaboammar/get-fable.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
TEMP_DIR=""

cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

if ! command -v bun >/dev/null 2>&1; then
  echo "get-fable requires Bun. Install Bun first, then rerun this installer." >&2
  exit 1
fi

if [[ -f "$SCRIPT_DIR/package.json" && -f "$SCRIPT_DIR/bin/get-fable.js" ]]; then
  REPO_DIR="$SCRIPT_DIR"
else
  if ! command -v git >/dev/null 2>&1; then
    echo "Git is required when install.sh is run outside a get-fable checkout." >&2
    exit 1
  fi

  TEMP_DIR="$(mktemp -d)"
  REPO_DIR="$TEMP_DIR/get-fable"
  echo "Fetching get-fable..."
  git clone --depth 1 --quiet "$REPO_URL" "$REPO_DIR"
fi

echo "Running the get-fable global installer..."
bun "$REPO_DIR/bin/get-fable.js" install

echo "Installation complete"
echo "Run 'bun $REPO_DIR/bin/get-fable.js status' to inspect the configured targets"
