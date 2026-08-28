# Lifecycle Routing Matrix & Evidence Precedence

## Purpose
Comprehensive routing matrix and precedence rules governing transitions between all 25 canonical Get Fable skills.

## Master Routing Table

| Current Workspace State | Incoming User Intent | Selected Skill | Precedence Rationale |
|---|---|---|---|
| `failureStreak >= 2` | Any coding task | `fable-recover` | Stop execution churn; diagnose root cause. |
| Security / Auth risk | Security audit or diff | `fable-security` | Security gates override general review. |
| Unknown codebase | "How does X work?", "Explore" | `fable-discover` | Gather local facts before designing. |
| External API question | "Check latest docs for Y" | `fable-research` | Ground external facts in primary sources. |
| Multi-file feature | "Design X", "Plan architecture" | `fable-plan` | Decompose into bounded cards. |
| Reproducible bug / TDD | "Fix bug X", "Write test" | `fable-tdd` | Red-Green-Refactor discipline. |
| Independent subtasks | "Run parallel workers" | `fable-delegate` | Disjoint ownership and contracts. |
| Accepted work card | "Implement card X" | `fable-execute` | Bounded single-scope execution. |
| Code modified | "Run tests", "Check if working" | `fable-verify` | Falsification and fresh proof. |
| PR / Diff ready | "Review my changes" | `fable-review` | Independent grounded code review. |
| Release candidate | "Ship to prod", "Release tag" | `fable-release` | Certification and gate validation. |
| Session ending | "Pause work", "Save context" | `fable-handoff` | Durable state serialization. |
| Agent prompt / skill | "Benchmark skill", "Eval prompt" | `fable-eval` | Baseline and holdout evaluation. |
| New skill needed | "Create a skill", "Author skill" | `skill-creator` | 6-mode skill lifecycle. |
