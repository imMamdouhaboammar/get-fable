# ADR 0008: Get-Fable M5 Enterprise Certification & Master Agent Orchestration

## Status
Accepted

## Context
See [RFC 0008](../rfcs/0008-m5-master-orchestration-and-governance.md) for full specification.
`evaluateSkillMaturity()` previously hardcoded `enterpriseGatesPassed: false`, preventing M5 readiness.
Additionally, `get-fable` required evolution from advisory routing into an enterprise Master Orchestration Agent governing 42 canonical skills and registered agents.

## Decisions
1. Implement an 8-pillar evidence-driven Enterprise Gate Evaluator (`evaluateEnterpriseCertificationGates`).
2. Implement dual-status machine-readable certification: `certificationReadiness` ('PASS' | 'FAIL') and `externalCertification` ('VERIFIED' | 'PENDING' | 'REJECTED').
3. M5 requires independently verified technical gate evidence AND a cryptographically verified certificate from an explicitly configured trusted auditor. Missing technical evidence means readiness **FAIL**; missing external certification means certification **PENDING**. In either case maturity remains **M4**.
4. Elevate `get-fable` to Master Orchestration Agent enforcing the 3 Delegation Laws, supervisor recovery, and TOON contracts over gRPC workers.
5. Resolve registry scoping in `compileFableDirective()` (#121), custom registry candidates in `task-router.ts` (#122), and benchmark FP/FN metrics (#119).

## Consequences
- M5 certification requires authentic, independent proof and cannot be self-awarded.
- Custom registry fixtures in testing and downstream hosts operate with complete isolation.
- Routing benchmarks report mathematically sound false-positive and false-negative metrics.
