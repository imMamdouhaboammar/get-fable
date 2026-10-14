# Fable Eco Risk Register

| ID | Risk | Probability | Impact | Mitigation | Release gate |
|---|---|---:|---:|---|---|
| R1 | Third-party installer behavior changes upstream | High | High | built-in drivers, exact versions, adapter qualification | stable adapter tests |
| R2 | Catalog becomes a remote-code-execution surface | Medium | Critical | no arbitrary scripts, strict schema, allowlisted drivers | security suite |
| R3 | Rollback destroys user-authored host config | Medium | Critical | ownership receipts, precondition digests, structural patching | host removal matrix |
| R4 | Mutable branch resolves differently over time | High | High | exact revisions in committed lock | version resolver tests |
| R5 | Package name collision installs wrong tool | Medium | High | explicit registry/source identity | package identity tests |
| R6 | Too many installed skills pollute agent context | High | High | install many, activate few; minimal runtime planner | runtime goldens |
| R7 | Eco becomes a second lifecycle router | Medium | Critical | canonical routing decision is immutable input | router regression suite |
| R8 | Host advisory instructions are mistaken for enforcement | High | High | Grade A/B/C/N model | host matrix tests |
| R9 | Crash leaves half-mutated machine | Medium | Critical | write-ahead journal, fault injection, recovery state | transaction suite |
| R10 | Shared dependency removal breaks another capability | Medium | High | reference tracking | uninstall tests |
| R11 | Secret leaks into logs/support bundle | Medium | Critical | allowlist support bundle, redaction property tests | security suite |
| R12 | Security tool acts outside authorized scope | Low/Medium | Critical | routed security task + scoped target + policy | security E2E |
| R13 | Public upstream outage makes CI flaky | High | Medium | fixture metadata/local HTTP tests; separate scheduled qualification | normal CI must be offline |
| R14 | Windows semantics differ for locks/atomic replace | High | High | beta until platform-specific fault suite passes | Windows stable gate |
| R15 | Catalog grows faster than support capacity | High | Medium | support tiers and qualification requirement | stable entry gate |
| R16 | Tool overlap creates contradictory playbooks | High | Medium | primary-provider/context-overlap conflict classes | runtime selection tests |
| R17 | Health check gives false confidence | Medium | High | health only proves declared capability health, not task completion | evidence separation tests |
| R18 | Existing unmanaged install is accidentally adopted/removed | Medium | High | mark external-unmanaged; no V1 adoption | remove ownership tests |
| R19 | Network metadata changes between plan and apply | Medium | High | plan pins exact resolved identity and digest; apply consumes plan | transaction tests |
| R20 | Tool output injects instructions into host | Medium | High | treat output as external data, structured adapters | injection fixture |
