# Spark Situational Awareness Calculation

## 1. Current Workspace Inputs
- **State Phase**: [idle / executing / verifying]
- **Mutation Generation**: [N]
- **Verified Generation**: [M]
- **Failure Streak**: [K]
- **Active Card**: [Card ID or null]

## 2. Micro-Policy Evaluation
- **Condition Detected**: Mutation occurred (Gen N > Gen M) without subsequent verification.
- **Confidence Score**: 0.92 (Threshold: >= 0.70)
- **Reason Code**: `post-mutation-verify`

## 3. Predicted Next Action
- **Suggestion**: `get-fable verify`
- **Silent Flag**: `false`
