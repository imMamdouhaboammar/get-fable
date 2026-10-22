# How to Push to npm and GitHub

> **Repo split:** private engine room `imMamdouhaboammar/get-fable-core` → public distribution `imMamdouhaboammar/get-fable` → npm package `get-fable`

---

## Distribution boundary (hard rules)

| Destination | What goes there |
|---|---|
| **npm package** | `dist/` `bin/` `skills/` `schemas/` `prompts/` `assets/` `AGENTS.md` `README.md` `LICENSE` plugin dirs |
| **Public GitHub** (`get-fable`) | Same as npm + `docs/` `CHANGELOG.md` `ROADMAP.md` `.npmignore` — via `bun run export:public` only |
| **Private GitHub** (`get-fable-core`) | Everything — full source including `src/` `proto/` `crates/` `test/` `Failure-lessons/` |

**Never allowed in npm or public GitHub:**

```
src/   proto/   crates/   test/   cypress/   eval/
Failure-lessons/   docs/internal/   .planning/   .fable/   .agents/
AGENTS.md   (maintenance/private — agent rules file, not for consumers)
```

---

## Pre-flight checklist (run every time, in order)

```bash
# 1. Type check
bun run typecheck

# 2. Full test suite
bun test --timeout 90000

# 3. Production build
bun run build

# 4. Pack dry-run — inspect what will ship
bun pm pack --dry-run --ignore-scripts 2>&1 | tee /tmp/pack-preview.txt

# 5. Verify zero source leakage (must return 0 lines)
grep -E '^\s*(src|proto|crates)/' /tmp/pack-preview.txt && echo "❌ LEAK DETECTED — abort" || echo "✅ No source leakage"

# 6. Doctor
bun ./bin/get-fable.js doctor --json-v1
```

All six must pass before proceeding.

---

## Version bump

```bash
# Patch (bug fix): 1.15.1 → 1.15.2
bun pm version patch

# Minor (new feature): 1.15.1 → 1.16.0
bun pm version minor

# Major (breaking): 1.15.1 → 2.0.0
bun pm version major
```

This updates `package.json` and creates a git tag automatically.

---

## npm publish

```bash
RAW_NPM=1 npm publish --access public --ignore-scripts
```

- `RAW_NPM=1` — bypasses Bun's npm auto-corrector
- `--access public` — required for scoped or first-time publish
- `--ignore-scripts` — skips `prepack` (full test suite wired there; too slow; already ran manually above)

**Do NOT use `bun publish`** — it doesn't respect `--ignore-scripts` correctly and has behaved inconsistently.

### Verify live

```bash
npm view get-fable version          # should show new version
npm pack get-fable --dry-run        # re-download and inspect from registry
```

Registry CDN may lag 2–5 minutes. A `409 Conflict` on re-publish = version already staged (not a failure).

### Rollback (if something slips through)

```bash
# Deprecate a bad version (preferred — npm unpublish has a 72h window)
RAW_NPM=1 npm deprecate get-fable@<version> "DO NOT USE — source leakage"

# Hard unpublish (only within 72h and no dependents)
RAW_NPM=1 npm unpublish get-fable@<version>
```

---

## GitHub — public repo push

**Never push directly to `imMamdouhaboammar/get-fable`.** Always go through the export pipeline:

```bash
# Sync public cut from private engine room
bun run export:public
```

This is governed by `.fable-public-manifest.json`. It copies only whitelisted files. After the export:

```bash
# In the public repo working tree (separate checkout or worktree)
cd /path/to/get-fable-public
git add -A
git commit -m "release: vX.Y.Z"
git push origin main
```

What `export:public` copies: `dist/` `bin/` `skills/` `schemas/` `prompts/` `hooks/` `assets/` `templates/` `packs/` `registry/` `agents/` plugin dirs `docs/` (public only) `AGENTS.md` `README.md` `CHANGELOG.md` `LICENSE` `SKILL.md` `.npmignore`

What it **never** copies: `src/` `proto/` `crates/` `test/` `cypress/` `eval/` `Failure-lessons/` `.planning/` `.fable/` `.agents/`

### Verify the public repo is clean

```bash
# Must return 0 results
git -C /path/to/get-fable-public ls-files | grep -E '^(src|proto|crates|test|Failure-lessons)/'
```

---

## GitHub — private engine room push (normal dev flow)

```bash
git add -A
git commit -m "feat: <description>"
git push origin <branch>
# Then open PR on get-fable-core
```

No restrictions here — this is the full source repo.

---

## Full release checklist (copy-paste)

```
[ ] bun run typecheck — clean
[ ] bun test --timeout 90000 — all pass
[ ] bun run build — succeeds
[ ] bun pm pack --dry-run --ignore-scripts — no src/ or proto/ lines
[ ] bun ./bin/get-fable.js doctor --json-v1 — no errors
[ ] bun pm version patch|minor|major — package.json updated, tag created
[ ] RAW_NPM=1 npm publish --access public --ignore-scripts — 200 OK
[ ] npm view get-fable version — shows new version
[ ] bun run export:public — public repo synced
[ ] git push on public repo
[ ] git push on private repo + open PR
```

---

## Machine assertions (must exist in test suite)

`test/package-distribution.test.ts` must assert:

```ts
// src/ and proto/ must never appear in pack output
expect(packedFiles.filter(f => /^(src|proto)\//.test(f))).toHaveLength(0);

// dist/cli.js must be present
expect(packedFiles).toContain('dist/cli.js');
```

These tests are the machine enforcement of the distribution invariant. Documentation alone is not sufficient.

---

## Key invariants (from AGENTS.md)

- `package.json "files"` is the **primary whitelist** — `.npmignore` is secondary safety net
- `bun pm pack --dry-run` is mandatory before every publish — not optional
- `RAW_NPM=1` is mandatory — never drop it
- `--ignore-scripts` is mandatory — the `prepack` hook runs the full 226-file test suite
- Documenting an invariant ≠ enforcing it — machine assertions required
