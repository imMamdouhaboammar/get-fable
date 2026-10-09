#!/usr/bin/env bash
# ==============================================================================
# Fable UI/UX Polish Round Auto-Provisioner
# Automatically verifies and installs agent-browser, unslop-preflight, e2e runner
# ==============================================================================
set -euo pipefail

echo "=== [Fable] UI/UX Polish Round Auto-Provisioner ==="

# Check runtime
if ! command -v bun &> /dev/null; then
  echo "❌ Error: Bun runtime is required for get-fable. Please install Bun (https://bun.sh)."
  exit 1
fi

echo "✔ Bun runtime detected: $(bun --version)"

# 1. agent-browser CLI (The Canonical Browser Engine)
if ! command -v agent-browser &> /dev/null; then
  echo "📦 Installing agent-browser CLI globally via Bun..."
  bun add -g agent-browser
  echo "📦 Running browser binary install..."
  agent-browser install || true
  echo "✔ agent-browser installed successfully."
else
  echo "✔ agent-browser CLI is already available: $(which agent-browser)"
fi

# 2. unslop-preflight CLI (Design Contract & Layout Preflight)
if ! command -v unslop-preflight &> /dev/null; then
  echo "📦 Installing unslop-preflight globally via Bun..."
  bun add -g unslop-preflight
  echo "✔ unslop-preflight installed successfully."
else
  echo "✔ unslop-preflight CLI is already available: $(which unslop-preflight)"
fi

# 3. Project-level E2E runner (tester-army/e2e)
if [ -f "package.json" ]; then
  if ! bun pm ls 2>/dev/null | grep -q "e2e"; then
    echo "📦 Adding e2e and @e2e-dev/web to local devDependencies..."
    bun add -d e2e @e2e-dev/web || true
    echo "✔ e2e runner installed in current project."
  else
    echo "✔ e2e runner already installed in current project."
  fi
fi

echo "========================================================"
echo "✔ All UI/UX polish engines are ready for execution!"
echo "========================================================"
