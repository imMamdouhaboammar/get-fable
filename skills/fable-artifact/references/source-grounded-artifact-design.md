# Source-Grounded Artifact Design

A durable artifact should survive separation from the conversation that created it.

## Claim map before prose
Build a small internal map:

```text
Claim / decision
Type: measured | sourced | inferred | proposed | unknown
Source/evidence
Where used in artifact
```

This prevents a polished document from quietly promoting assumptions into facts.

## Structure by reader job

### Decision maker
Lead with decision/options/trade-offs/risks. Push implementation mechanics later.

### Implementer
Lead with contract, boundaries, sequence, acceptance, failure/rollback details.

### Operator/runbook user
Lead with trigger, safety prerequisites, diagnosis, exact actions, verification, rollback/escalation.

### Reviewer
Make assumptions, evidence, alternatives, and unresolved risks easy to challenge.

## Diagram discipline
A diagram should answer one question:
- What components exist and who owns them?
- How does one request/event flow?
- How does state transition?
- How is the system deployed?

When one graph tries to answer all four, split it.

Every edge should have an interpretable meaning: call, event, data flow, dependency, ownership, deployment connection. Avoid decorative arrows.

## Internal consistency review
Search the artifact for:
- repeated component/API/version names;
- numeric values/limits;
- status labels;
- terminology synonyms that may actually refer to different things;
- diagrams that use retired names;
- examples that predate the latest contract.

Treat disagreement as a defect, not copy-editing trivia.

## Render verification
If the user consumes rendered output, inspect the render. Common failures:
- Mermaid label parsing;
- clipped diagrams;
- code lines overflowing PDF/page;
- broken relative images/links;
- dark-mode contrast;
- interactive content inaccessible without mouse;
- fonts/assets unavailable outside author environment.

## Citation quality
A link is not enough. The source must actually support the claim and be current/applicable to the version/context stated. If a statement is a design recommendation, label it as a recommendation instead of attaching a citation that only supplies background.

## Unknowns
Use explicit unknowns/TBD only when genuinely unresolved and decision-relevant. Do not fill them with invented dates, owners, metrics, infrastructure, or performance numbers just to make the artifact appear finished.

## Standalone test
Give the artifact to a hypothetical reader with no chat history. They should know:
- why it exists;
- what is fact vs decision;
- what to do/decide;
- what remains uncertain;
- where key evidence came from;
- whether diagrams and examples match the text.