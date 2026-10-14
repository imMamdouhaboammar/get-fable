# Repository Investigation Playbook

Use this when the codebase cannot be understood safely from one obvious file or symbol.

## Start from observables, not names
The fastest reliable trace usually begins at something the user or runtime can observe:

- CLI command/subcommand;
- HTTP route/RPC method;
- event topic/job name;
- UI action;
- plugin registration;
- persisted record;
- emitted artifact.

Find the bootstrap that connects that observable to code. A file named `auth.ts` is weaker evidence than the route registration that actually invokes an auth handler.

## Topology pass
Before deep tracing, answer:

- Is this a monorepo/workspace?
- Which package owns the runtime?
- Are source files executed directly or built first?
- Which directories are generated?
- Which manifests register plugins/commands/routes?
- Which test runner and configuration are active?
- Which configuration sources override which others?

This prevents a common failure: tracing the right symbol in the wrong package/artifact.

## Execution-path proof
For each hop, prefer evidence in this order:

1. runtime registration/dispatch;
2. direct call with concrete symbol;
3. typed interface + known implementation binding;
4. configuration/registry mapping;
5. import relationship;
6. name similarity.

Lower items are useful leads, not sufficient proof by themselves.

## Dynamic behavior checklist
When a path vanishes from static search, inspect:

- plugin registries and manifests;
- dependency injection containers;
- event emitters/subscribers;
- reflection/decorators;
- route auto-discovery;
- filesystem scanning;
- generated catalogs;
- runtime config selecting implementations;
- package exports/resolution aliases.

## Configuration precedence
Never report a default value as active behavior until precedence is known. Typical sources include:

1. hardcoded defaults;
2. checked-in config;
3. environment-specific config;
4. environment variables;
5. CLI flags;
6. runtime/remote configuration.

Record both the value and why it wins.

## Generated-code rule
If a file contains markers such as generated headers, catalog output, build artifacts, or deterministic formatting from a script:

- locate the generator;
- locate the source inputs;
- determine whether generated output is committed;
- edit/recommend the source-of-truth, not the artifact, unless the repository explicitly treats output as hand-maintained.

## Data and side-effect trace
For behavior that changes state, do not stop at business logic. Trace until the externally relevant side effect:

`entry → validation → domain logic → persistence/API/queue → response/event`

Record transaction boundaries, retries, idempotency, and asynchronous handoff points when they affect correctness.

## Test/runtime divergence
When a test passes but production behavior disagrees, compare:

- source vs built artifact;
- env/config;
- mocks/fakes vs real dependency;
- fixture shape vs real data;
- process working directory;
- feature flags;
- cache state;
- package version/resolution.

Do not use a passing test as evidence for a runtime path it does not execute.

## Stop heuristic
Discovery should stop when additional reading cannot reasonably change one of:

- selected Skill;
- architecture decision;
- target scope;
- acceptance test;
- risk/rollback strategy.

If new facts are only explanatory detail, hand off and continue only if the next specialist asks for them.