# ChatGPT, Codex, and Claude Code plugin package

`get-fable` 1.5.0 ships a skill-only OpenAI plugin (`.codex-plugin/plugin.json`) plus a native Claude Code plugin and marketplace manifest (`.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`). The universal semantic surface is the canonical lifecycle under `skills/`.

## Canonical lifecycle package

```text
.claude-plugin/
  marketplace.json
  plugin.json
.codex-plugin/
  plugin.json
assets/
  mascot.svg
hooks/
  hooks.json
skills/
  get-fable/
    SKILL.md
    registry.json
  fable-discover/
  fable-research/
  fable-plan/
  fable-tdd/
  fable-delegate/
  fable-execute/
  fable-verify/
  fable-review/
  fable-security/
  fable-release/
  fable-handoff/
  fable-eval/
  fable-recover/
```

Every direct child under `skills/` is an importable skill directory with `SKILL.md`. The machine-readable graph lives inside the entry skill at `skills/get-fable/registry.json`.

`get-fable` is the entry router. The specialists are grouped into Core, Intelligence, Build, Proof, Delivery, and Evolution packs. Host adapters consume the same graph rather than maintaining separate routing semantics.

## Plugin identity assets

`.codex-plugin/plugin.json` references the packaged square `assets/mascot.svg` for the composer icon and plugin logo. The asset stays package-relative.

## Host support

### ChatGPT and Codex

The `.codex-plugin/plugin.json` manifest exposes root `skills/` as the plugin skill surface. Repository-local profiles under `.codex/agents/` can help Codex execute specialist roles without pinning a model.

### Claude Code

Claude Code can install get-fable through its marketplace package:

```bash
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

The Claude plugin packages the canonical skills plus lifecycle hooks for session context, delegation guardrails, failure tracking, mutation freshness, and completion enforcement.

### Antigravity / Gemini

`get-fable install` and `get-fable install-antigravity` copy the same canonical skills and shared Python hook implementations into the repository's supported Antigravity / Gemini target.

## No synthetic MCP claim

The plugin does not declare an MCP server or ChatGPT app companion because the repository does not ship either as part of this package.

The local HTTP request proxy is a separate developer feature. It is not an MCP server.

## Contextual prompt compilation

The local proxy compiles only the context needed for the current job:

1. normalize the supported request shape
2. extract the latest user intent
3. route with registry v2
4. compile the short runtime contract plus only the selected specialist skill
5. include routing reasons, required gates, and compact durable state
6. preserve the caller's existing system message after the get-fable directive

Preview responses expose routing metadata, not private chain-of-thought.

## Durable state and evidence

Initialized projects receive `.fable/state.json` schema version 3. It records:

```text
stateRevision
workspaceId
phase
currentSkill
failureStreak
substantial
mutationGeneration
verifiedGeneration
activeCard
lastDecision
evidence[]
updatedAt
```

The workspace identity is a short digest of the resolved project path. Schema-v2 and schema-v3 runtime state copied to another workspace is rejected instead of being trusted as current state. The repository itself keeps a workspace-neutral schema-v1 template so clones and CI can bind locally during migration.

New evidence is stamped with that same workspace identity. Explicitly foreign evidence invalidates persisted state, and legacy evidence without an owner remains historical rather than satisfying completion. The TypeScript runtime and Python completion hook enforce the same rule.

Every recognized workspace mutation advances `mutationGeneration`. Previous verification remains historical evidence but becomes stale for completion.

Evidence is typed by claim:

- test, build, runtime, review, observation: generic behavior-completion evidence
- security: may close a pure security-review task, but does not by itself prove a normal feature or bug repair
- research: decision evidence only
- receipt: execution provenance only
- handoff: continuity evidence only

This prevents a security scan, research result, or execution receipt from being widened into an unrelated correctness claim.

## Validation

`get-fable doctor` and repository CI verify package-critical contracts including:

- strict semver plugin metadata
- required package-relative square branding assets
- every direct `skills/` child contains `SKILL.md`
- all canonical Skills exist and match the generated catalog
- registry v2 pack, gate, fallback, transition, and parallel metadata is valid
- no dead next or fallback targets
- deterministic routing across research, TDD, delegation, review, security, release, handoff, eval, and recovery
- schema-v1 migration and schema-v2 workspace binding
- mutation-aware verification freshness
- typed evidence boundaries
- Claude and Antigravity hook parity
- project and host installation idempotency
- contextual prompt compilation
- CLI JSON contracts
- package contents, including lifecycle eval scenarios

The package improves execution discipline around an LLM. It does not change model weights, reproduce a proprietary model, expose hidden reasoning, or guarantee equivalent benchmark performance.
