# Security and privacy

## Trust boundary

Enabling Jev introduces a remote data processor into a previously local routing path.

That is a material trust-boundary change and must be explicit to users.

## Opt-in rule

Remote reflex mode is disabled by default.

Installer, init, doctor, and upgrades must not silently enable it.

## Secret minimization

Before remote submission:

- redact likely credentials
- do not read `.env`
- do not send repository files by default
- do not send command history
- do not send raw evidence details unless explicitly needed
- cap state size

## Prompt-injection / adversarial state

TypeSafe documents that Jev 1.13 can be influenced by adversarial content in state.

Therefore:

- task text is treated as untrusted data
- provider instructions are fixed by get-fable, not interpolated from user text
- canonical skill criteria come from registry/boundary definitions
- Jev output cannot directly trigger a side effect
- hard policy validates every proposed route
- security/release/recovery boundaries remain deterministic

## Data retention

TypeSafe documentation states customer requests/responses are not used to train Jev and mentions ZDR for enterprise customers. get-fable documentation should accurately describe the configured external provider and link to current TypeSafe legal documents rather than making stronger claims.

## API-key handling

- environment/secret manager only
- never store in `.fable`
- never print key suffix/prefix in normal diagnostics
- never include in crash reports
- redact authorization headers from debug logs

## Supply chain

If the TypeSafe SDK is added:

- pin exact version
- review license
- update lockfile
- update third-party notices if required
- include dependency in security audit
- verify package contents in prepack/CI

If direct HTTP is used, still pin the API/model contract in tests.
