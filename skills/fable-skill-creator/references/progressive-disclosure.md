# Progressive Disclosure in Skill Design

## Overview
Progressive disclosure is a core design pattern for LLM skills that minimizes context token overhead while providing unlimited depth when needed.

## The Three Levels

```text
Level 1: Metadata (Name + Description)
└── Always in system context (~100 words)
    └── Determines WHEN the skill triggers

Level 2: Canonical SKILL.md Body
└── Injected into context ONLY when the skill triggers (<500 lines)
    └── Contains purpose, decision rules, step-by-step procedures

Level 3: Bundled Resources (references/, templates/, scripts/)
└── Read on-demand by the agent as needed (unlimited size)
    └── Contains deep API docs, extensive checklists, code templates
```

## Guidelines for Level 3 Extraction
1. Extract reference material when `SKILL.md` approaches 500 lines.
2. Group by technology or cloud provider (e.g. `references/aws.md`, `references/gcp.md`).
3. For large reference files (>300 lines), include a Table of Contents at the top.
