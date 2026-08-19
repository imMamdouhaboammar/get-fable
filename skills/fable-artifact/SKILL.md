---
name: fable-artifact
description: Design structured technical proposals, responsive artifacts, architecture diagrams, and interactive components. Use when creating standalone markdown reports, Mermaid diagrams, or interactive widgets.
version: 1.3.0
pack: system
inputs:
  - artifact_spec
requires:
  - design_requirements
produces:
  - artifact_document
  - interactive_ui
gates:
  - hierarchy_clear
  - theme_adaptive
fallback: fable-plan
mutatesWorkspace: true
parallelSafe: true
neural_links:
  precursors:
    - fable-dataviz
    - fable-plan
  continuations:
    - fable-verify
    - fable-review
  lateral_peers:
    - fable-dataviz
  recovery: fable-recover
---

# fable-artifact

Structured technical proposals, diagrams, and rich artifact designer.

## Purpose
Compose clear, visually engaging technical artifacts, Mermaid architecture topologies, and interactive prototypes.

## When to Use
- Writing extensive architectural proposals, RFCs, and engineering reports.
- Rendering complex system graphs, sequence diagrams, and state machines via Mermaid.
- Building interactive UI mockups or HTML widgets.

## When NOT to Use
- Writing one-sentence direct conversational answers (respond directly).
- Modifying production application logic (use `fable-execute`).

## Inputs
- **`artifact_spec`**: Content, diagrams, and structural specifications.

## Expected Outputs
- **`artifact_document`**: Well-formatted markdown artifact in the designated artifact directory.
- **`interactive_ui`**: Standalone HTML/JS UI component when requested.

## Procedure
1. Establish visual hierarchy using GitHub-flavored markdown and alerts.
2. Construct validated Mermaid diagrams (quoting labels with special characters).
3. Save output to designated artifact path.
4. Verify rendering and link references.

## Decision Rules
- Use alert callouts (`[!NOTE]`, `[!IMPORTANT]`) strategically, not consecutively.
- Keep bullet points concise and avoid deep unnecessary nesting.

## Tool Policy
- Write to artifact directory; do not clutter project root.

## Evidence Requirements
- Clean markdown artifact file with valid Mermaid diagram syntax.

## Failure Handling
- If Mermaid syntax fails to render, check node label escaping and direction keywords.

## Completion Criteria
- Artifact is created and verified with clear hierarchical readability.

## Progressive Resources
- Guide: `references/artifact-composition-guide.md`
- Example: `examples/system-architecture-diagram.md`
