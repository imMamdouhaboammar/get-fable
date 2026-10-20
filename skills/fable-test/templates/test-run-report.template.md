# Test Run Report: {{TASK_ID_OR_NAME}}

**Timestamp:** {{TIMESTAMP_ISO8601}}  
**Execution Environment:** {{ENVIRONMENT}} (Bun {{BUN_VERSION}}, Rust {{RUST_VERSION}})  
**Overall Verdict:** {{VERDICT}} <!-- PASS | FAIL | BLOCKED -->  

---

## 1. Executive Summary

| Metric | Count / Value |
|---|---|
| **Tiers Executed** | {{TIERS_EXECUTED_COUNT}} / 7 |
| **Total Test Suites** | {{TOTAL_SUITES}} |
| **Total Assertions / Checks** | {{TOTAL_ASSERTIONS}} |
| **Passing Tests** | {{PASSING_TESTS}} |
| **Failing Tests** | {{FAILING_TESTS}} |
| **Skipped / Ignored Tests** | {{SKIPPED_TESTS}} (Must be 0) |
| **Anti-Slop Findings** | {{BLOCKERS_COUNT}} Blockers, {{REVIEW_COUNT}} Reviews |
| **Total Execution Time** | {{ELAPSED_SECONDS}}s |

---

## 2. Multi-Tier Execution Matrix

| Tier | Name | Target / Command | Exit Code | Status | Notes |
|---|---|---|---|---|---|
| **Tier 1** | Local Unit (Bun) | `bun test` | {{T1_BUN_EXIT}} | {{T1_BUN_STATUS}} | {{T1_BUN_NOTES}} |
| **Tier 1** | Local Unit (Rust) | `cargo test --workspace` | {{T1_CARGO_EXIT}} | {{T1_CARGO_STATUS}} | {{T1_CARGO_NOTES}} |
| **Tier 1** | Type Check | `bun run typecheck` | {{T1_TSC_EXIT}} | {{T1_TSC_STATUS}} | {{T1_TSC_NOTES}} |
| **Tier 2** | Neural Differential | `rig call-tool fable_neural_test` | {{T2_EXIT}} | {{T2_STATUS}} | {{T2_NOTES}} |
| **Tier 3** | Anti-Slop AST Scan | `get-fable anti-slop scan` | {{T3_EXIT}} | {{T3_STATUS}} | {{T3_NOTES}} |
| **Tier 4** | Rig & gRPC Integration | `bun test test/rig-integration.test.ts` | {{T4_EXIT}} | {{T4_STATUS}} | {{T4_NOTES}} |
| **Tier 5** | Cypress Browser E2E | `bun run test:cypress:smoke` | {{T5_EXIT}} | {{T5_STATUS}} | {{T5_NOTES}} |
| **Tier 6** | Behavioral Evals | `get-fable behavior-eval status` | {{T6_EXIT}} | {{T6_STATUS}} | {{T6_NOTES}} |
| **Tier 7** | System Doctor Audit | `get-fable doctor --json-v1` | {{T7_EXIT}} | {{T7_STATUS}} | {{T7_NOTES}} |

---

## 3. Detected Failures & Diagnoses

<!-- If any tier failed, document the root cause and remediation plan -->
{{#if FAILURES}}
### Failure Details
- **Tier:** {{FAILED_TIER}}
- **Error Signature:** `{{ERROR_MESSAGE}}`
- **Root Cause Category:** {{FAILURE_CATEGORY}} <!-- HARNESS_ENVIRONMENT_FAILURE | TEST_INTEGRITY_VIOLATION | DIFFERENTIAL_DIVERGENCE | RPC_TRANSPORT_TIMEOUT | BEHAVIORAL_REGRESSION -->
- **Remediation Action:** {{REMEDIATION_STEP}}
{{else}}
*No failures detected across all executed tiers.*
{{/if}}

---

## 4. Evidence Stamped

```bash
bun ./bin/get-fable.js evidence pass test "{{EVIDENCE_COMMAND}}" "{{EVIDENCE_DETAIL}}"
```
