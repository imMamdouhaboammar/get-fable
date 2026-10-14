# Config Precedence, Permissions, and Hooks

Configuration failures are often not syntax failures. The file parses, but another scope wins, the host ignores the key, or a permission pattern grants more capability than intended.

## Precedence map
Before editing, identify the target host's effective order among possible sources:
- built-in defaults;
- system/global config;
- user config;
- project/repository config;
- environment variables;
- CLI flags/session overrides;
- generated/managed policy.

Do not assume this order—verify it for the host/version. Record why the edited source wins.

## Least-privilege allowlists
Permission patterns should encode the smallest capability needed.

Prefer:
- exact tool or command family;
- constrained path/workspace;
- read-only where mutation is unnecessary;
- separate approval for destructive/network/public actions.

Avoid broad shell/root wildcards whose semantics are difficult to audit. Always test at least one allowed and one nearby disallowed case.

## Hook verification
A hook has multiple failure points:
1. script/file exists;
2. config syntax references it;
3. event/lifecycle name is supported;
4. host actually registers/loads it;
5. hook receives expected payload/cwd/env;
6. exit/result has intended enforcement semantics.

A file sitting in `hooks/` proves none of steps 3-6.

## Secret-safe config
Keep secret values outside normal checked-in configuration. Store references such as environment variable names or secure credential identifiers. Examples/docs should use placeholders, never real credentials.

If a real secret is discovered in config/history, avoid echoing it and handle removal/rotation separately.

## Merge discipline
For user-managed config:
- parse current structure;
- modify only owned keys;
- preserve comments/format where format supports them and tools allow;
- do not drop unknown fields;
- write atomically where malformed intermediate state could break the host.

## Behavioral verification
Examples:
- permission: safe command runs without prompt; destructive neighbor still requires approval;
- hook: controlled lifecycle event produces expected state transition/guard;
- model setting: target host reports/resolves selected model/config;
- project override: running inside target repo differs from outside as intended.

## Host capability honesty
If a host cannot register lifecycle hooks, installing rule files is advisory support—not full enforcement. Configuration docs and tests should preserve that distinction rather than simulating capabilities the host does not expose.