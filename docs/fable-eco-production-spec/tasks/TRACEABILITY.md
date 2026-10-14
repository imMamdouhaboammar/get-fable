# Fable Eco Requirements Traceability Matrix

| Requirement | Primary tasks | Release evidence |
|---|---|---|
| Side-effect-free discovery | ECO-010, 011, 012 | discovery tests and probe timeout fixtures |
| Data-driven official catalog | ECO-002, 003, 004, 005 | schema and catalog fixture suite |
| Deterministic dependency/conflict resolution | ECO-013, 014, 015 | resolver property tests |
| Immutable stable versions | ECO-016, 017 | version fixtures, mutable-branch rejection |
| Offline behavior | ECO-018 | zero-network offline tests |
| Plan before mutation | ECO-020, 021, 046, 048 | CLI and E2E plan-approval tests |
| Transactional install | ECO-022 through 037 | fault-injection suite |
| Safe archive handling | ECO-026 | adversarial archive tests |
| No arbitrary official shell installer | ECO-003, 004, 027 | manifest validator tests |
| Ownership-aware host config | ECO-041, 042, 043 | host matrix and removal fixtures |
| Stable JSON CLI | ECO-044, 045 | golden JSON fixtures |
| TUI all-compatible semantics | ECO-047, 048 | selector state tests |
| Project bindings | ECO-049 | temp repo fixtures |
| Existing router remains authority | ECO-060, 061 | router regression fixtures |
| Minimal capability set | ECO-062, 063 | runtime selection goldens |
| Deny-by-default permissions | ECO-064 | policy tests |
| No enforcement downgrade | ECO-040, 065, 066 | contract and host exposure tests |
| Typed capability results | ECO-067 | result schema fixtures |
| Evidence cannot widen completion | ECO-068 | completion regression suite |
| Delegated agents are executors | ECO-069 | provider contract tests |
| Explainability without hidden reasoning | ECO-070 | explanation snapshot tests |
| Doctor/repair | ECO-080, 081, 082 | doctor fixtures and repair E2E |
| Secret redaction | ECO-083, 084 | sentinel property tests |
| Active security scope | ECO-064, 085 | scoped-target adversarial tests |
| Cross-platform support | ECO-087 | CI matrix |
| Performance targets | ECO-088 | benchmark report |
| Curated stable adapters | ECO-090 | qualification records |
| Stable release gate | ECO-092, 093 | production acceptance checklist |
