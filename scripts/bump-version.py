#!/usr/bin/env python3
"""
scripts/bump-version.py — get-fable Version Bump Utility
=========================================================
Pumps the version string consistently across every file in the codespace
that carries a meaningful version reference.

Usage:
    python3 scripts/bump-version.py <new_version>
    python3 scripts/bump-version.py 1.9.0
    python3 scripts/bump-version.py --dry-run 1.9.0
    python3 scripts/bump-version.py --check        (audit current state)

Options:
    --dry-run     Show what would change without writing
    --check       Print current version found in each target file and exit
    --skip-git    Don't commit or tag (useful in CI before tests pass)
    --help        Show this message

After bumping, run the verification gate:
    bun run typecheck && bun test && bun run build
    bun ./bin/get-fable.js lint
    bun ./bin/get-fable.js doctor --json-v1
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

# ─────────────────────────────────────────────────────────────────────────────
# Repository root (resolved relative to this script)
# ─────────────────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent


# ─────────────────────────────────────────────────────────────────────────────
# File target definitions
# Each entry describes HOW the version string lives in that file.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class FileTarget:
    """Describes how to find and replace the version in a single file."""
    path: str                          # relative to REPO_ROOT
    pattern: str                       # regex to find the current version
    replacement: Callable[[str], str]  # function(new_version) -> replacement string
    description: str                   # human-readable note
    optional: bool = False             # skip silently when file doesn't exist


def _json_version(new_version: str) -> str:
    return f'"version": "{new_version}"'

def _md_version_header(new_version: str) -> str:
    return f'Version: **{new_version}**'

def _usage_header(new_version: str) -> str:
    return f'# Usage: get-fable {new_version}'

def _arch_header(new_version: str) -> str:
    return f'# Architecture: get-fable {new_version}'

def _install_header(new_version: str) -> str:
    return f'# Get Fable Installation Guide'  # header doesn't carry version — no-op handled via description

def _cargo_version(new_version: str) -> str:
    return f'version = "{new_version}"'

def _cargo_cli_macro(new_version: str) -> str:
    return f'#[command(version = "{new_version}")]'

def _formula_version(new_version: str) -> str:
    return f'version "{new_version}"'

def _test_cli_version(new_version: str) -> str:
    return f"expect(getPackageVersion()).toBe('{new_version}');"


TARGETS: list[FileTarget] = [

    # ── Core package ──────────────────────────────────────────────────────────
    FileTarget(
        path="package.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Main package.json — source of truth for npm registry",
    ),

    # ── Markdown version headers ───────────────────────────────────────────────
    FileTarget(
        path="AGENTS.md",
        pattern=r'Version:\s+\*\*[\d]+\.[\d]+\.[\d]+\*\*',
        replacement=_md_version_header,
        description="AGENTS.md authoritative version header",
    ),
    FileTarget(
        path="CLAUDE.md",
        pattern=r'Version:\s+\*\*[\d]+\.[\d]+\.[\d]+\*\*',
        replacement=_md_version_header,
        description="CLAUDE.md version header",
    ),
    FileTarget(
        path="docs/USAGE.md",
        pattern=r'# Usage: get-fable [\d]+\.[\d]+\.[\d]+',
        replacement=_usage_header,
        description="USAGE.md title header",
    ),
    FileTarget(
        path="docs/ARCHITECTURE.md",
        pattern=r'# Architecture: get-fable [\d]+\.[\d]+\.[\d]+',
        replacement=_arch_header,
        description="ARCHITECTURE.md title header",
    ),

    # ── Plugin manifests — all host plugins ───────────────────────────────────
    FileTarget(
        path=".claude-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Claude Code plugin manifest",
    ),
    FileTarget(
        path=".claude-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Claude Code marketplace metadata",
    ),
    FileTarget(
        path=".chatgpt-plugin/ai-plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="ChatGPT plugin manifest",
    ),
    FileTarget(
        path=".chatgpt-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="ChatGPT marketplace metadata",
    ),
    FileTarget(
        path=".chatgpt-plugin/openapi.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="ChatGPT OpenAPI schema version",
    ),
    FileTarget(
        path=".codex-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="OpenAI Codex plugin manifest",
    ),
    FileTarget(
        path=".codex-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Codex marketplace metadata",
    ),
    FileTarget(
        path=".cursor-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Cursor plugin manifest",
    ),
    FileTarget(
        path=".cursor-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Cursor marketplace metadata",
    ),
    FileTarget(
        path=".gemini-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Google Antigravity / Gemini plugin manifest",
    ),
    FileTarget(
        path=".gemini-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Gemini marketplace metadata",
    ),
    FileTarget(
        path=".grok-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Grok Build plugin manifest",
    ),
    FileTarget(
        path=".grok-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Grok marketplace metadata",
    ),
    FileTarget(
        path=".deepseek-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="DeepSeek Harness (DSH) plugin manifest",
    ),
    FileTarget(
        path=".deepseek-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="DSH marketplace metadata",
    ),
    FileTarget(
        path=".kimi-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Moonshot Kimi plugin manifest",
    ),
    FileTarget(
        path=".kimi-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Kimi marketplace metadata",
    ),
    FileTarget(
        path=".kiro-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Kiro plugin manifest",
    ),
    FileTarget(
        path=".kiro-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Kiro marketplace metadata",
    ),
    FileTarget(
        path=".opencode-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="OpenCode plugin manifest",
    ),
    FileTarget(
        path=".opencode-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="OpenCode marketplace metadata",
    ),
    FileTarget(
        path=".pi-plugin/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Pi Code plugin manifest",
    ),
    FileTarget(
        path=".pi-plugin/marketplace.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Pi Code marketplace metadata",
    ),

    # ── DSH standalone plugin ─────────────────────────────────────────────────
    FileTarget(
        path="dsh.plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="DSH Cordis standalone plugin descriptor",
    ),

    # ── Assets / Antigravity plugin ───────────────────────────────────────────
    FileTarget(
        path="assets/antigravity/plugin.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Antigravity plugin asset",
    ),

    # ── Skills.sh registry ────────────────────────────────────────────────────
    FileTarget(
        path="skills.sh.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="skills.sh package descriptor",
    ),

    # ── Pack manifests ────────────────────────────────────────────────────────
    FileTarget(
        path="packs/core.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Core skill pack manifest",
    ),
    FileTarget(
        path="packs/build.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Build skill pack manifest",
    ),
    FileTarget(
        path="packs/proof.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Proof skill pack manifest",
    ),
    FileTarget(
        path="packs/delivery.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Delivery skill pack manifest",
    ),
    FileTarget(
        path="packs/evolution.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Evolution skill pack manifest",
    ),
    FileTarget(
        path="packs/intelligence.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Intelligence skill pack manifest",
    ),
    FileTarget(
        path="packs/system.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="System skill pack manifest",
    ),
    FileTarget(
        path="packs/creator.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Creator skill pack manifest",
    ),
    FileTarget(
        path="packs/full.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Full combined skill pack manifest",
    ),

    # ── Registry files ────────────────────────────────────────────────────────
    FileTarget(
        path="registry/agents.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Registry: agent definitions",
    ),
    FileTarget(
        path="registry/hooks.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Registry: hook definitions",
    ),
    FileTarget(
        path="registry/neural-graph.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Registry: neural graph",
    ),
    FileTarget(
        path="registry/recipes.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Registry: recipes",
    ),
    FileTarget(
        path="registry/tools.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Registry: tools",
    ),

    # ── Prompts / OpenAPI ─────────────────────────────────────────────────────
    FileTarget(
        path="prompts/chatgpt-openapi-schema.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="ChatGPT OpenAPI schema in prompts/",
    ),

    # ── Tool adapters ─────────────────────────────────────────────────────────
    FileTarget(
        path="tools/adapters/generic/index.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Generic tool adapter index",
    ),
    FileTarget(
        path="tools/adapters/grok/index.json",
        pattern=r'"version":\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_json_version,
        description="Grok tool adapter index",
    ),

    # ── Rust native engine & crates ───────────────────────────────────────────
    FileTarget(
        path="crates/fable-core/Cargo.toml",
        pattern=r'version\s*=\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_cargo_version,
        description="fable-core Cargo.toml version",
        optional=True,
    ),
    FileTarget(
        path="crates/fable-cli/Cargo.toml",
        pattern=r'version\s*=\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_cargo_version,
        description="fable-cli Cargo.toml version",
        optional=True,
    ),
    FileTarget(
        path="crates/fable-eco/Cargo.toml",
        pattern=r'version\s*=\s*"[\d]+\.[\d]+\.[\d]+"',
        replacement=_cargo_version,
        description="fable-eco Cargo.toml version",
        optional=True,
    ),
    FileTarget(
        path="crates/fable-cli/src/main.rs",
        pattern=r'#\[command\(version\s*=\s*"[\d]+\.[\d]+\.[\d]+"\)\]',
        replacement=_cargo_cli_macro,
        description="fable-cli main.rs clap command version",
        optional=True,
    ),
    FileTarget(
        path="Cargo.lock",
        pattern=r'name = "fable-cli"\nversion = "[\d]+\.[\d]+\.[\d]+"',
        replacement=lambda v: f'name = "fable-cli"\nversion = "{v}"',
        description="Cargo.lock fable-cli version",
        optional=True,
    ),
    FileTarget(
        path="Cargo.lock",
        pattern=r'name = "fable-core"\nversion = "[\d]+\.[\d]+\.[\d]+"',
        replacement=lambda v: f'name = "fable-core"\nversion = "{v}"',
        description="Cargo.lock fable-core version",
        optional=True,
    ),
    FileTarget(
        path="Cargo.lock",
        pattern=r'name = "fable-eco"\nversion = "[\d]+\.[\d]+\.[\d]+"',
        replacement=lambda v: f'name = "fable-eco"\nversion = "{v}"',
        description="Cargo.lock fable-eco version",
        optional=True,
    ),

    # ── Homebrew Formula & Unit Tests ─────────────────────────────────────────
    FileTarget(
        path="Formula/get-fable.rb",
        pattern=r'version\s+"[\d]+\.[\d]+\.[\d]+"',
        replacement=_formula_version,
        description="Homebrew formula version",
    ),
    FileTarget(
        path="test/cli.test.ts",
        pattern=r"expect\(getPackageVersion\(\)\)\.toBe\('[\d]+\.[\d]+\.[\d]+'\);",
        replacement=_test_cli_version,
        description="CLI unit test version assertion",
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
# Version validation
# ─────────────────────────────────────────────────────────────────────────────

SEMVER_RE = re.compile(r'^\d+\.\d+\.\d+$')


def validate_semver(version: str) -> None:
    if not SEMVER_RE.match(version):
        print(f"ERROR: '{version}' is not valid semver (expected MAJOR.MINOR.PATCH)", file=sys.stderr)
        sys.exit(1)


def current_version_from_package_json() -> str:
    pkg = REPO_ROOT / "package.json"
    data = json.loads(pkg.read_text())
    return data["version"]


# ─────────────────────────────────────────────────────────────────────────────
# Core bump logic
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class BumpResult:
    path: str
    description: str
    found_version: str | None
    status: str          # "updated" | "already_current" | "no_match" | "missing"
    was_dry_run: bool = False


def bump_file(target: FileTarget, new_version: str, dry_run: bool) -> BumpResult:
    abs_path = REPO_ROOT / target.path
    if not abs_path.exists():
        if target.optional:
            return BumpResult(target.path, target.description, None, "missing")
        else:
            return BumpResult(target.path, target.description, None, "missing")

    content = abs_path.read_text(encoding="utf-8")

    match = re.search(target.pattern, content)
    if not match:
        return BumpResult(target.path, target.description, None, "no_match")

    matched_text = match.group(0)

    # Extract the version number from the matched text
    version_in_file = re.search(r'[\d]+\.[\d]+\.[\d]+', matched_text)
    found = version_in_file.group(0) if version_in_file else None

    if found == new_version:
        return BumpResult(target.path, target.description, found, "already_current", dry_run)

    replacement_text = target.replacement(new_version)
    new_content = re.sub(target.pattern, replacement_text, content)

    if not dry_run:
        abs_path.write_text(new_content, encoding="utf-8")

    return BumpResult(target.path, target.description, found, "updated", dry_run)


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def cmd_check() -> None:
    """Audit — print what version each target currently contains."""
    current = current_version_from_package_json()
    print(f"\nCurrent version in package.json: {current}\n")
    print(f"{'File':<55} {'Version':<12} {'Status'}")
    print("─" * 90)

    for target in TARGETS:
        abs_path = REPO_ROOT / target.path
        if not abs_path.exists():
            print(f"  {target.path:<53} {'MISSING':<12} ← file not found")
            continue

        content = abs_path.read_text(encoding="utf-8")
        match = re.search(target.pattern, content)
        if not match:
            print(f"  {target.path:<53} {'NO MATCH':<12} ← pattern not found in file")
            continue

        version_match = re.search(r'[\d]+\.[\d]+\.[\d]+', match.group(0))
        found = version_match.group(0) if version_match else "?"
        status = "✓ current" if found == current else "✗ STALE"
        print(f"  {target.path:<53} {found:<12} {status}")

    print()


def cmd_bump(new_version: str, dry_run: bool, skip_git: bool) -> None:
    validate_semver(new_version)

    old_version = current_version_from_package_json()
    if old_version == new_version:
        print(f"Already at {new_version}. Nothing to do.")
        sys.exit(0)

    print(f"\n{'DRY RUN: ' if dry_run else ''}Bumping {old_version} → {new_version}\n")

    results = [bump_file(t, new_version, dry_run) for t in TARGETS]

    updated   = [r for r in results if r.status == "updated"]
    current_v = [r for r in results if r.status == "already_current"]
    no_match  = [r for r in results if r.status == "no_match"]
    missing   = [r for r in results if r.status == "missing"]

    # Print summary
    for r in updated:
        prefix = "[DRY RUN] would update" if dry_run else "updated"
        print(f"  {prefix:<22} {r.path}  ({r.found_version} → {new_version})")

    for r in current_v:
        print(f"  {'already current':<22} {r.path}")

    if no_match:
        print()
        for r in no_match:
            print(f"  WARNING: pattern not found in  {r.path}  ({r.description})")

    if missing:
        print()
        for r in missing:
            print(f"  SKIP (missing file):           {r.path}")

    print(f"\n{'Would update' if dry_run else 'Updated'} {len(updated)} file(s). "
          f"{len(current_v)} already current. "
          f"{len(no_match)} pattern mismatches. "
          f"{len(missing)} missing files.\n")

    if dry_run:
        print("Dry run complete — no files were written.")
        return

    if no_match:
        print("WARNING: Some patterns were not matched. Run --check to inspect.\n")

    # Git operations
    if not skip_git:
        print("Staging changed files...")
        changed_paths = [str(REPO_ROOT / r.path) for r in updated]
        subprocess.run(["git", "add", *changed_paths], cwd=REPO_ROOT, check=True)

        commit_msg = f"chore: bump version to {new_version}"
        print(f"Committing: {commit_msg}")
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_ROOT, check=True)

        tag = f"v{new_version}"
        print(f"Tagging: {tag}")
        subprocess.run(["git", "tag", "-a", tag, "-m", f"Release {new_version}"], cwd=REPO_ROOT, check=True)

        print(f"\nDone. Commit and tag {tag} created.")
        print("Push with: git push && git push --tags")
    else:
        print("Skipped git operations (--skip-git).")

    print("\nNext — run the verification gate:")
    print("  bun run typecheck && bun test && bun run build")
    print("  bun ./bin/get-fable.js lint")
    print("  bun ./bin/get-fable.js doctor --json-v1")
    print("  bun ./bin/get-fable.js evidence pass build 'bun run build' 'build clean'")
    print()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="get-fable version bump utility — pumps version across all codespace files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "new_version",
        nargs="?",
        help="Target semver string, e.g. 1.9.0",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing files",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Audit current version state across all target files and exit",
    )
    parser.add_argument(
        "--skip-git",
        action="store_true",
        help="Skip git commit and tag after bumping",
    )

    args = parser.parse_args()

    if args.check:
        cmd_check()
        return

    if not args.new_version:
        parser.print_help()
        print("\nERROR: new_version argument required unless using --check", file=sys.stderr)
        sys.exit(1)

    cmd_bump(args.new_version, args.dry_run, args.skip_git)


if __name__ == "__main__":
    main()
