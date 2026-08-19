# Release Verification Gates

## Mandatory Release Checklist
1. **Clean Worktree**: No untracked scratch files or unintended modifications.
2. **Fresh Verification**: Tests, typecheck, lint, build pass on the latest mutation generation.
3. **Changelog & Version Parity**: `package.json#version`, plugin manifests, and `CHANGELOG.md` aligned.
4. **Tarball Integrity**: Dry-run package packing (`npm pack --dry-run`) includes all required assets.
