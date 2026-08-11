# Security Policy

## Scope

`get-fable` changes local agent configuration, installs lifecycle hooks, reads bundled prompt and skill assets, and can run a local HTTP request-enrichment proxy

Security reports are especially useful when they involve

- unintended modification or loss of existing configuration
- path traversal or writes outside documented targets
- command execution through generated hook configuration
- proxy behavior that exposes credentials, request content, or upstream responses unexpectedly
- request handling that can be used for denial of service or network access outside the configured upstream
- malicious or unsafe behavior introduced through bundled third-party material

## Supported code

Security fixes target the current default branch and the latest published release when one exists

Older commits and forks are not maintained by this repository

## Reporting a vulnerability

Do not publish credentials, private prompts, exploit payloads, or sensitive user data in a public issue

Use GitHub private vulnerability reporting for this repository when it is available

If private reporting is not available, open a public issue that contains only a short description and a request for a private contact channel. Do not include working exploit details in that issue

A useful report includes

- affected command, module, or hook
- operating system and Bun version
- minimal reproduction steps
- expected behavior and observed behavior
- whether existing user files were modified
- impact and any conditions required to trigger it

## Local proxy boundary

The request proxy binds to `127.0.0.1` by default

CORS is disabled unless `FABLE_CORS_ORIGIN` is configured

The proxy does not provide its own user authentication or authorization boundary. If you deliberately bind it beyond loopback, protect it with network controls and an authenticated gateway appropriate to your environment

Inbound `Authorization` is forwarded only when an upstream URL is configured. Treat proxy logs and request bodies as potentially sensitive

## Configuration safety

The installer refuses to replace malformed JSON configuration files. Repair invalid JSON manually before retrying an installation

Project initialization does not replace existing generated target files. Review changes before deleting or resetting any project-owned configuration

## Third-party material

Bundled material may retain separate attribution or license terms. See `THIRD_PARTY_NOTICES.md`

A security issue in an upstream project may need to be reported to that upstream maintainer as well as here when the vulnerable material is redistributed by `get-fable`
