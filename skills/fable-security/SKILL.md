---
name: fable-security
description: Route security-sensitive software work to the correct security evidence path. Use for trust-boundary changes, authentication or authorization, untrusted input, secrets, privileged operations, security reviews, or vulnerability work.
---

# Fable Security

Choose the security question before choosing the scan.

## Routing

- Architecture or new privileged capability: establish or refresh the repository threat model.
- Pull request, branch, commit, or working-tree change: perform a security diff review.
- Repository-wide audit request: perform a repository security scan.
- Existing finding: validate the finding and attack path before repair.

When a host exposes Codex Security capabilities, use the matching specialist workflow. Otherwise apply the same scope discipline with repository-native review and tests.

## Contract

1. Identify assets, privileges, trust boundaries, and attacker-controlled inputs relevant to the requested change.
2. Keep the security scope explicit. Do not turn a diff review into an unrelated repository audit.
3. Preserve repository `SECURITY.md` guidance when present.
4. Validate reportable findings before treating them as defects.
5. Security evidence proves only the security question it actually checked. It does not replace functional verification.
6. Repairs return to `fable-tdd` or `fable-execute`, followed by fresh functional and security verification.

## Exit condition

The required security surface has been reviewed, reportable findings are accounted for, and the resulting security evidence is tied to the current affected scope.
