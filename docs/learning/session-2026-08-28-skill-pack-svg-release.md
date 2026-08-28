# Session Learnings: Skill Pack Deepening, SVG Logos & v1.4.0 Release

**Session date**: 2026-08-28  
**Scope**: Skill pack authoring, multi-platform install guide, Claude/Codex plugin upgrades, official SVG logo sourcing, README professionalism, npm/GitHub release automation

---

## L1 — Official logo sourcing: probe the primary source first, then fall back to CDNs

### Problem
When adding agent/IDE logos to docs and HTML, the instinct was to reach for a CDN like simple-icons or lobehub immediately.
This led to silently wrong logos (e.g. a placeholder SVG used for OpenCode, a wrong icon for Kiro) until the user caught them visually.

### Correct Pattern
1. Identify the official brand asset from the product's own domain or GitHub repo first:
   - Check `<product>.dev/icon.svg` or `<product>.com/logo.svg`.
   - Check the product's GitHub repo under `packages/ui/src/assets/favicon/` or `public/`.
2. Only fall back to `@lobehub/icons` static SVGs or `simple-icons` CDN if the official source is unavailable.
3. Always verify with a quick `HEAD` or `GET` before embedding.

### Verified Working URLs (as of 2026-08-28)
| Agent | Working URL |
|---|---|
| Kiro | `https://kiro.dev/icon.svg` |
| OpenCode | `https://raw.githubusercontent.com/sst/opencode/master/packages/ui/src/assets/favicon/favicon.svg` |
| VS Code | `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/visualstudiocode.svg` |
| Pi | lobehub `pi.svg` (patch `width="1em"` → `width="24"`) |

### Gotcha
- simple-icons raw GitHub (`develop`/`master` branches) often returns 404 for individual icon paths. Use the jsdelivr CDN npm mirror instead.
- lobehub `pi.svg` ships with `width="1em"` which renders tiny in a table `<img>` tag — patch to `width="24" height="24"`.

---

## L2 — Icon-in-table pattern: merge logo inline with name, never a separate column

### Problem
When the user asked to "add icons", a separate **Icon** column was added to the agent table. This was literal but wrong — it made the table wider and less readable with an unnecessary column header.

### Correct Pattern
```html
| <img src="assets/logos/claude-color.svg" width="20" height="20" alt="" /> **Claude Code** | … |
```
- The `<img>` tag goes *inside* the name cell, immediately before the bold name.
- `alt=""` (empty) because the text already provides the label — screen readers skip decorative icons.
- Each agent gets its **own row** — never merge "VS Code & Windsurf" into one row.

### Rule
> One agent per row. Logo merged with name. No `Icon` column ever.

---

## L3 — state.json must stay at schemaVersion 1 in git; tests mutate it

### Problem
`bun test` triggers `validateFableState()` in `src/core/state.ts`, which upgrades `.fable/state.json` to schema v3 and writes `workspaceId` bound to the local path.
If this file is committed mid-session, the `repository-state-template.test.ts` fails on other machines because they read a state already bound to a different workspace path.

### Correct Pattern
1. Before any `npm publish` or `bun run check`, restore state.json:
   ```bash
   git checkout -- .fable/state.json
   ```
2. The test must construct its fixture independently, not read the disk file as-is:
   ```typescript
   const raw = JSON.parse(fs.readFileSync('.fable/state.json', 'utf8'));
   const unbound = { ...raw, schemaVersion: 1, workspaceId: undefined };
   // assert migration from unbound
   ```
3. Add `.fable/state.json` to `.gitignore` eventually (or keep the workaround above per-publish).

---

## L4 — Version bump automation: one script, all 30+ reference points

### Problem
Bumping version from `1.3.0` to `1.4.0` required touching: `package.json`, `CHANGELOG.md`, `Formula/get-fable.rb`, all 10 host plugin manifests × 2 JSON files, 8 skill pack manifests, 2 test fixture strings, and `SKILL.md` frontmatter. Doing this by hand is error-prone and slow.

### Correct Pattern
Use `scripts/bump-version.ts` (created this session):
```bash
bun scripts/bump-version.ts 1.5.0
```
It does a regex replace of the old semver string across all tracked files and prints a diff summary.
Always follow with `bun run check` to confirm no reference was missed.

---

## L5 — README professionalism: no dev notes, no self-deprecating checklist language

### Problem
The README included the sentence:
> "The original Skills were useful, but too many of them were still basically compact checklists."

This is internal dev commentary masquerading as product copy. It signals immaturity to external readers and tells them the previous version was bad without helping them.

### Rule
> Public READMEs describe what the product does and why it matters. Any sentence that starts with "The original…was bad" or sounds like a dev retrospective must be removed before release.

### Replacement Pattern
Replace self-deprecating sentences with architectural bullet lists that describe what the V2 capability *does*:
```markdown
- **Activation boundaries**: Exact criteria for when to activate, refuse, or defer;
- **Staged execution**: Verifiable, step-by-step evidence protocol with red/green gates;
```

---

## L6 — npm publish prepack gate: `bun run check` must pass cleanly before tag

### Problem
`npm publish` triggers the `prepack` script which runs `bun run check` (typecheck + test + build + catalog check). If the working tree is dirty or state.json is mutated, the publish fails mid-flight.

### Correct Publish Sequence
```bash
git checkout -- .fable/state.json   # reset state to schemaVersion 1
bun run check                        # verify all 314 tests pass
git tag v1.4.0
git push origin v1.4.0
npm publish                          # prepack re-runs check; must pass
```

### Verification
```bash
npm view get-fable version           # confirms published version
```

---

## L7 — Skill authoring: the `fable-` prefix namespace is reserved for canonical lifecycle skills

### Observation
All 25 canonical skills use the `fable-` prefix. User-authored or repo-local adapter skills should NOT use this prefix to avoid future namespace collisions with official pack upgrades.

### Pattern
- Canonical: `fable-tdd`, `fable-verify`, `fable-recover`, etc.
- Repo-local adapters: `.agents/skills/get-fable/SKILL.md` — uses `get-fable` name, not a `fable-` name.
- Custom project skills: use `<project>-<purpose>` naming.

---

## L8 — Skill depth V2: four-part description formula for YAML frontmatter

### Pattern
All V2 skill descriptions follow:
```
[Action verb] [primary capability] [key modifiers/scope]. Use when [activation triggers]. Do NOT use when [exclusion criteria].
```

Example:
```yaml
description: >
  Orchestrate software engineering workflows across the canonical get-fable coding lifecycle
  with deterministic routing and evidence precedence. Use when starting a complex coding task,
  navigating lifecycle phases, resuming work with durable .fable state, or routing between
  research, planning, testing, verification, and recovery. Do NOT use when an individual
  specialist skill already has clear isolated ownership of a bounded subtask.
```

This pattern improves skill routing accuracy because the agent router can match activation conditions without needing to load the full SKILL.md body.

---

## L9 — Homebrew formula must reference the exact GitHub tarball for the tagged release

### Problem
When bumping version in `Formula/get-fable.rb`, the `sha256` must match the tarball of the new GitHub release, not the npm tarball. These are different artifacts.

### Pattern
```ruby
url "https://github.com/imMamdouhaboammar/get-fable/archive/refs/tags/v1.4.0.tar.gz"
sha256 "<computed-after-tag-push>"
```
Run `curl -sL <url> | sha256sum` after pushing the tag to compute the correct hash before committing the Formula.

---

## L10 — Parallel subagent delegation: require disjoint file ownership before dispatch

### Observation
During icon integration and plugin upgrades, multiple edits touched adjacent files (plugin manifests, README, site HTML) that shared structural patterns. Dispatching parallel subagents for these without explicit ownership contracts would have caused silent merge conflicts.

### Pattern
Before delegating parallel work, confirm:
1. No two workers touch the same file.
2. No two workers modify the same JSON schema field (even in different files) that could conflict on merge.
3. Only delegate when the acceptance criteria for each card can be verified independently.

---

*These learnings are part of the Compound Engineering loop. Codify → reuse → evolve.*
