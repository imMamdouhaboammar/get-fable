# Fable Eco Release and Rollout Plan

## 1. Release strategy

Ship Eco in phases so the provisioner can become reliable before runtime orchestration is allowed to affect completion workflows

## 2. Milestone M0: contracts only

Deliver:
- schemas
- manifest examples
- Rust model types
- validation tests
- CLI JSON envelope types
- no install mutation

Exit gate:
- schemas round-trip
- invalid fixtures rejected
- canonical IDs and source strategies locked

## 3. Milestone M1: local planning preview

Deliver:
- machine discovery
- catalog loader
- profile expansion
- dependency/conflict resolver
- version metadata fixtures
- `eco discover`, `catalog list`, `profiles`, `plan`

Mutation remains disabled

Exit gate:
- deterministic plan fixtures on supported platform snapshots
- no network required in test suite
- resolver property tests pass

## 4. Milestone M2: transaction engine with fixture drivers

Deliver:
- journal
- staged filesystem operations
- rollback
- fake package manager drivers
- fault injection

Exit gate:
- crash at every injected stage yields defined recovery
- repeated install/remove model is idempotent

## 5. Milestone M3: real stable install drivers

Deliver qualified drivers in this order:
1. bundled/copy_skill
2. GitHub release or binary archive
3. Git exact revision
4. Bun/npm exact package
5. uv tool
6. Cargo exact package

Exit gate:
- each driver has isolated integration fixtures and one real upstream qualification job

## 6. Milestone M4: host adapters

Start with hosts whose config format and extension mechanism are already supported well by get-fable. Add host adapters one by one through qualification suite

Exit gate:
- config ownership and removal tests pass
- enforcement grade is computed rather than assumed

## 7. Milestone M5: curated beta profile

Enable a small profile of 4 to 6 low-risk capabilities. Do not begin with all candidates

Recommended beta set:
- superpowers
- guard-skills
- ponytail
- MarkItDown or another low-risk document tool
- one code intelligence provider
- one deterministic browser provider where prerequisites are reliable

Exit gate:
- clean-machine E2E
- no-op reinstall
- repair
- uninstall
- update with pinned fixture

## 8. Milestone M6: capability runtime preview

Deliver:
- playbook parser
- runtime candidate filtering
- execution contract
- explain-run
- no automatic invocation for high-risk capabilities

Exit gate:
- runtime selects minimal capability set on golden tasks
- existing Fable routing decisions remain unchanged

## 9. Milestone M7: evidence bridge

Deliver adapters for a small number of deterministic outputs. Evidence mapping is reviewed against existing completion semantics

Exit gate:
- no capability can widen completion type
- stale/mutation generation behavior remains intact

## 10. Milestone M8: security and specialized profiles

Enable Strix or other active security capability only after target-scope policy and security tests pass

## 11. Channels

### `experimental`
May change schemas within documented pre-stable policy. Includes experimental capability adapters

### `beta`
Schemas are migration-supported. Mutating provisioner enabled. Stable catalog subset only

### `stable`
Backward-compatible V1 CLI JSON contracts, lock migration support, tested transaction recovery, and qualified stable capability set

## 12. Migration

Eco is additive. Existing get-fable installations without Eco state continue to work. `get-fable doctor` can report Eco as not initialized without failure

No automatic migration of arbitrary existing third-party installations into Eco ownership. Discovery may recognize them as `external-unmanaged`. User can adopt only through an explicit `eco adopt` feature in a later release after ownership semantics are designed

## 13. Go/no-go stable criteria

No-go if any are true:
- known transaction path can lose user config
- open journal can be ignored by another mutating command
- official catalog can execute arbitrary manifest shell code
- lock can resolve a mutable branch as committed stable state
- security capability can run active testing without scoped authorization
- secrets appear in support bundle or logs
- host adapter remove can delete non-owned configuration
- runtime can override canonical Fable routing or completion evidence semantics
