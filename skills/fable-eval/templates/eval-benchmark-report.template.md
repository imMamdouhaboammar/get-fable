# Benchmark Evaluation Report: [Skill/Prompt Name]

## Executive Summary
- **Target Component**: [e.g. fable-plan system prompt]
- **Baseline Version**: v1.2.0 (Pass Rate: 82.0%)
- **Candidate Version**: v1.3.0 (Pass Rate: 94.0%)
- **Verdict**: [ACCEPTED / REJECTED]

## Evaluation Results Matrix
| Scenario Category | Total Cases | Baseline Passed | Candidate Passed | Delta |
|---|---|---|---|---|
| Positive Triggers | 10 | 9 (90%) | 10 (100%) | +10% |
| Negative Rejections | 10 | 8 (80%) | 10 (100%) | +20% |
| Held-Out Stress Cases | 10 | 8 (80%) | 9 (90%) | +10% |
| **Total** | **30** | **25 (83.3%)** | **29 (96.7%)** | **+13.4%** |

## Regression Gate Check
- [x] Zero Held-Out Regressions: All baseline-passing held-out cases remained passing.
- [x] Execution Latency: Average latency within budget (1.2s vs 1.4s baseline).
