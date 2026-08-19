# Routing Policy

## Core Principle
Task routing must be evidence-grounded, score-ranked, and deterministic.

## Rules
1. **Ranked Score Selection**: All candidate skills are evaluated against task tokens and state signals; the top-ranked skill (`ranked[0].skill`) is selected.
2. **Failure Override**: A recovery override (`fable-recover`) triggers only when `failureStreak >= 2` and failure signals are present.
3. **Keyword Precedence**: Specialized domain keywords (e.g. diagrams, configuration files, simulators) carry higher weight (10–12) than cross-cutting concepts (6–8).
4. **Zero Hallucinated Routing**: Never invent skills outside the canonical 25-skill registry.
