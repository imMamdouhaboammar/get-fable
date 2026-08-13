# ChatGPT and Codex plugin package

`get-fable` 1.1.0 ships a skill-only OpenAI plugin whose universal surface is the canonical workflow under `skills/`.

## Canonical workflow

```text
.codex-plugin/plugin.json
skills/
  registry.json
  get-fable/
  fable-discover/
  fable-plan/
  fable-execute/
  fable-verify/
  fable-recover/
```

`skills/registry.json` is the machine-readable workflow graph. `get-fable` is the only entry skill. The specialist skills have narrow responsibilities:

1. `fable-discover` resolves load-bearing facts
2. `fable-plan` turns grounded requirements into bounded cards
3. `fable-execute` implements one accepted card
4. `fable-verify` tries to falsify the result and records evidence
5. `fable-recover` diagnoses repeated or stale failure before another edit

The order is semantic, not cosmetic. Recovery has precedence over another blind retry. Verification has precedence over a completion claim. Discovery has precedence over architecture when important facts are still unknown.

## Universal versus host-specific support

The plugin manifest and root `skills/` are the universal package surface for supported ChatGPT and Codex plugin hosts.

Codex can additionally use repository-local agent profiles in `.codex/agents/`. Those profiles map to the same workflow but are not universal plugin components.

Claude and Antigravity integrations are adapters installed by the CLI. Their local copies must follow the canonical root skills rather than define a second workflow.

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

Repository tests verify:

- manifest shape and strict semver
- the complete six-skill registry
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
