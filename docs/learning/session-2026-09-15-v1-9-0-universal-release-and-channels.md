# Session Learnings: Universal Multi-Channel Distribution, fable-heal & v1.9.0 Release

**Session date**: 2026-09-15  
**Scope**: Version 1.9.0 release engineering, automated bump-version script, fable-heal 29th skill integration, Cloudflare WAF adapter, Alibaba OCR review engine, Rust parity, universal 32-platform distribution, and no-mistakes quality gate pipeline.

---

## L1 — Multi-Target Version Consistency Across 55 Codespace Artifacts

### Problem
In a complex agent ecosystem like `get-fable`, version strings live across dozens of heterogenous file formats:
- Root npm manifests (`package.json`, `bun.lock`)
- Native Cargo crates (`Cargo.lock`, `crates/fable-core/Cargo.toml`, `crates/fable-cli/Cargo.toml`, `crates/fable-cli/src/main.rs`)
- Homebrew formulas (`Formula/get-fable.rb`)
- 12 host plugin manifests & marketplaces (`.claude-plugin/`, `.codex-plugin/`, `.chatgpt-plugin/`, `.gemini-plugin/`, `.grok-plugin/`, `.cursor-plugin/`, `.deepseek-plugin/`, `.kimi-plugin/`, `.kiro-plugin/`, `.opencode-plugin/`, `.pi-plugin/`, `dsh.plugin.json`)
- 8 skill pack definitions (`packs/*.json`)
- 5 registry files (`registry/*.json`)
- Deep Playbook rules and docs (`AGENTS.md`, `CLAUDE.md`, `docs/USAGE.md`, `docs/ARCHITECTURE.md`)
- Unit test assertions (`test/cli.test.ts`)

Manual updates inevitably lead to version drift, broken doctor checks, or CI failures.

### Correct Pattern
Use `scripts/bump-version.py` which registers all 55+ target patterns and replacement closures:
1. Run audit: `python3 scripts/bump-version.py --check`
2. Preview changes: `python3 scripts/bump-version.py --dry-run <new_version>`
3. Apply changes: `python3 scripts/bump-version.py <new_version> --skip-git`
4. Run verification gates (`typecheck`, `test`, `build`, `lint`, `doctor`) before committing.

---

## L2 — Canonical Skill Expansion Contract: 28 to 29 Skills

### Problem
When adding `fable-heal` as the 29th canonical skill, updating `skills/get-fable/registry.json` alone left stale count references (`28 skills`, `across 27 skills`) in `README.md`, `AGENTS.md`, `CLAUDE.md`, `dsh.plugin.json`, and `data/plugins/imMamdouhaboammar__get-fable.yml`.

### Correct Pattern
Whenever the canonical skill count changes:
1. Validate package structure: `get-fable skills packages`
2. Update all top-level documentation references (`29 connected Skills`, `## 29 Skills. One way of working.`)
3. Regenerate derived artifacts:
   ```bash
   bun run generate:catalog
   bun run generate:llms
   ```
4. Verify with Doctor: `bun ./bin/get-fable.js doctor --json-v1` must report `PASS` on `skill-registry` and `feed-engine` with exact count parity.

---

## L3 — Dual Quality Gate & Push Policy Synchronization

### Problem
Pushing only to `origin` bypasses the required local verification proxy (`no-mistakes`), while pushing only to `no-mistakes` delays upstream synchronization and triggers no GitHub Actions workflows for draft releases and npm publishing.

### Correct Pattern
Synchronize both remotes in sequence:
1. Run all local gates (`bun test`, `bun run build`, `get-fable lint`, `get-fable doctor`)
2. Record fresh evidence: `get-fable evidence pass ...`
3. Push to `no-mistakes` first to satisfy the local agent review and safety pipeline:
   ```bash
   git push no-mistakes master --tags
   ```
4. Push to `origin` to trigger public CI, draft releases, and OIDC trusted publishing:
   ```bash
   git push origin master --tags
   ```
5. Publish draft GitHub release to trigger the npm publishing pipeline:
   ```bash
   gh release edit v<version> --title "..." --notes-file ... --draft=false
   ```

---

## L4 — Universal Host Parity (32 Platforms)

### Problem
Users interact with get-fable across 32 different coding tools, ranging from full-lifecycle hosts (Claude Code, Google Antigravity, Grok) to IDE plugins (Cursor, Windsurf) and autonomous agents (Devin, Roo Code, Cline, OpenHands). Updating repository code does not automatically update user global configs unless installed.

### Correct Pattern
Always execute global installation and verify status:
```bash
bun ./bin/get-fable.js install all
bun ./bin/get-fable.js status --json-v1
```
Ensure each platform directory receives updated rules (`fable.md`, `fable5-mode.md`), canonical skills, and lifecycle hook dispatchers.

---

## L5 — Portable Repository State Template vs. Local Machine Binding

### Problem
When `.fable/state.json` is committed with a local machine path hash (`workspaceId`) and runtime schema (`schemaVersion: 3`), CI environments and downstream clones fail test suites (`Error: Fable state workspaceId does not match the current workspace`). In addition, `test/enterprise/repository-state-template.test.ts` strictly validates that tracked repository state remains workspace-neutral.

### Correct Pattern
Tracked `.fable/state.json` in git must always maintain the `schemaVersion: 1` portable template:
```json
{
  "schemaVersion": 1,
  "phase": "idle",
  "currentSkill": null,
  "failureStreak": 0,
  "substantial": false,
  "lastDecision": null,
  "evidence": []
}
```
At runtime, the harness transparently upgrades the state in memory and creates local transaction locks, but working tree commits and check gates must maintain the neutral template.

---

## L6 — Cross-Test Process Environment Isolation

### Problem
Test suites mutating process-wide variables (such as `process.env.CLAUDE_CONFIG_DIR` or `process.env.FABLE_CODEX_CONFIG_DIR`) without structured cleanup cause downstream test suites to look for configuration in stale, deleted temporary directories, producing flaky or cascading test failures on CI runners.

### Correct Pattern
Always wrap environment-mutating setup in `try ... finally` blocks and save/restore previous environment values explicitly:
```typescript
const previousClaude = process.env.CLAUDE_CONFIG_DIR;
try {
  process.env.CLAUDE_CONFIG_DIR = testDir;
  // execute test assertions
} finally {
  if (previousClaude === undefined) {
    delete process.env.CLAUDE_CONFIG_DIR;
  } else {
    process.env.CLAUDE_CONFIG_DIR = previousClaude;
  }
}
```

---

## L7 — Dual-Engine Packaging and NPM Registry Publication

### Problem
On systems where `npm` is aliased or shimmed to Bun (`bun pm`), `bun publish` packs artifacts and displays CLI summaries but may rely on different auth token conventions than upstream npm registry endpoints or fail to propagate immediate dist-tags when scoped package access policies differ.

### Correct Pattern
1. Generate and verify the distribution tarball using standard prepack validation:
   ```bash
   RAW_NPM=1 npm pack
   ```
2. Publish the verified tarball directly with explicit access parameters:
   ```bash
   RAW_NPM=1 npm publish get-fable-<version>.tgz --access public
   ```
3. Inspect and verify registry dist-tags immediately:
   ```bash
   npm info get-fable dist-tags --json
   ```
   Ensure `"latest": "<version>"` is active across the public registry.

