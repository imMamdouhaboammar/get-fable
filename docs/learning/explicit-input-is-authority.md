# Explicit Input Is Authority

## Problem

A lifecycle hook may receive a working directory from its host. If that value
names a deleted path, a regular file, or malformed input, silently substituting
the hook process directory can select an unrelated initialized project.

## Incorrect assumption

An invalid explicit path is equivalent to no path being supplied.

## Engineering concept

Fallbacks are safe only when authority is absent. Once a caller supplies an
authority-bearing value, invalid input must not widen authority to ambient
process state.

## What get-fable now does

Python lifecycle hooks use the process working directory only when workspace
authority is absent from the payload. A canonical `cwd` or host alias remains
explicit through normalization; its value must be a non-empty string naming an
existing directory, otherwise lifecycle handling becomes a no-op.

## Failure case

```text
hook process cwd = project A with .fable state
payload cwd = deleted project B
old behavior = read or mutate project A
new behavior = no state discovery
```

## Test proving behavior

The hook-state and host-dispatch tests run mutation and profile hooks from an
armed process workspace while supplying missing, file, empty, null, non-string,
NUL-containing, and normalized invalid paths. They prove the unrelated state is
byte-identical and that omitted `cwd` still preserves compatibility.
