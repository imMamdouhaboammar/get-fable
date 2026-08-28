# Example: Creating a Specialized Database Migrator Skill

## Context
A project requires a structured skill for managing PostgreSQL migrations safely with rollback validation.

## Execution Sequence

### Step 1: Initialize Package Manifest (`skills/db-migrator/skill.package.json`)
```json
{
  "$schema": "../../schemas/skill-package.schema.json",
  "schemaVersion": 1,
  "id": "db-migrator",
  "entry": "SKILL.md",
  "agents": ["agents/openai.yaml"],
  "references": ["references/rollback-safety.md"],
  "templates": ["templates/migration.sql"],
  "examples": ["examples/add-user-column.md"],
  "evals": ["evals/scenarios.json"],
  "scripts": []
}
```

### Step 2: Author Behavioral Contract (`skills/db-migrator/SKILL.md`)
Includes `When to Use`, `When NOT to Use`, explicit inputs, rollback procedures, and evidence requirements.

### Step 3: Author Eval Scenarios (`skills/db-migrator/evals/scenarios.json`)
Covers forward migration, dry-run schema validation, rollback test on error, and rejecting destructive drops without explicit confirmation.
