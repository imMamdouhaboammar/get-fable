# Release Metadata Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make Homebrew distribution immutable and checksum-verified, make runtime/distribution version metadata derive from one canonical package version contract, and block releases when tag, formula, artifact, or manifest metadata disagree.

**Architecture:** Keep `package.json` as the canonical repository version. Homebrew points at the versioned GitHub Release source tarball and records the SHA-256 of those exact bytes. A shared release consistency checker validates every repository-owned version-bearing surface, while the DSH runtime reads package metadata instead of carrying an independent literal. Release packaging excludes `Formula/` from the Homebrew source tarball so the checksum written into the formula cannot change the bytes being checksummed.

**Tech Stack:** Bun 1.3+, TypeScript, Ruby Homebrew formula, GitHub Actions, Node crypto SHA-256

**Spec:** `docs/specs/updater-announcement-cli-engine-r2.md`, M7 and AC-R2-29..30

## Global Constraints

- `package.json` remains the canonical repository version.
- Homebrew must never use a mutable branch URL for a fixed version.
- Homebrew SHA-256 must describe the exact artifact referenced by the formula URL.
- Current immutable source is `get-fable-v1.5.1.tar.gz` from GitHub Release `v1.5.1`, whose GitHub asset digest is `sha256:7f00286f99bbb23bfaba99b915c194e57fbce0b78dd513e91084a6d0ef393d59`.
- Future Homebrew source tarballs must exclude `Formula/` to avoid a checksum self-reference cycle.
- Required version replacements must fail loudly when their expected old value is absent.
- Release checks must fail before npm publication if package, tag, formula, runtime, or required manifest metadata disagree.
- Existing updater, package, generated artifact, security, and machine-output behavior must remain unchanged.
- No release is published as part of Issue #51.

---

### Task 1: Lock the current Homebrew source contract

**Files:**
- Test: `test/release-consistency.test.ts`
- Modify: `Formula/get-fable.rb`

**Interfaces:**
- Consumes: canonical version `1.5.1` from `package.json` and the existing GitHub Release asset metadata.
- Produces: an immutable release URL plus exact `sha256` declaration that later consistency checks can parse.

- [ ] **Step 1: Write failing formula contract tests**

Assert that the formula:

```ts
expect(formulaUrl).toBe(
  `https://github.com/imMamdouhaboammar/get-fable/releases/download/v${packageVersion}/get-fable-v${packageVersion}.tar.gz`
);
expect(formulaVersion).toBe(packageVersion);
expect(formulaSha256).toMatch(/^[a-f0-9]{64}$/);
expect(formulaUrl).not.toContain('/heads/master');
```

Also assert the current checksum equals the known GitHub asset digest for `v1.5.1`.

- [ ] **Step 2: Verify the test is red on the current formula**

Run through GitHub Actions after the test-only commit. Expected failure: mutable `master.tar.gz` and missing `sha256`.

- [ ] **Step 3: Pin the formula to the immutable release asset**

Use:

```ruby
url "https://github.com/imMamdouhaboammar/get-fable/releases/download/v1.5.1/get-fable-v1.5.1.tar.gz"
version "1.5.1"
sha256 "7f00286f99bbb23bfaba99b915c194e57fbce0b78dd513e91084a6d0ef393d59"
```

Keep the existing install layout unchanged unless a test proves incompatibility.

- [ ] **Step 4: Verify formula syntax and contract**

Run `ruby -c Formula/get-fable.rb` and the focused Bun test in CI.

- [ ] **Step 5: Commit**

Commit formula implementation separately from its test commit.

---

### Task 2: Remove independent runtime version literals

**Files:**
- Create: `src/version.ts`
- Modify: `src/cli.ts`
- Modify: `src/dsh/api.ts`
- Test: `test/dsh-plugin.test.ts` or a focused version contract test

**Interfaces:**
- Produces: `getPackageVersion(): string` as the canonical runtime reader.
- Consumers: CLI version output and DSH `getStatus().version`.

- [ ] **Step 1: Add a failing test proving DSH status follows package metadata**

The assertion must compare DSH status to `getPackageVersion()` rather than to a duplicated literal.

- [ ] **Step 2: Add `src/version.ts`**

Read the root `package.json` relative to the installed module location, return its string version, and fail closed to `unknown` on unreadable/invalid metadata.

- [ ] **Step 3: Re-export the helper from `src/cli.ts` for compatibility**

Existing imports of `getPackageVersion` from `src/cli.ts` must continue working.

- [ ] **Step 4: Use the helper in DSH status**

Replace `version: '1.5.1'` with `version: getPackageVersion()`.

- [ ] **Step 5: Run focused and typecheck verification, then commit**

---

### Task 3: Make release asset packaging checksum-safe

**Files:**
- Modify: `scripts/package-release-assets.ts`
- Test: `test/release-consistency.test.ts`

**Interfaces:**
- Produces: `dist/release/get-fable-v<version>.tar.gz` whose content does not include `Formula/`.
- Consumer: Homebrew formula URL and checksum contract.

- [ ] **Step 1: Add a failing packaging contract test**

Assert the Homebrew tarball command excludes `.git`, `node_modules`, `dist`, and `Formula`, while retaining required install paths such as `bin`, `src`, and `completions` from repository root.

- [ ] **Step 2: Exclude `Formula` from the tarball**

Preserve the existing root-level archive layout so `libexec.install Dir["*"]` remains compatible.

- [ ] **Step 3: Keep release asset naming version-addressed**

The artifact must remain `get-fable-v${version}.tar.gz`.

- [ ] **Step 4: Run focused test and commit**

---

### Task 4: Make version bumping fail closed

**Files:**
- Modify: `scripts/bump-version.ts`
- Test: `test/version-bump.test.ts`

**Interfaces:**
- Consumes: explicit new version, current package version, and the release artifact packaging contract.
- Produces: repository metadata updated to one version plus a formula URL/checksum pair for the generated Homebrew source artifact.

- [ ] **Step 1: Add negative tests for absent expected replacements**

Use an exported pure helper against temporary files. An expected text replacement with zero matches must throw and must not log success.

- [ ] **Step 2: Preflight required replacements**

Required JSON files and text replacements must exist and contain the expected old version before success is reported.

- [ ] **Step 3: Update formula source deterministically**

Update both formula `version` and the versioned release asset URL. Do not retain a branch URL fallback.

- [ ] **Step 4: Generate or accept the checksum only for the exact release tarball**

The script must never reuse a checksum from an npm tarball, plugin zip, or a different GitHub archive.

- [ ] **Step 5: Verify negative fixtures and commit**

---

### Task 5: Add one deterministic release consistency gate

**Files:**
- Create: `scripts/check-release-consistency.ts`
- Modify: `package.json`
- Test: `test/release-consistency.test.ts`

**Interfaces:**
- Consumes: repository root, optional release tag, optional exact artifact path or explicit remote verification mode.
- Produces: exit 0 only when every required version-bearing surface agrees.

- [ ] **Step 1: Add failing mismatch fixtures**

Cover at minimum:

```text
package vs formula version mismatch
package vs formula URL version mismatch
missing or malformed formula SHA-256
package vs plugin/marketplace/pack metadata mismatch
release tag vs package mismatch
artifact SHA-256 vs formula mismatch
```

- [ ] **Step 2: Implement strict parsers**

Parse the formula and JSON metadata rather than using loose substring search. Report the exact file/field that disagrees.

- [ ] **Step 3: Register `check:release`**

Add it to `package.json` and include it in `bun run check` before build/publication.

- [ ] **Step 4: Support exact artifact verification**

When an artifact path is supplied, hash those bytes with SHA-256 and compare to the formula declaration. Remote release verification may download only the formula URL and must compare those exact bytes.

- [ ] **Step 5: Run positive and negative checks, then commit**

---

### Task 6: Gate release publication

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/github-release.yml` if required by final artifact flow
- Test: `test/ci-supply-chain.test.ts`

**Interfaces:**
- Consumes: release tag and the repository release consistency script.
- Produces: a publication path that cannot reach `npm publish` after a consistency failure.

- [ ] **Step 1: Add a failing workflow contract test**

Assert the release workflow invokes the repository consistency gate with the GitHub release tag before the publish step.

- [ ] **Step 2: Run the consistency gate before npm publication**

Retain OIDC trusted publishing and existing least-privilege permissions.

- [ ] **Step 3: Verify the exact Homebrew artifact when the release asset is available**

Use the formula URL, not a similarly named local or npm artifact.

- [ ] **Step 4: Commit workflow integration**

---

### Task 7: Document the release contract and run final proof

**Files:**
- Modify: `docs/UPDATE.md` or the repository release documentation
- Modify: `docs/learning/session-2026-08-28-skill-pack-svg-release.md` only if needed to correct obsolete instructions

- [ ] **Step 1: Document release order**

State the canonical version source, immutable asset naming, checksum requirement, formula exclusion from the Homebrew tarball, and consistency gate.

- [ ] **Step 2: Document recovery**

If URL/checksum/layout verification fails, regenerate or select the correct artifact and checksum it again. Never disable SHA verification or substitute another artifact's digest.

- [ ] **Step 3: Run full hosted verification**

Require fresh evidence for generated checks, `llms.txt`, typecheck, full Bun tests, coverage, build, CLI smoke, package inspection, Ruby syntax where available, security scanners, E2E, and external review.

- [ ] **Step 4: Open one PR for #51 and merge only with a green final head**

Use a merge commit to retain atomic history. Close #51 only after merge verification.
