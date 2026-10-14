---
title: "Universal Multi-Channel Distribution and Release Integrity"
date: "2026-09-15"
category: "distribution-and-ci-isolation"
module: "release-engineering"
problem_type: "workflow_issue"
component: "release-pipeline"
severity: "medium"
applies_when:
  - "Publishing multi-platform AI agent lifecycle frameworks across npm, git remotes, and local host directories"
  - "Executing prepack verification gates in environments with aliased package managers"
tags:
  - "npm-publishing"
  - "multi-channel-distribution"
  - "ci-isolation"
  - "portable-state"
---

# Universal Multi-Channel Distribution and Release Integrity

## Context
Releasing major version updates (\`get-fable\` v1.9.0) involves distributing assets across 5 distinct tiers:
1. Public package registry (\`registry.npmjs.org/get-fable\`)
2. Git remote repositories (\`origin\` and local quality gate \`no-mistakes\`)
3. GitHub Releases with tagged release notes and provenance hashes
4. Local agent platform directories across 32 supported AI development tools
5. Ephemeral CI runners executing prepack and behavioral verification

During release engineering, three distinct failure vectors can emerge:
- CI runners failing due to machine-specific \`workspaceId\` hashes in committed \`.fable/state.json\` files.
- Test suites leaking process environment modifications (\`CLAUDE_CONFIG_DIR\`) to downstream test files.
- Package manager shims intercepting \`npm publish\` and masking registry authentication or dist-tag propagation.

## Guidance

### 1. Maintain a Workspace-Neutral State Template in Git
The committed \`.fable/state.json\` must always retain the portable \`schemaVersion: 1\` template:
\`\`\`json
{
  "schemaVersion": 1,
  "phase": "idle",
  "currentSkill": null,
  "failureStreak": 0,
  "substantial": false,
  "lastDecision": null,
  "evidence": []
}
\`\`\`
Local runtime executions will upgrade the state to \`schemaVersion: 3\` and bind the canonical path hash (\`workspaceId\`), but prior to committing or packing, the template must be preserved so that fresh clones and CI runners do not encounter workspace ID mismatches.

### 2. Isolate Test Process Environments
When testing tool installation or host directory configuration, always isolate process environment mutations inside \`try ... finally\` blocks:
\`\`\`typescript
const previousClaude = process.env.CLAUDE_CONFIG_DIR;
try {
  process.env.CLAUDE_CONFIG_DIR = isolatedDir;
  // assertions
} finally {
  if (previousClaude === undefined) {
    delete process.env.CLAUDE_CONFIG_DIR;
  } else {
    process.env.CLAUDE_CONFIG_DIR = previousClaude;
  }
}
\`\`\`

### 3. Dual-Stage Packaging and Direct Tarball Publishing
To prevent slow prepack verification loops (814 tests taking ~3-4 minutes) from repeating during retries or registry authentication checks:
1. Package and verify first:
   \`\`\`bash
   RAW_NPM=1 npm pack
   \`\`\`
2. Publish the verified tarball directly:
   \`\`\`bash
   RAW_NPM=1 npm publish get-fable-<version>.tgz --access public
   \`\`\`
3. Immediately assert registry dist-tags:
   \`\`\`bash
   npm info get-fable dist-tags --json
   \`\`\`

### 4. Coordinated Remote Push Sequence
Always execute the push pipeline in strict dependency order:
\`\`\`bash
# 1. Local quality gate proxy
git push no-mistakes master --tags

# 2. Public upstream remote
git push origin master --tags

# 3. Publish draft GitHub Release
gh release edit v1.9.0 --title "v1.9.0 - ..." --notes-file RELEASE_NOTES.md --draft=false
\`\`\`

## Why This Matters
- Prevents brittle CI pipeline failures caused by environment cross-talk.
- Guarantees that all 32 agent platforms, the npm registry, and git remotes are aligned to the exact same release revision.
- Enforces the \`no-mistakes\` quality gate locally before changes propagate publicly.

## When to Apply
- Whenever preparing, building, or publishing new releases of \`get-fable\`.
- When diagnosing CI failures involving \`workspaceId\` mismatches or missing directories in temp paths.
