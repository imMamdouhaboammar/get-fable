# Lifecycle Routing Matrix & Precedence

## Precedence Order
1. `fable-recover`: Repeated failures (failureStreak >= 2), stale execution, contradictory evidence.
2. `fable-security`: Security audits, auth/permission logic, secret exposure checks.
3. `fable-release`: Merge readiness, release checklists, tag/publish gates.
4. `fable-handoff`: Session continuity, compaction, next-action handoffs.
5. `fable-eval`: Evaluation of agent skills, prompts, benchmarks, self-improvement.
6. `fable-review`: Independent diff audits, PR review, standards conformance.
7. `fable-verify`: Behavioral falsification, test execution, proof generation.
8. `fable-research`: External fact grounding, API/documentation research.
9. `fable-discover`: Unfamiliar repository inspection, path tracing, load-bearing unknowns.
10. `fable-delegate`: Independent subtask delegation with disjoint ownership.
11. `fable-plan`: Architecture, multi-file design, migration decomposition.
12. `fable-tdd`: Testable feature additions or bug fixes.
13. `fable-execute`: Bounded implementation of an accepted card.
