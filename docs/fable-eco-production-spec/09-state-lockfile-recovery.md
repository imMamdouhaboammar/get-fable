# Fable Eco State, Lockfile, Receipts, and Recovery

## 1. State layers

Fable Eco distinguishes desired state, resolved state, actual machine state, and transaction state

### Desired project state

`<repo>/.fable/eco.json`

Contains:
- schema version
- selected profile or explicit capability IDs
- policy reference
- host preferences
- provider preferences
- minimum capability contract versions

It does not contain installed paths or machine-specific artifact URLs

### Resolved machine state

`~/.fable/eco/locks/<profile>.lock.json`

Contains exact versions, revisions, digests, dependencies, drivers, and host binding decisions

### Actual machine inventory

`~/.fable/eco/inventory.json`

Contains what Eco believes it owns and current health summary. Inventory is reconciled against reality by `status` or `doctor`; it is not blindly trusted

### Transaction state

`~/.fable/eco/journals/active.json`

Exists only for a mutating transaction and contains enough operation state to resume validation or roll back safely

## 2. Inventory model

Per installed capability:
- capability ID
- manifest digest
- resolved version and revision
- install driver
- owned paths
- shared dependency refs
- host binding receipt IDs
- installed transaction ID
- last health status and timestamp
- current support tier

Inventory writes use compare-and-replace semantics under the Eco lock

## 3. Lockfile semantics

Lock is deterministic output of resolver. Same normalized catalog metadata, constraints, machine platform, and profile should generate byte-equivalent logical content aside from an excluded metadata timestamp field

Lock entries are sorted canonically by capability ID. Dependency lists and host bindings are canonicalized to make diffs meaningful

## 4. Receipts

Receipts are immutable historical records of committed transactions. They include operation outcomes and ownership data needed for removal or forensic diagnosis

Receipts exclude raw secret-bearing command environment and full arbitrary tool output

## 5. Journal durability

Journal records operation states:
- pending
- staged
- applied
- verified
- rolled_back
- rollback_failed

Before an operation becomes externally visible, enough rollback metadata must already exist in journal to recover from process termination. This is write-ahead behavior for owned mutations

## 6. Recovery algorithm

On detecting an active journal:

1. validate journal schema and transaction root
2. verify transaction belongs to current user state root
3. classify committed marker state
4. inspect every operation whose status indicates possible mutation
5. compare actual path digests or package facts against before and expected-after state
6. choose one of:
   - close completed commit
   - safe rollback
   - resume verification
   - manual recovery required
7. write recovery receipt
8. close journal only when state is internally consistent

## 7. Manual recovery state

Manual recovery is rare but explicit. CLI lists:
- affected operation IDs
- exact managed paths
- before digest
- expected after digest
- actual digest
- safe commands that do not destroy user data

Eco blocks further mutation but permits `status`, `doctor`, `plan`, and support bundle creation

## 8. Shared dependencies

Inventory maintains reference counts by capability ID and resolved dependency identity. Removing one capability does not remove a shared dependency still referenced by another committed capability

## 9. User edits after installation

If the user edits an Eco-managed config key or block, removal must not blindly restore the original whole file. The adapter compares ownership fragment and surrounding preconditions. If the owned fragment was altered, removal reports drift and either removes only provably owned keys or requires explicit confirmation

## 10. Garbage collection

`eco gc` is a later optional command. V1 cache cleanup is conservative and removes only unreferenced verified artifact cache entries older than policy retention. Receipts and locks are retained until explicit cleanup policy is introduced
