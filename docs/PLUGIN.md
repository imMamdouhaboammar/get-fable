# ChatGPT and Codex plugin package

`get-fable` includes a skill-only OpenAI plugin package at the repository root.

## What is universal

The public plugin surface is intentionally small and portable:

```text
.codex-plugin/plugin.json
skills/
  get-fable/
  fable-plan/
  fable-execute/
  fable-verify/
  fable-recover/
```

These skills contain the workflow contract shared by supported ChatGPT and Codex plugin surfaces.

The package does not declare an MCP server or app because the repository does not currently ship a plugin MCP/app companion. The existing local request-enrichment proxy is a separate developer feature and is not represented as an MCP server.

## Routing

`get-fable` is the entry skill. It routes substantial work by task state:

```text
scope unclear -> fable-plan
scope stable  -> fable-execute -> fable-verify
failure/drift -> fable-recover -> plan or execute -> verify
```

The routing contract is explicit in `skills/get-fable/SKILL.md`. There is no claim of hidden or model-level routing.

## Codex-specific support

Codex can additionally use repository-local agent profiles from `.codex/config.toml`:

- explorer
- planner
- executor
- verifier
- recovery
- reviewer
- docs researcher

The specialist profiles intentionally omit hard-coded model IDs so they inherit the active Codex environment instead of aging with a particular model name.

These agent profiles are a Codex-specific aid. They are not presented as universal ChatGPT plugin components.

## Repository rules

Root `AGENTS.md` defines the repository execution contract and maps get-fable work to the specialist skills. Existing `.fable` files remain the durable project state used by the workflow when active.

## Validation

Repository tests assert that:

- the plugin manifest parses and uses strict semver
- the plugin is skill-only unless real MCP/app companions are added
- every routing target has a `SKILL.md`
- no routing reference points at a missing skill

The repository CI remains the release gate through `bun run typecheck`, `bun test`, build, CLI smoke tests, and package-content inspection.

## Compatibility language

Use these terms precisely:

- **plugin support**: the `.codex-plugin/plugin.json` package and `skills/` are present and validated
- **Codex agent support**: `.codex/config.toml` and its agent profiles are present
- **request compatibility**: the local proxy accepts a documented request shape
- **reusable asset**: a file can be consumed manually but is not automatically installed

Do not use one category as evidence for another.
