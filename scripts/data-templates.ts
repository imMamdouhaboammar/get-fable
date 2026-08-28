export const SKILL_TEMPLATES: Record<string, Record<string, string>> = {
  'fable-artifact': {
    'technical-proposal.template.md': `# Technical Proposal: [Title]

## Executive Summary
[Concise 2-3 sentence overview of the proposal, problem addressed, and expected technical outcome]

## Problem Statement & Context
- **Current State**: [Describe current architecture and pain points]
- **Target Goal**: [Describe desired capabilities and success metrics]

## Proposed Architecture
\`\`\`mermaid
graph TD
    Client["Client Interface"] --> Gateway["API Gateway"]
    Gateway --> Service["Core Service"]
    Service --> Store[("Persistent Storage")]
\`\`\`

## Key Architectural Decisions & Trade-Offs
| Decision | Selected Approach | Trade-Offs & Rationale |
|---|---|---|
| Storage Layer | [e.g. PostgreSQL] | High consistency and ACID guarantees vs schema rigidity |
| Authentication | [e.g. OAuth 2.1 PKCE] | Secure delegated authorization without bearer token leakage |

## Implementation Plan & Milestones
- [ ] Milestone 1: [Core schema and data migrations]
- [ ] Milestone 2: [Service implementation and unit testing]
- [ ] Milestone 3: [End-to-end integration and release gate validation]
`
  },
  'fable-config': {
    'harness-settings.template.json': `{
  "schemaVersion": 1,
  "harness": "get-fable",
  "permissions": {
    "allow": [
      "git status",
      "git diff",
      "bun test",
      "tsc --noEmit",
      "get-fable doctor",
      "get-fable lint"
    ],
    "deny": [
      "rm -rf /",
      "sudo",
      "chmod 777"
    ]
  },
  "environment": {
    "FABLE_TELEMETRY": "false",
    "NODE_ENV": "development"
  },
  "hooks": {
    "enabled": true,
    "registryPath": "./hooks/hooks.json"
  }
}
`
  },
  'fable-cowork': {
    'cowork-plan.template.md': `# Autonomous Cowork Execution Plan

## 1. Objective & Boundaries
- **Task Goal**: [Concise statement of autonomous deliverable]
- **Permitted File Scope**:
  - \`src/path/to/target1.ts\`
  - \`test/path/to/target1.test.ts\`
- **Zero-Touch Boundaries**: All configuration files, database credentials, and external manifests.

## 2. Execution Batches
1. **Batch 1 (Scaffolding & Red Test)**: Create regression test fixture and verify honest failure.
2. **Batch 2 (Core Implementation)**: Implement minimal logic to satisfy the test.
3. **Batch 3 (Verification & Cleanup)**: Run full test suite and clean up temporary fixtures.

## 3. Outcome Deliverable Contract
- Command to verify: \`bun test test/path/to/target1.test.ts\`
- Invariant check: \`git diff --stat\` matches permitted file scope.
`
  },
  'fable-dataviz': {
    'svg-chart.template.md': `# SVG Chart Template

\`\`\`xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" role="img" aria-label="Performance Benchmark Chart">
  <style>
    .title { font-family: system-ui, sans-serif; font-size: 18px; font-weight: 600; fill: #1F2937; }
    .axis { stroke: #9CA3AF; stroke-width: 1.5; }
    .grid { stroke: #E5E7EB; stroke-width: 1; stroke-dasharray: 4,4; }
    .label { font-family: system-ui, sans-serif; font-size: 12px; fill: #4B5563; }
    .bar-a { fill: #10B981; }
    .bar-b { fill: #3B82F6; }
    @media (prefers-color-scheme: dark) {
      .title { fill: #F9FAFB; }
      .axis { stroke: #4B5563; }
      .grid { stroke: #374151; }
      .label { fill: #9CA3AF; }
    }
  </style>
  <title>Benchmark Results</title>
  <desc>Comparison of throughput across optimization iterations</desc>
  <text x="40" y="35" class="title">Throughput Benchmark (ops/sec)</text>
  <line x1="60" y1="340" x2="740" y2="340" class="axis" />
  <line x1="60" y1="60" x2="60" y2="340" class="axis" />
  <line x1="60" y1="200" x2="740" y2="200" class="grid" />
  <rect x="140" y="120" width="80" height="220" rx="4" class="bar-a" />
  <text x="180" y="360" text-anchor="middle" class="label">Baseline</text>
  <rect x="360" y="80" width="80" height="260" rx="4" class="bar-b" />
  <text x="400" y="360" text-anchor="middle" class="label">Optimized</text>
</svg>
\`\`\`
`
  },
  'fable-discover': {
    'discovery-packet.template.md': `# Discovery Evidence Packet: [Subsystem Name]

## Load-Bearing Questions
1. [Question 1: e.g. Where is dynamic dispatch registered?] -> [Status: Answered / Unresolved]
2. [Question 2: e.g. Which process commits database transactions?] -> [Status: Answered / Unresolved]

## Measured Topology & Entry Points
- **Package Manifest**: \`package.json\` (version: X, engine: Y)
- **Primary Binary / Entry**: \`src/index.ts\` -> \`src/cli.ts\`
- **Build / Runtime Mode**: Direct execution via Bun (no transpilation required)

## Execution Path Trace
\`\`\`
1. [CLI Request] -> src/cli.ts:runCommand() [measured]
2. [Middleware] -> src/core/auth.ts:validateSession() [measured]
3. [Service Dispatch] -> src/services/worker.ts:dispatch() [measured]
\`\`\`

## Unresolved Questions & Next Action
- Unresolved: None. All load-bearing facts are established.
- Recommended Next Skill: \`fable-plan\`
`
  },
  'fable-eval': {
    'eval-benchmark-report.template.md': `# Benchmark Evaluation Report: [Skill/Prompt Name]

## Executive Summary
- **Target Component**: [e.g. fable-plan system prompt]
- **Baseline Version**: v1.2.0 (Pass Rate: 82.0%)
- **Candidate Version**: v1.3.0 (Pass Rate: 94.0%)
- **Verdict**: [ACCEPTED / REJECTED]

## Evaluation Results Matrix
| Scenario Category | Total Cases | Baseline Passed | Candidate Passed | Delta |
|---|---|---|---|---|
| Positive Triggers | 10 | 9 (90%) | 10 (100%) | +10% |
| Negative Rejections | 10 | 8 (80%) | 10 (100%) | +20% |
| Held-Out Stress Cases | 10 | 8 (80%) | 9 (90%) | +10% |
| **Total** | **30** | **25 (83.3%)** | **29 (96.7%)** | **+13.4%** |

## Regression Gate Check
- [x] Zero Held-Out Regressions: All baseline-passing held-out cases remained passing.
- [x] Execution Latency: Average latency within budget (1.2s vs 1.4s baseline).
`
  },
  'fable-execute': {
    'execution-receipt.template.md': `# Work Card Execution Receipt

## Card Reference
- **Card ID**: [e.g. CARD-04]
- **Title**: [e.g. Implement JWT Verification Middleware]
- **Status**: [COMPLETED / IN_PROGRESS]

## Touched Files & Modifications
- [x] \`src/middleware/jwt-verifier.ts\` (New file: Implemented token parsing and signature verification)
- [x] \`test/middleware/jwt-verifier.test.ts\` (New file: Added unit tests with test vectors)

## Invariant & Acceptance Verification
- **Acceptance Command**: \`bun test test/middleware/jwt-verifier.test.ts\`
- **Result**: PASSED (6 tests passed, 0 failures in 12ms)
- **Mutation Generation**: Advanced to gen 4.
`
  },
  'fable-loop': {
    'loop-config.template.json': `{
  "taskName": "ci-build-monitor",
  "maxDurationSeconds": 600,
  "maxIterations": 30,
  "baseIntervalMs": 2000,
  "maxIntervalMs": 30000,
  "backoffFactor": 1.5,
  "exitConditions": {
    "successStatus": ["SUCCESS", "PASSED"],
    "failureStatus": ["FAILED", "CANCELLED", "TIMED_OUT"]
  }
}
`
  },
  'fable-recover': {
    'recovery-diagnosis.template.md': `# Diagnostic Recovery & Root Cause Isolation

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
- **Bounded Fix**: Update mock payload in \`test/fixtures/token.json\`.
- **Falsification Proof**: \`bun test\` passed cleanly after fixture update.
`
  },
  'fable-release': {
    'release-checklist.template.md': `# Release Readiness Checklist & Certification

## Release Metadata
- **Target Version**: v[1.3.0]
- **Release Branch**: master
- **Commit SHA**: [Full 40-character git commit hash]

## Gate Verification Matrix
- [x] **Working Tree Clean**: Zero uncommitted files, zero untracked artifacts.
- [x] **Static Typecheck**: \`bun run typecheck\` passed with zero errors.
- [x] **Test Suite**: \`bun test\` passed (100% green across all test files).
- [x] **Production Build**: \`bun run build\` produced clean bundle in \`dist/\`.
- [x] **Lint & Health Audit**: \`get-fable lint\` and \`get-fable doctor --json\` report zero errors.
- [x] **Changelog Updated**: \`CHANGELOG.md\` documented with version release notes.
- [x] **Package Dry-Run**: \`npm pack --dry-run\` verified expected manifest file inclusion.
`
  },
  'fable-research': {
    'research-memo.template.md': `# Technical Research Memo: [Topic / SDK Name]

## Executive Summary
[Concise synthesis of research findings, version compatibility, and architectural recommendations]

## Primary Source Grounding
| Source | Version Target | Authoritative URL / Reference | Key Finding |
|---|---|---|---|
| Official Docs | v4.2.0 | https://example.com/docs | Method signature changed from \`auth.verify()\` to \`auth.verifyToken()\` |
| GitHub Changelog | v4.0.0 | https://github.com/org/repo/releases/tag/v4.0.0 | Deprecated callback API removed in favor of Promises |

## API Contract & Code Example
\`\`\`typescript
import { createClient } from 'example-sdk';

const client = createClient({
  apiKey: process.env.EXAMPLE_API_KEY,
  apiVersion: '2026-08-01'
});

const response = await client.verifyToken({ token: 'raw_jwt_token' });
\`\`\`

## Architectural Implications
- Update all call sites in \`src/auth/\` to use the new \`verifyToken()\` promise interface.
- Add regression test for token expiration handling.
`
  },
  'fable-review': {
    'review-finding.template.md': `# Code Review Finding: [Finding Title]

## Finding Summary
- **Location**: \`src/path/to/file.ts:L45-L60\`
- **Severity**: [BLOCKING / WARNING / SUGGESTION]
- **Category**: [Correctness / Security / Architecture / Performance]

## Description & Evidence
[Detailed explanation of the issue citing specific line numbers, potential race conditions, or unhandled edge cases]

## Recommended Remediation
\`\`\`diff
- const token = request.headers['authorization'];
- const user = decodeTokenUnsafe(token);
+ const authHeader = request.headers['authorization'];
+ if (!authHeader || !authHeader.startsWith('Bearer ')) {
+   return response.status(401).json({ error: 'Unauthorized' });
+ }
+ const user = await verifyTokenCryptographically(authHeader.slice(7));
\`\`\`
`
  },
  'fable-run': {
    'runtime-smoke-probe.template.md': `# Runtime Smoke Verification Probe

## Target Application Specification
- **Process Type**: HTTP Web Server & API
- **Start Command**: \`bun ./bin/get-fable.js serve:web --port 8085\`
- **Readiness URL**: \`http://127.0.0.1:8085/health\`
- **Readiness Criteria**: HTTP Status 200 OK with JSON \`{"ok": true}\`

## Execution & Teardown Log
1. [Spawn Process]: Process spawned with PID [12345]
2. [Probe Attempt 1]: Connection refused (waiting 500ms)
3. [Probe Attempt 2]: HTTP 200 OK received in 512ms
4. [Smoke Test]: Executed GET /api/v1/status -> Received valid payload
5. [Teardown]: Sent SIGTERM to PID [12345]; process exited cleanly (code 0)
`
  },
  'fable-security': {
    'security-finding.template.md': `# Security Advisory Finding: [Vulnerability Name]

## Advisory Metadata
- **Severity**: [CRITICAL / HIGH / MEDIUM / LOW]
- **CWE / Category**: [e.g. CWE-89: SQL Injection / Broken Access Control]
- **Affected File**: \`src/api/routes.ts:L112\`

## Vulnerability Description & Exploit Scenario
[Describe how an attacker could exploit the issue, trust boundaries breached, and data impact]

## Mitigated Implementation
\`\`\`typescript
// Secure parameterized query replacing raw string concatenation
const result = await db.query(
  'SELECT id, email, role FROM users WHERE organization_id = $1 AND id = $2',
  [orgId, userId]
);
\`\`\`
`
  },
  'fable-simplify': {
    'simplification-plan.template.md': `# Code Simplification & Refactoring Plan

## Refactoring Scope
- **Target File**: \`src/services/data-processor.ts\`
- **Target Function**: \`processBatchRecords()\`
- **Current Cyclomatic Complexity**: 18
- **Target Cyclomatic Complexity**: <= 6

## Planned Transformations
1. Invert nested conditionals into top-level guard clauses.
2. Extract low-level record validation into \`validateRecordPayload()\`.
3. Replace manual for-loops with clear typed functional transformations.

## Verification Gate
- [x] All existing unit tests pass before refactoring (\`bun test test/data-processor.test.ts\`).
- [x] Zero changes to public export signatures or return types.
- [x] All unit tests pass after refactoring.
`
  },
  'fable-simulator': {
    'oracle-contract.template.md': `# Independent Oracle Verification Contract

## 1. Production Component Under Test
- **Module**: \`src/algorithms/tree-balancer.ts\`
- **Function**: \`balanceRedBlackTree(root: Node): Node\`

## 2. Independent Reference Oracle
- **Model**: Mathematical immutable balanced reference model (\`test/oracles/reference-tree.ts\`)
- **Properties Checked**:
  1. Every node is either red or black.
  2. Root is always black.
  3. No two adjacent red nodes.
  4. Every path from root to leaf contains equal black nodes.

## 3. Differential Test Execution
- Command: \`bun test test/simulator/tree-oracle.test.ts\`
- Iterations: 1,000 randomized tree mutations.
- Verdict: PASSED (Zero divergence observed between production and oracle).
`
  },
  'fable-spark': {
    'spark-decision.template.md': `# Spark Situational Awareness Calculation

## 1. Current Workspace Inputs
- **State Phase**: [idle / executing / verifying]
- **Mutation Generation**: [N]
- **Verified Generation**: [M]
- **Failure Streak**: [K]
- **Active Card**: [Card ID or null]

## 2. Micro-Policy Evaluation
- **Condition Detected**: Mutation occurred (Gen N > Gen M) without subsequent verification.
- **Confidence Score**: 0.92 (Threshold: >= 0.70)
- **Reason Code**: \`post-mutation-verify\`

## 3. Predicted Next Action
- **Suggestion**: \`get-fable verify\`
- **Silent Flag**: \`false\`
`
  },
  'fable-tdd': {
    'tdd-cycle.template.md': `# TDD Execution Cycle Log

## Feature / Bug Description
[Concise description of the behavior change or bug fix being implemented]

## Phase 1: RED (Failing Test)
- **Test File**: \`test/auth/token-expiry.test.ts\`
- **Observed Failure Output**:
  \`\`\`text
  error: expect(received).toBe(expected)
  Expected: false
  Received: true (Expired token was accepted)
  \`\`\`

## Phase 2: GREEN (Minimal Implementation)
- **Modified File**: \`src/auth/token.ts\`
- **Diff Summary**: Added \`isExpired(token)\` timestamp comparison.
- **Observed Pass Output**: \`1 pass, 0 fail (4.2ms)\`

## Phase 3: REFACTOR (Cleanup)
- Extracted \`getCurrentTimestampSeconds()\` helper for clean mocking.
- Verified test suite remains green.
`
  },
  'fable-verify': {
    'verification-evidence.template.md': `# Verification Evidence Record

## Task Context
- **Workspace ID**: [workspace-hash]
- **Mutation Generation**: [N]
- **Timestamp**: [ISO 8601 Timestamp]

## Automated Gate Receipts
| Gate Type | Executed Command | Exit Code | Duration | Verdict |
|---|---|---|---|---|
| Typecheck | \`tsc --noEmit\` | 0 | 1.8s | PASS |
| Unit Tests | \`bun test\` | 0 | 4.2s | PASS |
| Build Check | \`bun run build\` | 0 | 2.1s | PASS |
| Lint Check | \`get-fable lint\` | 0 | 0.4s | PASS |

## Final Falsification Verdict
- **Result**: ALL GATES PASSED (Evidence generation matches current mutation generation).
- **Completion Permitted**: YES.
`
  },
  'get-fable': {
    'lifecycle-state.template.json': `{
  "schemaVersion": 3,
  "stateRevision": 1,
  "workspaceId": "neutral-template-id",
  "phase": "idle",
  "currentSkill": null,
  "failureStreak": 0,
  "substantial": true,
  "mutationGeneration": 1,
  "verifiedGeneration": 1,
  "activeCard": null,
  "lastDecision": null,
  "evidence": [
    {
      "kind": "test",
      "command": "bun test",
      "generation": 1,
      "passed": true,
      "details": "Initial baseline verified",
      "timestamp": "2026-08-28T00:00:00.000Z"
    }
  ],
  "updatedAt": "2026-08-28T00:00:00.000Z"
}
`
  }
};
