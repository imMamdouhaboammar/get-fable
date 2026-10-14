# Evidence Needs an Owner

## Problem

A state file was bound to one workspace, but each evidence record could carry a
different `workspaceId`. The completion gate checked generation and result, not
that the proof belonged to the state it was closing.

## Incorrect assumption

Validating only the container's identity is sufficient. Nested proof can still
be imported or constructed with different provenance.

## Engineering concept

Provenance must be checked at the point where evidence is created, when durable
state is loaded, and again when a completion decision consumes it. These checks
protect different paths: public APIs, persisted or edited files, and unvalidated
in-memory objects.

## What get-fable now does

New records are deterministically stamped with the owning state's content-safe
workspace digest. An explicit mismatch is rejected. Older unbound records remain
readable, but cannot count as fresh completion proof. TypeScript and Python hooks
apply the same policy.

Migration follows the same rule: upgrading a legacy container may assign the
container an owner, but it must not manufacture provenance for evidence that was
recorded before evidence-level ownership existed.

## Failure case

Before the change, a current-generation passing test record with a foreign owner
advanced `verifiedGeneration` and permitted `verifying -> complete`.

## Tests proving behavior

`test/evidence-provenance.test.ts` covers public API rejection, persisted-state
validation, and legacy records. `test/hook-evidence-policy-v2.test.ts` proves the
Python close guard rejects foreign proof and blocks unbound historical proof.
