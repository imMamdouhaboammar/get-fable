# The 10 Canonical Skill Authoring Principles

## Purpose
The foundational 10 authoring principles from /skill-conductor and /skill-creator for engineering robust, self-evaluating, and token-efficient agent skills.

## The 10 Canonical Principles

1. **Pre-flight Requirement**: Every skill must define runtime preconditions and explicit stop conditions before mutating workspace files.
2. **No-Process-in-Description**: Never place execution workflow steps inside the frontmatter description. The description's sole job is discovery.
3. **Map of Content (MOC)**: `SKILL.md` is a compact navigation map (<500 lines) pointing to modular `references/`, not a giant text dump.
4. **Fresh-Practitioner Perspective**: Write instructions assuming the executing agent is competent in general programming but completely new to this specific domain procedure.
5. **TWI Methodology (Step + Key Point + Why)**: Structure non-trivial steps with the action verb, the critical nuance to watch for, and the operational reason why it matters.
6. **The Blind-Agent Test**: An agent reading only the skill package must be able to execute the workflow successfully without access to hidden external chat context.
7. **Inline Risk Checklists**: Place checklists directly at high-risk decision points, rather than clustering them in a detached summary section at the end.
8. **One Term per Concept**: Choose a single canonical term (e.g. "template", "card", "gate") and use it consistently throughout all documents.
9. **Zero Inlined Credentials**: Never include real API keys, passwords, private tokens, or user-absolute paths in skill files.
10. **Match the Form to the Failure**: When fixing an agent failure, calibrate freedom: use deterministic scripts for fragile steps, pseudocode for guided workflows, and prose for open-ended design.
