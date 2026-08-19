# Multi-Agent Architecture

## Agent vs Skill vs Tool
```text
Agent (Role & Autonomy Owner)
  ↓ uses
Skills (Reusable Behaviors & Procedures)
  ↓ uses
Tools (Concrete APIs & Shell Adapters)
```

## Canonical Agent Roles
- **Orchestrator**: Task routing, subagent delegation, session handoffs.
- **Researcher**: Primary source grounding, official doc verification.
- **Architect**: Architecture diagrams, work card decomposition.
- **Executor**: Bounded TDD code implementation.
- **Verifier**: Empirical test validation and falsification.
- **Reviewer**: Independent diff and standards auditing.
- **Security Auditor**: Threat modeling and secret hygiene checks.
- **Simulator**: Independent oracle and headless UI testing.
- **Author**: Skill authoring and benchmark eval suites.
