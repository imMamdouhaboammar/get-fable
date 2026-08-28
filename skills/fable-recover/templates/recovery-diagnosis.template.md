# Diagnostic Recovery & Root Cause Isolation

## 1. Symptom & Error Signature
- **Failing Command**: [e.g. bun test test/auth.test.ts]
- **Error Output**: [Exact error message and stack trace]
- **Failure Streak**: [N consecutive failures]

## 2. Attribution Ladder Verification
- [x] Level 1 (Environment): Bun v1.3.14 verified; no missing binaries.
- [x] Level 2 (Workspace/Git): Clean git branch; no untracked file collisions.
- [x] Level 3 (Build/Cache): Ran clean build; isolated stale artifact issue.
- [ ] Level 4 (Test Harness): Mock was returning stale schema shape.
- [ ] Level 5 (Application Code): Code logic was correct; harness was broken.

## 3. Corrective Action & Falsification
- **Identified Root Cause**: Test fixture was not updated to reflect new token shape.
- **Bounded Fix**: Update mock payload in `test/fixtures/token.json`.
- **Falsification Proof**: `bun test` passed cleanly after fixture update.
