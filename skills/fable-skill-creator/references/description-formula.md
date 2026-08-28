# Canonical Skill Description Formula & Trigger Optimization

## Purpose
The definitive guide to authoring skill descriptions that achieve maximum trigger accuracy and avoid under-triggering or over-triggering across diverse LLM client architectures.

## The 4-Slot Description Formula

```
[Slot 1: What it does]
+ [Slot 2: Use when 4-5 phrasings users actually say]
+ [Slot 3: Pushy clause: "even if they do not explicitly say '<canonical term>'"]
+ [Slot 4: Do NOT use for <explicit negative domains>]
```

### Worked Example: GOOD Description
> Author, evaluate, refine, optimize, and package autonomous AI agent skills across multi-agent ecosystems with BinEval scoring and description tuning. Use when creating a new skill from scratch, editing an existing skill that misfires or undertriggers, authoring test suites for skills, optimizing skill descriptions, or packaging skills for distribution — even if the user does not explicitly say "skill-creator" (e.g. "create a skill", "build a new skill", "optimize skill description", "package this skill", "teach the agent to do X"). Do NOT use for general application code changes or non-skill tasks.

### Description Invariants
- Maximum length: 1024 characters.
- Zero angle brackets (`<>` or `[]` inside text).
- **No process steps**: Never include workflow steps like `then`, `step 1`, `followed by`, `after that`.
