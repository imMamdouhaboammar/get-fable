# Skills Architecture & Manifest Lifecycle Failure Lessons

## Non-Canonical Artifact Infiltration in Skills Root

### Context
Repository root `skills/` directory across all 32 supported AI coding agent platforms (Claude Code, Antigravity, Grok, Codex, Cursor, etc.).

### What happened
Standalone git repositories and zip archives (`fable-init/`, `fable-tend/`, `fable-toward.zip`, `Fable-wise/`) were placed directly inside the `skills/` directory.

### Observable symptom
```text
{"id":"plugin-skills-root","status":"ERROR","message":"Invalid direct skills/ entries: fable-toward.zip, fable-init/, Fable-wise.zip, fable-tend/, fable-council/, Fable-wise/, fable-method/, fable-skills/"}
Doctor check failed: report.ok was false.
```

### Impact
Broke `get-fable doctor` validation, corrupted OpenAI and Claude Code plugin manifests, and caused automated test suite failures in `test/doctor-evidence.test.ts`.

### Incorrect assumption
Assumed that `skills/` could be used as a loose staging workspace for miscellaneous or unzipped tool projects without affecting skill discovery.

### Root cause
**Status**: Confirmed

The `plugin-skills-root` validator and host installer scan every direct child directory of `skills/` and require each entry to contain a valid `SKILL.md` and `skill.package.json`. Extraneous directories without `SKILL.md` violate the host manifest schema and break marketplace generation.

### Why the architecture allowed it
The filesystem allowed arbitrary directories to be created or unzipped into `skills/` without pre-commit filesystem gating or directory isolation.

### Fix
Moved non-canonical sub-projects to the workspace root's parent directory (`../`), preserving only canonical skills in `skills/`.

### Verification
Ran `bun ./bin/get-fable.js doctor --json-v1` and confirmed `plugin-skills-root` returned `PASS`:
```json
{"id":"plugin-skills-root","status":"PASS","message":"Every direct skills/ child is an importable skill directory"}
```

### Prevention rule
> [!IMPORTANT]
> **Invariant**: Every direct child of `skills/` must be an importable canonical skill directory containing `SKILL.md` and a valid `skill.package.json` manifest. Never stage raw archives, git repos, or temporary directories inside `skills/`.

### Reusable lesson
Monorepos and plugin marketplaces must enforce strict boundary validation on capability root directories. External staging or sub-repos must reside in designated scratch or parent directories.

### Related code
- `src/core/doctor.ts` (function `checkPluginSkillsRoot`)
- `skills/get-fable/registry.json`

### Related tests
- `test/doctor-evidence.test.ts`
- `test/plugin.test.ts`

### Related lessons
- Cross-referenced in [`lessons-index.md`](./lessons-index.md)

### Status
Resolved

---

## Subtitle Infiltration in Markdown AST Section Headings

### Context
Deep Playbook V2 authoring validation in `src/fable-lint.ts`.

### What happened
A skill author added a subtitle directly onto an H2 heading line (e.g. `## Mission: Convert This Session Into Durable Project Learnings`).

### Observable symptom
```text
⚠ Package lint: Skill fable-learning: missing required authoring section "## Mission"
```
Lint failed to recognize the skill as Deep Playbook V2, falling back to legacy checks and triggering 9 false-positive warnings.

### Impact
Prevented lifecycle linting from certifying skills and created false failures during CI prepack checks.

### Incorrect assumption
Assumed that markdown linter regexes parse headings flexibly with arbitrary subtitles following colons or dashes.

### Root cause
**Status**: Confirmed

`src/fable-lint.ts` extracts headings via `/^##\s+(.+?)\s*$/` and performs exact equality checks against `Mission`, `Invariants`, and `Anti-Patterns` to distinguish Deep Playbook V2 skills from legacy skills.

### Why the architecture allowed it
The regex parser did not strip punctuation or subtitle phrases after colons when identifying section kinds.

### Fix
Separated H2 section titles from subtitles: kept clean H2 `## Mission` and placed descriptive subtitles in H3 (`### ...`).

### Verification
Ran `bun ./bin/get-fable.js lint` and verified clean output with 0 warnings:
```text
✔ Fable lint passed! State, cards, packages, acceptance, and evidence are consistent.
```

### Prevention rule
> [!IMPORTANT]
> **Invariant**: Canonical skill authoring headings must use exact standard H2 titles (`## Mission`, `## Protocol`, `## Invariants`) without colons or inline subtitles to guarantee deterministic AST parsing.

### Reusable lesson
Machine-read documentation contracts must use canonical invariant headings. Descriptive text belongs in subheadings or body copy, not in AST-matched anchors.

### Related code
- `src/fable-lint.ts`
- `skills/fable-learning/SKILL.md`

### Related tests
- `test/fable-lint.test.ts`

### Related lessons
- Cross-referenced in [`lessons-index.md`](./lessons-index.md)

### Status
Resolved
