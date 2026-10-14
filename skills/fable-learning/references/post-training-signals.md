# LLM Post-Training Signal Classification

## Purpose
Classify user-agent interactions from a conversation as post-training signals:
preferred/rejected pairs, positive demonstrations, or failure signatures.
Used in Phase 1 extraction and Phase 2 storage under `signals/` entity paths.

---

## Signal Types

### 1. Correction → Preferred/Rejected Pair
**Definition:** User explicitly fixes an agent mistake, overrides a decision,
or says "no", "not that", "instead do X", "that's wrong".

**Evidence in transcript:**
- User turn follows an agent action and contains "no", "wrong", "not like that", "instead", "actually"
- Agent retries with different approach after user pushes back
- User edits or replaces agent-generated content

**GBrain storage:**
```bash
gbrain remember "CORRECTION: Agent did <X>; correct behavior is <Y>" \
  --provenance "session:<id>" \
  --entity "signals/corrections"
gbrain add-tag "<id>" --tag "signal:correction" --tag "preferred-rejected-pair"
```

### 2. Confirmation → Positive Demonstration
**Definition:** User explicitly approves the agent's approach, says "yes", "exactly",
"perfect", "that's right", "proceed", or accepts output without modification.

**Evidence:**
- User says "yes", "great", "exactly", "looks good", "ship it", "proceed"
- User uses agent output directly (no edit)
- User marks a step as done and asks for next step

**GBrain storage:**
```bash
gbrain remember "CONFIRMED: <behavior that was approved>" \
  --provenance "session:<id>" \
  --entity "signals/confirmations"
gbrain add-tag "<id>" --tag "signal:confirmation" --tag "positive-demo"
```

### 3. Escalation → Failure Mode Signature
**Definition:** User had to intervene because the agent got stuck, looped,
produced wrong output repeatedly, or required manual override.

**Evidence:**
- Multiple retries of same failing approach
- User provides the solution themselves
- User pastes external documentation to unblock the agent
- User says "just do X" after agent kept doing Y

**GBrain storage:**
```bash
gbrain remember "ESCALATION: Agent failed at <task> due to <cause>. User resolved by <fix>." \
  --provenance "session:<id>" \
  --entity "signals/escalations"
gbrain add-tag "<id>" --tag "signal:escalation" --tag "failure-signature"
```

---

## Incident Report Format (when escalations are significant)

```markdown
## Status
FAIL | WARN | UNVERIFIED

## Observed Evidence
- <exact failure symptom from conversation>

## Failure Classification
[data | config | auth | timeout | logic | integration | discovery]

## Next Minimal Test
- What stays fixed:
- What changes:
- What to measure:

## Stop Condition
- When is this resolved?

## Artifacts to Preserve
- <session ID, chunk IDs, relevant transcript turns>

## Risks and Limitations
- <uncertainty about root cause>
```
