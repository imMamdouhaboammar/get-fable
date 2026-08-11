# ADR-001: Portable process controls for AI coding agents

## Status

Accepted

## Context

AI coding agents differ in model behavior, tool access, context handling, and host environment

Across those differences, many failures come from execution discipline rather than one specific model capability

Common examples include

- implementation beginning before requirements are stable
- important decisions disappearing into conversation history
- repeated command failures without a change in diagnosis
- agent handoffs without clear state
- completion claims without tests or observable evidence

The project also needs to reuse public prompt, skill, and agent material without turning upstream names into claims of official affiliation or model equivalence

## Decision

Build `get-fable` as a local-first CLI with four independent responsibilities

1. project-local specification, ledger, progress, and verification files
2. lifecycle hooks for supported agent environments
3. an organized library of reusable prompts, skills, agent definitions, reminders, MCP references, and starter components
4. a small OpenAI-compatible request-enrichment proxy with explicit limits

The project will describe compatibility according to what the code implements, not according to what a Markdown file could theoretically be copied into

## Design principles

### Inspectable over implicit

Important execution state belongs in files that can be reviewed, diffed, and committed

Hook behavior belongs in source files that can be read before installation

### Process controls over model imitation

The project does not promise to turn one model into another model

It does not claim to reproduce a proprietary model, vendor tier, private service, or hidden reasoning process

The product value is the surrounding workflow: planning, state, failure handling, reusable instructions, and evidence checks

### Narrow compatibility claims

A target is called automatic only when installer code exists for it

A request format is called supported only when the normalizer handles that shape in source

A reusable Markdown asset is not enough to claim automatic support for the host application that might read it

### Local configuration should stay visible

The installer uses ordinary files under user configuration directories rather than a hidden remote control plane

The router only forwards requests when an upstream URL is explicitly configured

## Components

### Project initializer

Creates

```text
.fable/LEDGER.md
.fable/PROGRESS.md
.fable/VERIFIER_PROMPT.md
.agents/skills/fable-mode/SKILL.md
.agents/rules/fable5-mode.md
docs/SPEC.md
```

Existing template targets are skipped

### Claude Code integration

Installs the Fable Mode skill, lifecycle hooks, hook registrations, and the Fable rules under the Claude configuration directory

### Antigravity / Gemini config integration

Installs the repository's plugin package, skill files, rules, and supported hook registrations under `~/.gemini/config`

The path and packaging convention are documented as this repository's current target, not as a universal statement about every Gemini CLI release

### Agent Kernel integration

Copies the Fable rules when an existing `~/.agent-kernel` directory is detected

### Asset library

Keeps reusable material grouped by purpose and exposes repository-backed enumeration through the CLI and `AssetsManager`

### Request enrichment proxy

Accepts OpenAI-style chat endpoints, normalizes the request shapes implemented in `ProviderTranslator`, prepends the configured prompt context, and optionally forwards to one upstream URL

It is middleware for development use, not a full provider gateway

## Explicit non-goals

The current project does not aim to

- guarantee model correctness
- eliminate hallucinations
- reproduce proprietary model behavior
- claim official Anthropic, Google, OpenAI, Cursor, or other vendor affiliation
- provide a complete protocol adapter for every model provider
- automatically configure every coding IDE or agent
- act as a hardened internet-facing API gateway

## Provenance decision

Upstream names and source references are kept for attribution and traceability

Marketing copy should not call bundled material "internal Anthropic" or use similar wording unless an independently verifiable first-party source establishes that claim

The repository should instead state where material was obtained, identify known source licenses, and avoid transferring ownership claims from a public archive to the project author

See [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)

## Consequences

### Benefits

- public claims stay closer to the code
- users can see what the installer changes before running it
- project state can survive context loss and agent handoff
- model and provider names can change without forcing a README rewrite each time
- third-party provenance is easier to audit

### Costs

- the workflow adds files and verification steps
- hooks can interrupt an agent that would otherwise continue
- global installation changes local configuration and should be reviewed before use
- the router remains intentionally limited and requires additional controls before network exposure

## Follow-up rule

When implementation and documentation disagree, either update the implementation or narrow the documentation

Do not solve that mismatch with a broader marketing claim
