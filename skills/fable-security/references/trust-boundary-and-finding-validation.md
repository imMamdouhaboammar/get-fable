# Trust Boundary and Finding Validation

Security analysis gets useful when it stops naming vulnerability classes and starts proving whether an attacker-controlled value can cross a boundary into an effect that should have been forbidden.

## Source-to-sink trace
For each candidate issue write:

```text
Attacker/source
→ decoding/normalization
→ validation
→ authentication context
→ authorization/ownership decision
→ transformation/storage/queue
→ sensitive sink or privileged side effect
```

If one hop is only assumed, mark it unresolved rather than filling it with model knowledge.

## Authentication vs authorization
Common false confidence:
- route requires login;
- object ID comes from the URL;
- database query fetches object by ID;
- code mutates it.

The missing question is whether the authenticated principal owns/is allowed to mutate that object. Review tenant/resource scoping at the data or service boundary, not only middleware presence.

## Canonicalization hazards
Containment and allowlist checks can be bypassed when meaning changes after validation. Pay special attention to:
- URL redirects, DNS resolution, IP forms;
- percent/Unicode decoding;
- filesystem `..`, symlinks, archive paths;
- case normalization;
- template/shell/query escaping contexts.

Validate the canonical value that reaches the sink.

## Async trust boundaries
Queues, scheduled jobs, webhooks, and background workers frequently receive claims that were valid in an earlier request context. Decide which properties must be revalidated at consumption time: tenant ownership, authorization, expiry, idempotency, signature, or resource state.

## Race and TOCTOU
A correct check can still be insecure when state changes before use.

```text
check permission/file existence/balance
... await / concurrent mutation ...
perform privileged action
```

Seek atomic database constraints/transactions, file-descriptor based operations, locks, idempotency keys, or revalidation at the point of effect rather than widening timing assumptions.

## Finding validation ladder
1. Is attacker control real?
2. Is the path reachable in deployed/runtime configuration?
3. Does sanitization/authorization actually fail for that path?
4. Does the sink create a security-relevant effect?
5. What prerequisites reduce exploitability?
6. What is the affected scope: one user, another tenant, server/network, supply chain?
7. Can the behavior be demonstrated safely in a local fixture/test?

If steps 1-4 are not established, label the item candidate/unvalidated rather than a confirmed vulnerability.

## Severity calibration
Do not inherit scanner severity blindly. Consider:
- remote vs local access;
- authentication requirements;
- user interaction;
- tenant/data scope;
- confidentiality/integrity/availability effect;
- persistence;
- exploit reliability;
- existing compensating controls.

## Secret incidents
If a real credential entered chat/source/log/history/artifact, redaction alone does not make it safe again. Record exposure without reproducing the value, remove the exposure path, and recommend rotation/revocation through the appropriate secure mechanism.

## Safe testing
Prefer unit/integration fixtures, local disposable environments, and non-destructive payloads. Never escalate into real external exploitation merely to increase confidence without explicit authorization and appropriate safety constraints.