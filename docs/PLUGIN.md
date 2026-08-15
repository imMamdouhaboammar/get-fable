# ChatGPT, Codex, and Claude Code plugin package

`get-fable` 1.1.0 ships a skill-only OpenAI plugin (`.codex-plugin/plugin.json`) and a native Claude Code plugin and marketplace manifest (`.claude-plugin/marketplace.json` & `.claude-plugin/plugin.json`) whose universal surface is the canonical workflow under `skills/`.

## Canonical workflow

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
    SKILL.md
  fable-plan/
    SKILL.md
  fable-execute/
    SKILL.md
  fable-verify/
    SKILL.md
  fable-recover/
    SKILL.md
```

Every direct child under `skills/` is an importable skill directory with `SKILL.md`. The machine-readable workflow graph is stored as a resource inside the entry skill at `skills/get-fable/registry.json`.

`get-fable` is the only entry skill. The specialist skills have narrow responsibilities:

1. `fable-discover` resolves load-bearing facts
2. `fable-plan` turns grounded requirements into bounded cards
3. `fable-execute` implements one accepted card
4. `fable-verify` tries to falsify the result and records evidence
5. `fable-recover` diagnoses repeated or stale failure before another edit

The order is semantic, not cosmetic. Recovery has precedence over another blind retry. Verification has precedence over a completion claim. Discovery has precedence over architecture when important facts are still unknown.

## Plugin identity assets

`.codex-plugin/plugin.json` references the packaged square `assets/mascot.svg` for both the composer icon and plugin logo. The asset is part of the published package and remains package-relative.

## Universal versus host-specific support

The plugin manifests (`.codex-plugin/plugin.json` for ChatGPT/Codex, and `.claude-plugin/marketplace.json` / `.claude-plugin/plugin.json` for Claude Code) and root `skills/` are the universal package surface for supported AI plugin hosts.

Claude Code can install get-fable directly via its marketplace command:
```bash
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

Codex can additionally use repository-local agent profiles in `.codex/agents/`. Those profiles map to the same workflow.

Antigravity and CLI-driven Claude integrations can also be installed via `get-fable install`. All host adapters consume the canonical root skills.

## No synthetic MCP claim

The package does not declare an MCP server or ChatGPT app companion because the repository does not currently ship either as part of this plugin.

The local HTTP request proxy is a separate developer feature. It accepts documented request shapes and can optionally forward them upstream. It must not be represented as an MCP server.

## Contextual prompt compilation

The local proxy no longer injects a large historical prompt pack into every request. It now:

1. normalizes the incoming request
2. extracts the latest user intent when available
3. routes the task with the canonical registry
4. compiles a short core contract plus only the selected specialist skill
5. adds compact `.fable/state.json` context when present
6. preserves the caller's existing system message after the Fable directive

Preview responses expose the selected skill, confidence, routing reasons, and allowed next skills. They do not expose private reasoning.

## Durable state and completion

Initialized projects receive `.fable/state.json` schema version 1. It records the workflow phase, current skill, failure streak, last routing decision, and evidence records.

For substantial work, the state machine rejects a transition to `complete` until passing evidence exists. Markdown files remain the human-readable working record:

- `docs/SPEC.md`
- `.fable/LEDGER.md`
- `.fable/PROGRESS.md`

## Validation

`get-fable doctor` and repository tests verify the package-critical contract, including:

- manifest presence and strict semver coverage in tests
- required package-relative logo and composer icon assets
- square SVG branding dimensions
- direct `skills/` children are directories containing `SKILL.md`
- the complete six-skill registry under `skills/get-fable/registry.json`
- no dead skill transitions
- Codex agent references
- deterministic routing precedence
- state transition validity
- evidence-gated completion
- contextual prompt compilation
- project and Antigravity installation
- JSON contracts for `route`, `doctor`, and `status`
- package contents

The plugin remains deliberately narrow in its claims. It can improve execution discipline around an LLM. It does not change model weights, reproduce a proprietary model, expose hidden reasoning, or guarantee equivalent benchmark performance.
