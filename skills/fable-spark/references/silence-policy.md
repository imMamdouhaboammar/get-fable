# Spark Silence Policy: Situational Silence # Fable Spark: Situational Silence & Noise Elimination Noise Elimination

## Purpose
Defines the situational silence policy for Fable Spark, establishing when the situational awareness micro-policy must remain completely silent to avoid distracting the developer or agent.

## The Silence Invariants

### 1. Default to Silence
If the workspace is in a healthy, steady state and the next action is completely obvious, Spark emits no suggestions (`suggestion: null`, `silent: true`).

### 2. When Spark Must Remain Silent
- **Task in Progress**: The agent is actively executing a known work card.
- **Passing Verification**: All tests and checks have passed and no new mutation has occurred.
- **Low Confidence (<0.70)**: The situational intent is ambiguous or insufficiently grounded in state.
- **Read-Only Inspection**: The user is simply viewing logs, help topics, or status summaries.

### 3. When Spark Speaks
Spark triggers an atomic next-move recommendation only when:
- An unverified mutation just occurred (`mutationGeneration > verifiedGeneration`).
- A command just failed (`failureStreak > 0`).
- An open card is missing an explicit acceptance test.
