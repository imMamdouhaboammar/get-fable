# Parallelism and Integration Guide

Delegation is an optimization. Use it only after the work has a stable enough shape that independent workers can make progress without redefining each other's reality.

## Independence has three dimensions

### Write independence
Workers do not contend for the same mutable files/resources.

### Semantic independence
Workers do not independently redefine one shared API, schema, invariant, migration assumption, or rollout contract.

### Verification independence
Each worker has a local acceptance check that means something before integration, and the parent has a separate combined check afterward.

All three matter.

## Safe pattern: stable interface, isolated implementations

```text
Parent stabilizes Exporter interface
  ├─ Worker A: PDF implementation + PDF tests
  └─ Worker B: CSV implementation + CSV tests
Parent: register both + integration smoke
```

## Unsafe pattern: hidden shared invariant

```text
Worker A changes token serialization
Worker B changes token parser
```

Even if they edit different files, both are defining one wire contract. Stabilize the format first or serialize the changes.

## Shared integration files
A central router, registry, package manifest, generated catalog, or exports file often becomes a false conflict hotspot.

A useful pattern:
- workers own component implementation only;
- parent owns final registration/integration;
- generated catalogs are regenerated once after integration.

## Read-only parallelism
Multiple investigators/reviewers can inspect overlapping code safely if they do not mutate it. Good uses:
- research competing hypotheses;
- code review by different specialties;
- locating references/call sites;
- threat-model and correctness review in parallel.

Merge findings by evidence quality, not by vote count.

## Worker return packet
Require:

```text
Objective completed/not completed
Files/surfaces changed
Commands run + results
Acceptance evidence
Assumptions discovered false
Residual risks
Requested scope expansion (if any)
```

If the worker cannot provide concrete evidence, treat the result as unverified.

## Integration checklist
After all returns:
- inspect combined diff;
- check shared contract consistency;
- resolve ordering/manifest/generated artifacts;
- rerun affected integration tests after the final integration mutation;
- reject stale worker evidence if parent integration changed relevant code;
- record which worker failure, if any, remains unresolved.

## Cost heuristic
Do not delegate when explanation + startup + integration costs more than direct execution. Small mechanical edits, tightly coupled fixes, or tasks with one unresolved architectural question are usually faster and safer serially.