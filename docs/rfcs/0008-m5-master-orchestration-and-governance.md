# RFC 0008: Get-Fable M5 Enterprise Certification & Master Agent Orchestration

- **Status:** Draft / Accepted for Implementation
- **Authors:** Principal Agent Architect & Get-Fable Core Engineering Team
- **Date:** 2026-10-15
- **Related Issues:** #58, #119, #120, #121, #122 (pre-requisites #117, #118 resolved in #184)
- **Target Component:** `get-fable` (front-door lifecycle router and ecosystem master orchestrator), `src/core/maturity.ts`, `src/core/orchestrator/`, `src/core/task-router.ts`, `src/core/prompt-compiler.ts`, `src/core/eval-runner.ts`

---

## 1. Executive Summary

This RFC establishes:
1. **The M5 Enterprise Certification Contract**: An evidence-backed evaluation framework replacing the hardcoded `enterpriseGatesPassed: false` in `src/core/maturity.ts` with an 8-pillar evidence evaluator (NIST AI RMF, OWASP Agentic AI, and SLSA aligned).
2. **Fail-Closed Dual-Status Certification**: Decoupling `certificationReadiness` (automated technical and behavioral criteria) from `externalCertification` (cryptographically or independently verified third-party audit). In the absence of authentic external proof, maturity remains strictly at **M4**, preventing self-certification.
3. **Master Orchestration Governance**: Elevating `get-fable` from an advisory router into an enterprise-auditable Master Orchestration Agent governing all 42 canonical skills, registered agents, and gRPC workers with centralized lifecycle ownership, capability isolation, supervisor recovery, and evidence-first completion gates.
4. **Resolution of Foundational Integrity Defects**: Fixing registry scoping in `compileFableDirective()` (#121), custom registry candidate enumeration in `task-router.ts` (#122), and benchmark error metric semantics in `eval-runner.ts` (#119).

---

## 2. Motivation and Problem Statement

### 2.1 The Hardcoded Enterprise Gate (#120)
`src/core/maturity.ts` previously hardcoded `enterpriseGatesPassed: false`. This left M5 mathematically unreachable even when all behavioral evaluations (known, negative, ambiguous, adversarial, holdout) achieved >=95% pass rates. Conversely, simply changing it to `true` would violate Fable's foundational invariant: **never manufacture maturity without evidence**.

### 2.2 Unscoped Registry Routing (#121, #122)
- In `src/core/prompt-compiler.ts`, `compileFableDirective()` accepted `repoRoot` for reading skill bodies but invoked `routeTask()` without passing the corresponding registry from `repoRoot`.
- In `src/core/task-router.ts`, `emptyScores()` and `rankSkills()` iterated global `canonicalSkillIds()` instead of deriving candidates from the provided `registry.skills`, causing potential mismatch in isolated fixture runs.

### 2.3 Conflated Routing Benchmark Metrics (#119)
`runRoutingBenchmark()` in `src/core/eval-runner.ts` reported `falsePositiveRate` and `falseNegativeRate` as `errors / cases.length`. These metrics must reflect actual one-vs-rest or classification errors rather than duplicating generic error rate.

### 2.4 Ecosystem Governance Deficit
While `src/core/orchestrator/` established 6-factor hybrid scoring and gRPC worker transport, the front-door `get-fable` router needed an integrated supervisory control plane to enforce delegation capability limits, prevent unauthorized mutations, handle worker crashes, and ensure that completion requires fresh multi-stage evidence.

---

## 3. Architecture & Specification

### 3.1 M5 Gate Framework (8 Pillars)

To qualify for M5 readiness, an agent or skill must satisfy 8 machine-verifiable gates:

| Gate Pillar | Requirement | Verification Source | Failure Mode |
|---|---|---|---|
| **1. Behavioral Reliability** | >=90% known, >=95% negative, >=90% ambiguous, >=95% adversarial, >=90% frozen holdout | `eval-runner.ts`, `agent-behavior-eval.ts` | Stale or < threshold -> M3/M4 |
| **2. Orchestration Correctness** | 3 Delegation Laws verified (Write, Semantic, Verification Independence); valid TOON delegation contracts; clean wave scheduling | `orchestrator/index.ts`, `test/worker-rpc.test.ts` | Conflict -> Re-wave or sequential |
| **3. Security & Authorization** | Least privilege enforced; child agent capability bounding; destructive action gates; CIDR/metadata endpoint isolation | `router-security.test.ts`, `redteam/` | Violation -> Immediate rejection |
| **4. Evidence Integrity** | Artifact hash binding; `runnerSha256` and `corpusSha256` matching; workspaceId provenance | `state.ts`, `verification-eval.ts` | Stale/Tampered -> `NOT_CHECKED` |
| **5. Operational Reliability** | Crash recovery; deterministic state transition; atomic state writes; timeout and cancellation handling | `state.ts`, `worker-rpc.test.ts` | Crash -> `fable-recover` routing |
| **6. Integration Assurance** | 32/32 host installer parity; canonical skill packaging; gRPC worker RPC health | `host-evidence.ts`, `doctor.ts` | Parity mismatch -> Block release |
| **7. Enterprise Auditability** | Machine-readable JSON/SARIF output; full event journal; explainable routing decisions | `.fable/events.jsonl`, `doctor.ts` | Unauditable -> Block completion |
| **8. External Certification** | Independently signed verification certificate bound to current attestation, verified against a trusted auditor public key | `.fable/certification.json` plus explicitly configured trust anchors and expected attestation hash | Missing/Expired/Untrusted -> M4 |

### 3.2 Dual-Status Certification Contract

```typescript
export interface EnterpriseCertificationStatus {
  readiness: 'PASS' | 'FAIL';
  externalCertification: 'VERIFIED' | 'PENDING' | 'REJECTED';
  gates: {
    behavioralReliability: boolean;
    orchestrationCorrectness: boolean;
    securityAuthorization: boolean;
    evidenceIntegrity: boolean;
    operationalReliability: boolean;
    integrationAssurance: boolean;
    enterpriseAudit: boolean;
    externalAuditSigned: boolean;
  };
  details: string[];
  certificatePath?: string;
}
```

- When gates 1-7 pass but gate 8 (external signature) is pending:
  `maturity = 'M4'`, `readiness = 'PASS'`, `externalCertification = 'PENDING'`.
- When all 8 gates pass with verified signature:
  `maturity = 'M5'`, `readiness = 'PASS'`, `externalCertification = 'VERIFIED'`.
- Certificate verification checks Ed25519 or RSA signatures over the canonical signed payload, an explicit trusted auditor key, and the expected independent attestation hash. An auditor name alone is not a trust anchor.
- As implemented in this PR, the production maturity evaluator lacks independently executable proof receipts for pillars 2, 3, 5, 6 and 7. Source-file existence MUST NOT be counted as proof. Those gates fail closed, and current technical readiness remains `FAIL`. No M5 certification or readiness claim is made until dedicated proof sources are implemented and verified.
- This ensures **M5 cannot be self-issued or fabricated**.

### 3.3 Master Orchestration Agent Control Plane

The Master Orchestration Agent (`get-fable`) executes a 4-layer control loop:
1. **Intake & Discovery Layer**: Scans task context, loads registry from explicit `repoRoot`, reads durable `.fable/state.json`, checks failure streak.
2. **Decomposition & Delegation Engine**: Partitions complex tasks into atomic `SubtaskSpec` units, verifies Write/Semantic/Verification independence, arms primary and co-overlay skills, attaches TOON delegation contracts.
3. **Execution & Supervision Bus**: Dispatches tasks across workers via gRPC Protobuf (`FableWorkerServer`), streams events, handles worker timeouts and cancellations, detects conflicting mutations.
4. **Verification & Completion Gate**: Requires fresh passing evidence (`verifiedGeneration >= mutationGeneration`) before authorizing state transition to `complete`.

---

## 4. Test-Driven Development Plan

| Test Phase | Target Behavior | Test File | Expected RED Failure |
|---|---|---|---|
| **TDD-1: Issue #121** | `compileFableDirective` honors custom `repoRoot` registry | `test/prompt-compiler.test.ts` | Custom registry route mismatch |
| **TDD-2: Issue #122** | `task-router` scores and ranks strictly from supplied `registry` | `test/router.test.ts` | Global `canonicalSkillIds` pollution |
| **TDD-3: Issue #119** | Correct calculation of class-wise FP/FN in `runRoutingBenchmark` | `test/eval-runner.test.ts` | Equal `falsePositiveRate` and `falseNegativeRate` |
| **TDD-4: Issue #120** | Evidence-driven enterprise gate evaluation with external cert fail-closed | `test/maturity-m5.test.ts` | Hardcoded false or missing gate evaluator |
| **TDD-5: Orchestrator** | Master orchestrator supervisor handles worker crash, unauthorized capability, and cancellation | `test/master-orchestrator.test.ts` | Missing supervisor enforcement & contract check |

---

## 5. Security & Privacy Considerations

- **Privilege Separation**: Child subagents cannot escalate capabilities beyond what is granted in their TOON contract.
- **No Secret Persistence**: Sensitive credentials or API keys are strictly excluded from state files, evidence logs, and telemetry.
- **Fail-Closed Operations**: Any corrupted evidence token, hash mismatch, or out-of-band mutation immediately resets verified state and blocks completion.
