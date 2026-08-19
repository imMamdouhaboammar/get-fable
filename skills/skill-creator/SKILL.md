---
name: skill-creator
description: Create new skills, modify and improve existing skills, optimize skill descriptions for triggering accuracy, and measure skill performance with evaluation benchmarks. Use whenever creating a skill from scratch, editing or refining a skill, generating test suites for skills, or packaging multi-agent capabilities.
version: 1.2.0
pack: creator
inputs:
  - user_intent
  - workflow_trace
  - reference_sources
requires:
  - clear_capability_scope
produces:
  - structured_skill_package
  - eval_benchmark_suite
gates:
  - lack_of_surprise
  - objective_eval_criteria
fallback: fable-plan
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - fable-discover
    - fable-research
  continuations:
    - fable-eval
    - fable-verify
    - fable-review
  lateral_peers:
    - fable-artifact
    - fable-config
  recovery: fable-recover
---

# Skill Creator

Authoring, evaluating, refining, and packaging autonomous skills for multi-agent ecosystems.

## Purpose
Enable AI agents to systematically convert observed workflows, API contracts, and domain procedures into structured, verified, and self-evaluating Skill packages.

## When to Use
- Creating a brand new skill from scratch based on user requirements or workflow observations.
- Editing, refactoring, or optimizing an existing skill's instructions or triggering accuracy.
- Writing quantitative evaluation benchmarks, holdouts, and test prompts for skills.
- Packaging multi-agent skills into packs with neural linking and reference contracts.

## When NOT to Use
- Performing ordinary code changes or bug fixes (use `fable-execute` or `fable-tdd`).
- Running existing application tests or linters (use `fable-verify`).
- Conducting high-level project management (use `fable-plan` or `fable-handoff`).

## Inputs
- **`user_intent`**: The explicit capability or workflow to be codified.
- **`workflow_trace`**: Optional tool usage history or step sequence from the conversation.
- **`reference_sources`**: Canonical documentation, schemas, or API guidelines.

## Expected Outputs
- **`skills/<skill_id>/SKILL.md`**: Fully structured canonical skill instructions with YAML frontmatter.
- **`skills/<skill_id>/agents/`**: Multi-agent platform profiles (OpenAI, Claude, Generic).
- **`skills/<skill_id>/references/`**: Domain documentation and deep reference cards.
- **`skills/<skill_id>/templates/`**: Boilerplate templates and contract formats.
- **`skills/<skill_id>/examples/`**: Concrete end-to-end usage examples.

## Procedure
1. **Capture Intent**: Identify the trigger conditions, inputs, required tools, and output formats.
2. **Design Skill Architecture**: Apply the 3-level progressive disclosure pattern:
   - Level 1: Frontmatter metadata (name + description with explicit triggers).
   - Level 2: SKILL.md body (<500 lines of actionable decision rules and procedures).
   - Level 3: Bundled resources in `references/`, `templates/`, and `examples/`.
3. **Draft Instructions**: Use clear imperative language, concrete examples, and boundary conditions.
4. **Construct Evals**: Draft quantitative assertions and qualitative evaluation prompts.
5. **Optimize Description**: Refine frontmatter `description` to ensure high triggering accuracy without over-triggering.

## Decision Rules
- If a skill contains >500 lines of prose, extract secondary domain deep dives into `references/<subtopic>.md`.
- Never hardcode provider-specific tool names (e.g. `tavily_search`) inside canonical skill logic; reference abstract capabilities (`current-search-capability`).
- Every skill must define explicit `When NOT to use` boundaries to prevent false trigger collisions.

## Tool Policy
- Use file authoring tools to create clean markdown files and YAML metadata.
- Validate generated skill frontmatter against `schemas/skill.schema.json`.

## Evidence Requirements
- Schema validation pass against `schemas/skill.schema.json`.
- At least 2 test scenarios demonstrating successful skill execution.

## Failure Handling
- If a skill fails triggering accuracy evals, run description optimization to add domain keywords and pushy intent cues.
- If skill instructions produce ambiguous agent behavior, add negative examples and explicit decision tables.

## Completion Criteria
- `SKILL.md` is valid, well-formed, and contains all 12 canonical sections.
- All bundled subdirectories (`agents/`, `references/`, `templates/`, `examples/`) are populated.
- Skill is registered in `registry/skills.json` and `skills.sh.json`.

## Neural Connections & Referring Links
- Upstream Precursors: `fable-discover`, `fable-research`
- Downstream Continuations: `fable-eval`, `fable-verify`, `fable-review`
- Lateral Peers: `fable-artifact`, `fable-config`
- Recovery Handler: `fable-recover`

## Examples

### Example 1: Creating a Specialized Tool Skill
```markdown
---
name: custom-db-migrator
description: Migrate Postgres database schemas safely with rollback scripts. Use when applying DB migrations.
pack: build
version: 1.0.0
inputs: [migration_sql, target_env]
requires: [db_connection]
produces: [migration_receipt]
---
# custom-db-migrator
...
```
