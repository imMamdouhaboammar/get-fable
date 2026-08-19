# Independent Oracle Derivation Guide

## Rules
1. **Independent Reference**: The oracle must NOT share assumptions with the code under test.
2. **Contract Search**: Trace all callers across the repository to uncover implicit contracts.
3. **Workspace Inviolability**: Preserve untracked user files; never perform destructive cleanups.
