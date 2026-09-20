# Open questions requiring evidence

These must not be answered by assumption.

1. Does the official TypeSafe JS SDK pass get-fable's Bun floor and package build matrix?
2. Is direct HTTP smaller/safer than the SDK after retry/error handling is counted?
3. What is Jev's actual top-1 accuracy on get-fable's existing known/negative/ambiguous/adversarial corpus?
4. Does second-stage top-3 disambiguation materially improve lookalike skill errors?
5. Which existing deterministic signals should be hard locks versus soft baseline evidence?
6. What confidence/margin thresholds achieve >=95% override precision?
7. How does Jev behave on mixed Arabic/English coding requests common to the maintainer's workflows?
8. What is real p95 latency from Egypt, Europe, and common CI regions?
9. Does task redaction materially hurt routing quality?
10. Should shadow logging await the remote call in ordinary CLI usage or be restricted to explicit reflex commands to avoid perceived latency?
11. Is local task hash sufficient for diagnostics, or is opt-in encrypted raw-task capture needed for eval labeling?
12. Should a future classical model learn from Jev probabilities, or is the hybrid rule set sufficient?

Each answer should become an ADR or measured evidence artifact when resolved.
