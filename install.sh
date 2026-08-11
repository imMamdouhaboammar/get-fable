#!/usr/bin/env bash
set -e

echo "Installing get-fable workflow support..."

# Determine config directories
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
GEMINI_DIR="$HOME/.gemini/config"
KERNEL_DIR="$HOME/.agent-kernel"

# Temporary clone directory if needed
SKILL_DEST="$CLAUDE_DIR/skills/fable-mode"
mkdir -p "$SKILL_DEST"

REPO_URL="https://github.com/cozytab/fable5-mode"
if [ ! -d "$SKILL_DEST/.git" ]; then
    echo "Cloning the upstream Fable Mode repository..."
    git clone --quiet "$REPO_URL" "$SKILL_DEST"
else
    echo "Updating the existing Fable Mode checkout..."
    git -C "$SKILL_DEST" pull --quiet || true
fi

# Run fable-mode installer
if [ -f "$SKILL_DEST/install.sh" ]; then
    bash "$SKILL_DEST/install.sh"
fi

echo "Fable Mode workflow support installed"
echo "Restart the affected agent session so it can load the updated configuration"
