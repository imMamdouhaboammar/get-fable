# Verification Matrix and Evidence Strength

Use this guide to choose evidence that matches the risk actually introduced by the diff.

## Build the matrix from claims
For each material change, write one claim that must be true and one plausible way it could be false.

Example:

```text
Claim: CLI still works after package export change
Failure mode: source tests pass but published tarball omits executable
Evidence: npm pack contents + clean install + CLI smoke
```

This is stronger than defaulting to whatever command is easiest to run.

## Evidence strength is claim-specific

### Test evidence
Strong for behavior exercised by the test. Weak for package/export/runtime paths it bypasses.

### Build/typecheck evidence
Strong for compilation/type constraints. Weak for semantic runtime correctness.

### Runtime smoke
Strong for entrypoint wiring and basic integration. Weak for deep edge cases unless specifically exercised.

### E2E
Strong for assembled user paths. Expensive and often poor at isolating cause; pair with narrower checks.

### Security scan
Strong only for its scanner/rule coverage. Never substitutes for functional tests.

### Review evidence
Useful for plausible risks that automation cannot directly prove. It is not machine execution evidence.

### Package/registry evidence
Necessary for distribution claims. Source tree correctness does not prove what users install.

## Freshness
Evidence becomes stale when a relevant mutation occurs after it was collected. Track at least the workspace generation; use commit/artifact/package hashes when the boundary is external.

Examples:
- unit tests before a refactor are stale for the refactored code;
- package smoke before `files` whitelist changes is stale for distribution;
- security scan before dependency changes is stale for dependency risk.

## Narrow → broad ordering
A useful sequence:
1. focused regression/contract tests;
2. affected package/module tests;
3. typecheck/build;
4. integration/runtime/E2E based on blast radius;
5. repository-required release gates.

The order preserves causality without weakening final coverage.

## Flakiness
A passing rerun does not erase a failing run when state is nominally identical.

When results alternate:
- record both;
- capture seed/time/order/environment;
- isolate shared state/timing;
- route to recovery if the cause is not immediately obvious;
- do not report the last green run as final proof.

## External limitations
If the local environment cannot run a required gate—real browser, cloud integration, registry publish, target OS—mark the claim `INCOMPLETE` and name the exact external action needed. A simulated substitute may reduce risk but must not be labeled equivalent proof.

## Verification report quality test
A reader should be able to answer:
- what changed;
- what could have broken;
- which command/probe tested each risk;
- whether the evidence is current;
- what was not tested;
- why PASS, FAIL, or INCOMPLETE is justified.