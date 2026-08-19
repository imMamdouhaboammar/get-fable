# Source Reconciliation Playbook

Use this when more than one apparently authoritative source exists or when current docs may not match the repository's pinned dependency.

## Evidence hierarchy is contextual
"Official" is necessary but not always sufficient. The strongest source is the one that is both authoritative and applicable to the exact target version/context.

For executable API behavior, a useful order is:

1. normative/versioned reference for the target version;
2. upstream source, generated types, or upstream tests at that tag;
3. official migration guide/release notes describing the change;
4. official examples for the same version;
5. secondary explanation as a lead only.

## Version reconciliation procedure

1. Read the repository's actual lockfile/package metadata.
2. Identify the exact version/range resolved in the environment if available.
3. Check whether official docs are versioned.
4. If docs describe latest only, inspect tagged source/types and release notes for the pinned version.
5. Write the delta explicitly: `repo uses X; feature/signature Y appears in Z`.
6. Decide whether implementation should stay compatible or include an upgrade card.

## Conflicting official sources
When two first-party sources disagree, do not average them.

Ask:
- Are they for the same version?
- Is one normative and the other tutorial material?
- Was one updated after the other?
- Does upstream code/test behavior settle the ambiguity?
- Is the difference conditional on runtime, tier, region, or feature flag?

Record the disagreement and the evidence used to resolve it.

## Behavior vs signature
A correct method signature does not prove runtime semantics. For behaviors such as ordering, retries, streaming, idempotency, timeout, transactionality, or error mapping, look for normative text or executable upstream tests/source.

## Negative evidence
"I couldn't find it" is not the same as "it is unsupported."

Before asserting absence:
- search versioned reference;
- inspect exported types/source;
- inspect migration notes;
- check renamed/deprecated paths;
- verify relevant platform/tier.

If absence remains unproven, say `not established` rather than `not supported`.

## Decision-ready note
A useful research note ends with a decision, not a bibliography:

```text
Claim: streaming tool deltas are available in SDK X.Y
Evidence: official reference + tagged type definition
Applicability: repository resolves X.Y
Constraint: callbacks are ordered per response but not across requests
Design implication: adapter may stream within one request; cross-request ordering requires local sequencing
Confidence: measured from first-party versioned sources
```

Stop once every external fact that can change the chosen implementation is at this level.