# Atomic Next-Move Selection & Prioritization Policy

## Purpose
Defines the decision calculus used by Fable Spark to predict the single smallest, safest, and most contextually appropriate atomic next move without expanding scope.

## The Minimal Action Taxonomy

Fable Spark ranks candidate actions according to a strict priority hierarchy based on the current workspace state:

| Priority | State Condition | Predicted Atomic Action | Target Specialist | Rationale |
|---|---|---|---|---|
| **1 (Highest)** | \`failureStreak >= 2\` | Diagnose repeated failure | \`fable-recover\` | Churn prevention; isolate root cause before editing. |
| **2** | Unverified mutation (\`gen > verGen\`) | Run test suite / verify | \`fable-verify\` | Immediate falsification before accumulating edits. |
| **3** | Unaccepted open card | Review card acceptance check | \`fable-plan\` | Ensure criteria are machine-checkable. |
| **4** | Clean verified state with open cards | Implement next card | \`fable-execute\` | Proceed with bounded execution. |
| **5** | All cards verified & complete | Audit release readiness | \`fable-release\` | Validate pre-merge quality gates. |
| **6 (Lowest)** | Idle steady state | Silent (no action required) | \`none\` | Zero unnecessary conversational interruption. |

## Candidate Move Evaluation Rules

### Rule 1: Favor Verification over Speculative Coding
If code was modified, the next move is ALWAYS verification (\`bun test\` or \`tsc --noEmit\`). Never suggest editing another file before verifying the previous edit.

### Rule 2: Single Atomic Move Limit
Spark never suggests multi-step compound actions (e.g. "edit file A and then run tests and deploy"). Spark outputs exactly ONE atomic next move.

### Rule 3: Reason Code Attribution
Every suggestion emitted by Spark must include a machine-readable \`reasonCode\` (e.g. \`post-mutation-verify\`, \`intake-reproduce-bug\`, \`recovery-isolate-root-cause\`) to maintain full inspectability.
