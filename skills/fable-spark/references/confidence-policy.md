# Confidence Evaluation & Situational Thresholding

## Purpose
Specifies the mathematical scoring model and threshold gates used by Fable Spark to calculate suggestion confidence and enforce situational silence.

## Confidence Calculation Formula

Spark computes a confidence score $C \in [0.0, 1.0]$ based on four weighted contextual signals:

$$C = w_{\text{state}} \cdot S_{\text{state}} + w_{\text{evidence}} \cdot S_{\text{evidence}} + w_{\text{card}} \cdot S_{\text{card}} + w_{\text{history}} \cdot S_{\text{history}}$$

| Signal | Weight ($w$) | Description |
|---|---|---|
| **State Clarity ($S_{\text{state}}$)** | 0.35 | Unambiguous phase in \`.fable/state.json\` (idle, executing, verifying). |
| **Evidence Alignment ($S_{\text{evidence}}$)** | 0.30 | Clear gap between \`mutationGeneration\` and \`verifiedGeneration\`. |
| **Active Card Definition ($S_{\text{card}}$)** | 0.20 | Well-formed active card with explicit acceptance criteria in \`LEDGER.md\`. |
| **Failure Streak History ($S_{\text{history}}$)** | 0.15 | Definite failure streak counter ($\ge 2$ triggers recovery with $1.0$). |

## Threshold Gates & Action Decisions

\`\`\`
                    ┌─────────────────────────┐
                    │  Compute Confidence C   │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
          C >= 0.70 Threshold              C < 0.70 Threshold
                 │                               │
                 ▼                               ▼
       Emit Atomic Suggestion            Enforce Complete Silence
       (silent: false)                   (suggestion: null, silent: true)
\`\`\`

- **High Confidence ($C \ge 0.85$)**: High certainty (e.g. fresh mutation requires test run). Emitted immediately.
- **Moderate Confidence ($0.70 \le C < 0.85$)**: Contextually grounded move. Emitted with concise rationale.
- **Low Confidence ($C < 0.70$)**: Ambiguous state or speculative intent. Spark remains completely silent.
