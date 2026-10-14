# Primary Source Hierarchy & Research Grounding

## Purpose
Establishes the evidence hierarchy and verification protocol for researching external APIs, third-party libraries, framework documentation, and deprecation schedules.

## The 4-Tier Source Hierarchy
When resolving external technical questions, prioritize sources according to their authoritative grounding:

| Tier | Source Type | Trust Level | Examples |
|---|---|---|---|
| **Tier 1** | **Authoritative Primary Source** | Highest | Official vendor documentation, open-source repository source code, formal RFCs, published API specifications. |
| **Tier 2** | **Official Release Material** | High | GitHub release tags, package changelogs, official migration guides, vendor deprecation notices. |
| **Tier 3** | **Verified Secondary Sources** | Moderate | Maintained third-party SDK documentation, package registry metadata (npm/PyPI), verified community adapters. |
| **Tier 4** | **Unverified Anecdotal Sources** | Low / Untrusted | Blog posts, community forums, outdated StackOverflow threads, hallucinated model training memory. |

## Research Protocol
1. **Extract Exact Version Target**: Identify the exact version of the library or tool in the workspace (`package.json` / lockfile).
2. **Consult Primary Documentation First**: Search official documentation for the matching major.minor version.
3. **Verify API Signatures in Source**: If documentation is ambiguous, inspect the published TypeScript `.d.ts` declarations or source repository directly.
4. **Synthesize with Source Attribution**: Cite primary URLs, version tags, and method signatures in the research deliverable.
