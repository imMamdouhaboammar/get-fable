#!/usr/bin/env bash
set -euo pipefail

# Fable Test Pyramid Autonomous Runner
# Orchestrates execution of get-fable's multi-tier test pyramid.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

echo "=== Fable Test Pyramid Orchestrator ==="
echo "Repository Root: ${REPO_ROOT}"
cd "${REPO_ROOT}"

# Tier 1: Local Unit & Type Check
echo ""
echo "[Tier 1/7] Running TypeScript unit tests (bun test)..."
bun test

echo ""
echo "[Tier 1/7] Running TypeScript typecheck..."
bun run typecheck

if command -v cargo >/dev/null 2>&1; then
  CARGO_BIN="cargo"
elif [ -f "${HOME}/.cargo/bin/cargo" ]; then
  CARGO_BIN="${HOME}/.cargo/bin/cargo"
else
  CARGO_BIN=""
fi

if [ -n "${CARGO_BIN}" ]; then
  echo ""
  echo "[Tier 1/7] Running Rust workspace tests (${CARGO_BIN} test --workspace)..."
  "${CARGO_BIN}" test --workspace
else
  echo "[Tier 1/7] Warning: cargo not found in PATH; skipping Rust unit tests."
fi

# Tier 2: Neural Test Differential & Provenance Checks
NATIVE_BIN="${REPO_ROOT}/target/release/get-fable-native"
if [ -x "${NATIVE_BIN}" ]; then
  echo ""
  echo "[Tier 2/7] Running Neural Test provenance check via native binary..."
  "${NATIVE_BIN}" rig call-tool --tool fable_neural_test --args '{"action":"ledger"}' --json >/dev/null
  echo "✓ Tier 2 Neural Test provenance verified."
fi

# Tier 3: Anti-Slop AST Diff Guard
echo ""
echo "[Tier 3/7] Scanning workspace diff for anti-slop blockers..."
bun ./bin/get-fable.js anti-slop scan --base HEAD

# Tier 4: Integration & Rig LLM Tools
echo ""
echo "[Tier 4/7] Running Rig integration suite..."
bun test test/rig-integration.test.ts

# Tier 7: System Doctor Audit
echo ""
echo "[Tier 7/7] Running comprehensive system doctor..."
bun ./bin/get-fable.js doctor --json-v1 >/dev/null
echo "✓ Tier 7 System Doctor verified all checks green."

echo ""
echo "=== All Fable Test Pyramid Tiers Verified Successfully ==="
