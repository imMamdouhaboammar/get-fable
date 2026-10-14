---
title: "${SOLUTION_TITLE}"
problem_type: "${PROBLEM_TYPE}" # config | bug | dependency | harness | architecture
impact_scope: "${IMPACT_SCOPE}" # repo | module | host | cross-project
root_cause: "${ROOT_CAUSE_SUMMARY}"
verified_fix: "${VERIFIED_FIX_SUMMARY}"
verification_command: "${VERIFICATION_COMMAND}"
confidence: "${CONFIDENCE_LEVEL}" # L1 (Anecdotal) | L2 (Observed) | L3 (Verified) | L4 (Universal)
extracted_at: "${EXTRACTED_AT_ISO}"
session_id: "${SESSION_ID}"
---

# ${SOLUTION_TITLE}

## Problem Overview
Describe the exact failure observed during the session, including error output, symptoms, and the immediate blockers encountered:

```text
${VERBATIM_ERROR_OR_SYMPTOM}
```

## Root Cause Analysis
Explain the technical underlying cause of why the failure occurred:

- **What happened:** ${ROOT_CAUSE_EXPLANATION}
- **Why prior attempts failed:** ${FAILED_HYPOTHESIS_CONTRAST}
- **Harness/Environment details:** ${RUNTIME_OR_TOOLING_CONTEXT}

## Verified Fix
Detail the exact changes that resolved the issue:

```diff
${DIFF_OR_CODE_CHANGES}
```

Or command executed:
```bash
${COMMAND_EXECUTED}
```

## Verification Evidence
Document the machine-checked command that proved the fix worked:

```bash
${VERIFICATION_COMMAND}
```
Result: `${VERIFICATION_RESULT}`

## Reusable Invariant & Future Prevention
State the durable rule that future agents or engineers should follow:

> [!IMPORTANT]
> **Rule:** ${DURABLE_RULE_STATEMENT}

- **Keywords:** ${KEYWORDS_COMMA_SEPARATED}
- **Target Storage:** `agent-kernel`, `gbrain`, `docs/solutions/`
