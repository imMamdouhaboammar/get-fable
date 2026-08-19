---
name: fable-research
description: Resolve current external facts against primary sources before they influence design or implementation. Use when API signatures, documentation, library versions, or external behaviors are uncertain.
version: 1.2.0
pack: intelligence
inputs:
  - research_query
requires:
  - primary_sources
produces:
  - research_evidence
  - source_backed_facts
gates:
  - primary_source_grounding
fallback: fable-discover
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-discover
  continuations:
    - fable-plan
    - fable-tdd
    - fable-execute
  lateral_peers:
    - fable-discover
  recovery: fable-recover
---

# fable-research

Primary source investigation for current external documentation, APIs, and dependencies.

## Purpose
Ensure external library contracts, SDK parameters, and cloud service APIs are grounded in primary sources rather than model memory.

## When to Use
- Working with third-party SDKs, external APIs, or rapidly evolving libraries.
- Checking breaking changes between major dependency versions.
- Resolving protocol, RFC, or cloud provider specifications.

## When NOT to Use
- Searching repository-local files (use `fable-discover`).
- Writing application code (use `fable-execute` or `fable-tdd`).

## Inputs
- **`research_query`**: Specific technical question or API contract to resolve.

## Expected Outputs
- **`research_evidence`**: Official documentation excerpts and exact parameter signatures.
- **`source_backed_facts`**: Grounded conclusions ready for architectural planning.

## Procedure
1. Identify the official authoritative documentation source.
2. Query the exact method signature, parameters, and error behavior.
3. Validate version compatibility with the repository's lockfile.
4. Record research evidence and hand off to `fable-plan` or `fable-tdd`.

## Decision Rules
- Prefer official documentation and upstream repositories over blog posts.
- If primary sources conflict with lockfile version, document the version delta explicitly.

## Tool Policy
- Use web search and URL reading tools targeting official domains.

## Evidence Requirements
- URL citation and verbatim signature quote from official vendor documentation.

## Failure Handling
- If external documentation is inaccessible, inspect bundled `@types` or source code in `node_modules`.

## Completion Criteria
- The target API contract is verified with zero ambiguous parameters.

## Progressive Resources
- Hierarchy: `references/primary-source-hierarchy.md`
- Example: `examples/research-api-specs.md`
