---
name: fable-discover
description: Gather the smallest set of repository, environment, documentation, and runtime evidence needed before planning or changing code. Use when load-bearing facts are unknown, current behavior must be traced, or external API behavior can change the design.
version: 1.3.0
pack: core
inputs:
  - exploration_target
requires:
  - codebase_access
produces:
  - repository_evidence
  - execution_path
gates:
  - load_bearing_unknowns_resolved
fallback: fable-recover
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - get-fable
  continuations:
    - fable-research
    - fable-plan
    - fable-execute
  lateral_peers:
    - fable-memory
  recovery: fable-recover
---

# fable-discover

Grounding and evidence discovery engine for unfamiliar codebases and execution paths.

## Purpose
Resolve load-bearing unknowns and trace real execution paths before committing to architecture or code changes.

## When to Use
- Starting work on an unfamiliar codebase or repository area.
- Tracing execution flow from entry points down to database or API boundaries.
- Resolving environment, dependency, or configuration unknowns.

## When NOT to Use
- Making trivial single-line typo fixes with obvious locations (use `fable-execute`).
- Running existing test suites (use `fable-verify`).

## Inputs
- **`exploration_target`**: The component, feature, or unknown behavior to investigate.

## Expected Outputs
- **`repository_evidence`**: Concrete, file-located facts tagged as [measured] or [inferred].
- **`execution_path`**: Step-by-step trace of symbols, call sites, and contracts.

## Procedure
1. Locate manifests (`package.json`, `Cargo.toml`, `pyproject.toml`) and project instructions (`AGENTS.md`, `README.md`).
2. Search relevant symbols and follow imports across the call hierarchy.
3. Classify findings into [measured], [inferred], and [unresolved].
4. Hand off to `fable-plan` if architecture is needed, or `fable-execute` if bounded.

## Decision Rules
- Stop gathering as soon as load-bearing architectural questions are answered.
- If a measured fact contradicts an assumption, immediately discard the assumption.

## Tool Policy
- Use read-only search tools (`grep_search`, `find_by_name`, `view_file`).
- Do not modify source files during discovery.

## Evidence Requirements
- At least one [measured] file path and symbol proof for each load-bearing fact.

## Failure Handling
- If symbols cannot be located, check for dynamic loading, plugins, or codegen in build scripts.

## Completion Criteria
- All load-bearing unknowns are resolved and tagged with concrete source citations.

## Progressive Resources
- Protocol: `references/evidence-gathering-protocol.md`
- Example: `examples/codebase-inspection.md`
