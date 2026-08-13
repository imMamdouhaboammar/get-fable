---
name: fable-verify
description: Verify non-trivial coding work with adversarial review and real acceptance evidence. Use before declaring a substantial implementation complete, after a repair, or when tests alone may not prove the requested behavior.
---

# Fable Verify

Assume the implementation may be wrong and try to falsify it.

## Verification order

1. Re-read the user-visible acceptance criteria and relevant repository instructions.
2. Inspect the actual diff or changed paths, not a summary of them.
3. Check correctness, edge cases, regression risk, security boundaries, and missing tests.
4. Run focused tests first, then the broader repository gate when appropriate.
5. Exercise the real product path when static checks cannot prove the behavior.
6. Re-run the complete affected path after the final fix.

## Evidence standard

Report commands, results, and observable behavior. Do not substitute phrases such as "looks good" or "should work" for evidence.

If verification fails, identify the violated invariant and route to `$fable-recover` or `$fable-execute` depending on whether the diagnosis is already clear.
