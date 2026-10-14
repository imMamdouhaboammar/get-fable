---
name: fable-artifact
description: "Design and author structured technical proposals, responsive artifacts, architecture diagrams, Mermaid charts, and interactive components. Use when creating standalone markdown reports, architectural specifications, Mermaid diagrams, or interactive artifact widgets — even if the user does not explicitly say \"fable-artifact\" (e.g. \"create an artifact\", \"draw an architecture diagram\", \"write a technical proposal\", \"generate a mermaid flowchart\"). Do NOT use for quick one-line conversational answers."
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

# Fable Artifact

Turn requirements and evidence into a standalone artifact whose content, structure, diagrams, links, and rendered output can all be checked independently.

## Mission
An artifact is not successful because the Markdown parses or the diagram looks polished. It must communicate the right claims to the right audience, preserve source truth, make assumptions visible, and render in the medium the user will actually consume.

## Activate When
- producing RFCs, architecture proposals, technical reports, runbooks, decision records, diagrams, or rich standalone documentation;
- packaging analysis/results into a durable document;
- creating a diagram or interactive explanatory artifact from established requirements/evidence.

## Do Not Activate When
- a one-paragraph answer is sufficient;
- application logic itself needs modification (`fable-execute`);
- the main work is numerical chart selection (`fable-dataviz`);
- facts required by the artifact have not been researched/discovered yet.

## Artifact Classification
| Artifact | Primary contract |
| --- | --- |
| RFC/proposal | decision, alternatives, trade-offs, acceptance/rollout |
| Architecture doc | boundaries, data/control flow, invariants, deployment |
| Runbook | trigger, prerequisites, executable steps, rollback/escalation |
| Incident/report | timeline/evidence/impact without invented causality |
| Decision record | context, decision, alternatives, consequences |
| Diagram | semantic topology/sequence/state, not decorative boxes |
| Interactive explainer | accessible interaction + deterministic content/source |

## Protocol
### Stage 1 — Define audience and job
State who will use the artifact and what decision/action it must support. One artifact can contain multiple sections, but it should have one primary communication job.

### Stage 2 — Build a claim/source map
Before writing polished prose, identify:
- measured/source-backed facts;
- design decisions;
- assumptions/inferences;
- unresolved items;
- data/visual sources;
- claims that need citations/links.

Do not invent examples, metrics, architecture components, test results, or citations to make the document feel complete.

### Stage 3 — Choose structure from artifact type
Examples:
- RFC: context → goals/non-goals → evidence → options → decision → design → risks → rollout/rollback → acceptance;
- runbook: symptom/trigger → safety prerequisites → diagnosis → action → verification → rollback/escalation;
- architecture: scope → context → components/boundaries → flows → data/state → failure/security → deployment/operations → decisions.

Avoid generic template sections that do not serve the document's job.

### Stage 4 — Design diagrams semantically
Each node/edge should represent a real component, state, dependency, event, or data/control flow. Label direction/meaning where ambiguity exists.

For Mermaid or other text diagrams:
- validate syntax;
- quote/escape labels safely;
- avoid giant unreadable graphs;
- split views by question (context, container, sequence, state) when one diagram becomes overloaded.

### Stage 5 — Write for scanning and decision quality
Use hierarchy, short sections, tables only when comparison benefits, callouts sparingly, and explicit `Decision`, `Risk`, `Unknown`, `Evidence` language where useful.

Do not turn every sentence into bullets or bury the main decision below background detail.

### Stage 6 — Validate internal consistency
Cross-check:
- terms/names/versions match throughout;
- diagram matches prose;
- examples match actual API/schema;
- links/anchors exist;
- recommendations follow cited evidence;
- no section contradicts the accepted design.

### Stage 7 — Render in the target medium
A source file is not the final artifact when rendering matters. Preview/render Markdown/Mermaid/HTML/PDF/other target as appropriate and inspect for clipping, broken diagrams, overflow, missing assets, unreadable typography, or inaccessible interactions.

### Stage 8 — Run truth and usability review
Ask:
- can the audience locate the primary decision/action quickly?
- which statements are fact vs proposal vs inference?
- are any claims unsupported?
- would a diagram imply a relationship that does not exist?
- can a future reader execute/maintain the artifact without chat context?

## Decision Rules
- Prefer explicit `unknown/not checked` to filling gaps with plausible content.
- A diagram should answer a question; split it when one view mixes topology, sequence, deployment, and ownership beyond readability.
- Use links/citations for external/current claims where traceability matters; do not fabricate sources.
- Generated charts/tables inherit their data provenance from DataViz/research packets.
- If artifact changes as the design changes, reconcile every diagram/example/decision reference before completion.
- Interactive artifacts need keyboard/accessibility/fallback behavior appropriate to their use; visual novelty is not a substitute for communication.
- Keep implementation details out of an executive/decision artifact unless they materially change the decision.
- Use the repository/designated artifact destination; do not litter roots/temp paths.

## Invariants
- Every factual claim is source-backed or clearly labeled as inference/proposal.
- No fake data, citations, test results, architecture components, or case studies.
- Diagram/prose/examples describe the same design.
- Target rendering is checked when rendering is part of delivery.
- Artifact stands alone without requiring hidden conversation context.
- Audience can identify the primary decision/action.

## Failure Taxonomy
### Content hallucination
Missing fact is filled with plausible detail. Remove/research/label unknown.

### Diagram semantic drift
Diagram no longer matches current design or implies false flow. Regenerate/reconcile.

### Template bloat
Generic sections obscure the document's job. Remove sections without decision value.

### Source/render mismatch
Markdown/HTML code looks valid but target renderer clips/breaks assets/diagram. Verify rendered output.

### Internal contradiction
Versions/names/decisions differ across sections. Establish one canonical claim map and reconcile.

### Audience mismatch
Document is technically complete but too low/high altitude for intended reader. Reorganize around their decision/action.

### Link/source rot
Critical evidence points to invalid/missing paths. Repair or preserve relevant content locally when appropriate.

## Anti-Patterns
- fake metrics to make proposal persuasive;
- Mermaid diagram full of decorative boxes with no clear edge semantics;
- generic "Overview / Architecture / Conclusion" template regardless of job;
- copying raw research notes without synthesis;
- using callout blocks everywhere;
- claiming rendered/accessible without previewing target medium;
- architecture prose updated while diagram remains stale;
- citations that do not support the sentence;
- giant wall of implementation detail before the main decision.

## Artifact Packet
```text
Audience / job:
Artifact type + destination:
Claim/source map:
Decisions vs assumptions vs unknowns:
Structure rationale:
Diagram(s) + question answered:
Data/source provenance:
Internal consistency checks:
Rendered validation:
Accessibility/usability check:
Known limitations:
```

## Completion Criteria
Artifact completes when:
- content is evidence-grounded and audience/job-aligned;
- structure supports the intended decision/action;
- diagrams/examples/data are semantically consistent;
- unknowns are explicit rather than invented;
- target rendering/links/assets are validated;
- a zero-context reader can understand and use the artifact.

## Progressive Resources
- Deep guide: `references/source-grounded-artifact-design.md`
- Existing guide: `references/artifact-composition-guide.md`
- Example: `examples/system-architecture-diagram.md`
