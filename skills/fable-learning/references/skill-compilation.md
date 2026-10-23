# Skill Compilation Reference

## Purpose
Guide Phase 3 of Fable Learning: compiling extracted learnings into a portable SKILL.md
using `fable-skill-creator` and `omni-skill CREATE`.

---

## When to Compile a Skill

Compile a standalone skill (rather than only a rule or Playbook) when:
- ≥ 5 related learnings share a reusable technique applicable across codebases.
- The pattern has cross-project score ≥ 4.
- The user explicitly asks "make a skill from this" or passes `--compile`.
- No existing skill covers this behavioral domain.

**Do NOT compile a skill for:**
- One-time fixes without broader applicability.
- Project-specific configuration (belongs in repository `docs/learning/`).
- Behaviors already covered by an existing skill.

---

## Compilation Lifecycle

### 1. Extract the Universal Core
From Phase 1 learnings:
- Core task/capability enabled.
- Baseline failure without the skill.
- 3+ trigger phrases.
- 2+ near-miss non-trigger examples.
- Invariants and required outputs.

### 2. Write the SkillSpec
```markdown
## SkillSpec
- name: <verb-noun-hyphenated>
- job: <what repeatable task this improves>
- baseline-failure: <what agents do wrong without this skill>
- triggers:
  - "<phrase 1>"
  - "<phrase 2>"
- negatives:
  - "<near-miss 1>"
- outputs: [<list of required outputs>]
- invariants: [<things that must never happen>]
- workflow: [<ordered steps>]
```

### 3. Progressive Disclosure Structure
- `SKILL.md`: High-level principles, trigger tables, quick reference (<500 lines).
- `references/`: Deep protocols, schemas, checklists (>100 lines).
- `scripts/`: Deterministic scripts for execution.
- `templates/`: Structured document formats.
- `examples/`: Realistic walkthroughs.
- `evals/`: Objective test scenarios.
