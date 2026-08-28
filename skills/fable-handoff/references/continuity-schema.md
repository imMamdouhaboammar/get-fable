# Continuity Schema & Durable Handoff Protocol

## Purpose
Specification for serializing session state, open blockers, evidence ledgers, and exact continuation moves into durable artifacts for flawless cross-session agent resumption.

## The Handoff Data Contract
Every handoff document must capture the complete engineering state in a structured format:

```markdown
# Session Handoff: [Task Name]

## 1. Executive Status
- **Phase**: [idle | planned | executing | verifying | recovering | complete]
- **Active Card**: [Card ID and title, or null]
- **Mutation Generation**: [N]
- **Verified Generation**: [M]
- **Failure Streak**: [0 | N]

## 2. Completed Milestones & Evidence
- [x] Milestone 1: Implemented feature logic (`src/feature.ts`) -- evidence: `bun test` passed
- [x] Milestone 2: Verified API contract -- evidence: schema validation green

## 3. Current In-Flight Work
[Exact details of the file and function currently being edited]

## 4. Unresolved Blockers & Load-Bearing Questions
- Blocker A: [Description of external dependency or ambiguity]

## 5. Exact Next Action (Single Move)
[Unambiguous command or edit for the resuming agent to execute immediately]
```

## Resumption Protocol
When an agent resumes from a handoff:
1. Read the handoff document and verify that workspace files match the recorded state.
2. Check `git status` and confirm no untracked file collisions exist.
3. Execute the single "Exact Next Action" without re-planning or asking redundant questions.
