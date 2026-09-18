# Failure Lessons Index & Enforced Invariants

> Quick-discovery index of engineering failure classes, architectural remediations, and binding project invariants.

---

## Lessons Index

| Lesson | Failure Class | Prevention Rule | System | Status | Document |
|---|---|---|---|---|---|
| Non-Canonical Artifact Infiltration in Skills Root | Workspace Staging & Packaging Boundary | Every direct child of `skills/` must be an importable canonical skill directory with `SKILL.md` and `skill.package.json`. | doctor / marketplace | Resolved | [skills-architecture.md](./skills-architecture.md) |
| Subtitle Infiltration in Markdown AST Section Headings | AST Heading Parser Invariant Drift | Skill authoring headings must use exact standard H2 titles (`## Mission`, `## Protocol`, `## Invariants`) without colons or subtitles. | fable-lint | Resolved | [skills-architecture.md](./skills-architecture.md) |

---

## Rules We Now Enforce

1. **Single Source of Invariant Truth**: One domain invariant must have exactly one canonical validation source.
2. **Completeness Implies Resource Readiness**: A public "completed" state must strictly imply that all underlying artifacts are verified.
3. **Terminal-State Guarantees**: Every transitional state must possess explicit timeouts and guaranteed terminal transitions.
4. **Reproduce Before Fixing**: A regression test must reproduce the original failure mode before a fix is accepted.
5. **Strict Capability Root Cleanliness**: Never stage raw archives, git checkouts, or temporary folders inside `skills/`.
6. **Canonical Invariant Headings**: Machine-checked documentation contracts must use exact standard H2 titles without inline subtitles.

