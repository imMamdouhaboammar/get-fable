# Skill Package Specification Contract

## Overview
Every canonical skill in the Fable ecosystem is packaged as a self-contained, validated, and progressively disclosed package.

## Directory Layout
```text
skills/<skill-id>/
├── SKILL.md                  # Level 1/2: Compact LLM behavioral contract (<500 lines)
├── skill.package.json        # Resource inventory manifest
├── agents/
│   └── openai.yaml           # Platform agent profile (interface.default_prompt is a string)
├── references/               # Level 3: Deep domain procedures and domain knowledge
├── templates/                # Level 3: Boilerplate templates and contract formats
├── examples/                 # Level 3: Concrete end-to-end worked examples
├── evals/
│   └── scenarios.json        # Behavioral evaluation benchmark suite (given/expected/forbidden)
└── scripts/                  # Optional deterministic skill-local tooling
```

## Boundaries of Responsibility
- `SKILL.md`: Behavioral instructions, decision rules, procedural steps, and boundary conditions for agents.
- `skill.package.json`: Inventory of resources and entry points. Never duplicates lifecycle routing or state.
- `skills/get-fable/registry.json`: Canonical lifecycle graph, packs, intents, gates, and state machine routing.
- `evals/scenarios.json`: Automated regression and behavioral test suite.

## Progressive Disclosure Access Pattern
1. Discovery: System loads skill metadata (`name`, `description`, `intents`, `pack`).
2. Invocation: System injects `SKILL.md` into active agent context.
3. Deep Execution: Agent selectively reads specialized files via `readSkillResource(skillId, path)`.
