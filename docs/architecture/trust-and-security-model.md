# Fable Trust and Security Model

**Status:** Proposed M0 security baseline  
**Date:** 2026-09-11  
**Scope:** Provider/plugin installation, execution trust, credentials, filesystem/shell/network/repository boundaries, approvals and auditability

## 1. Security premise

Fable Studio may hold source code, local repositories, Git credentials, SSH configuration, model credentials, browser sessions and cloud/service credentials. A Provider or Plugin can therefore be security-sensitive even when its visible purpose is only “memory”, “review”, “search” or “UI”.

The core rule is:

> Treat executable extension code as a trust boundary independent from model tool approvals.

Current DeepSeek Harness ecosystem guidance explicitly warns that installed DSH plugins execute third-party code with the user's own permissions, can read files/credentials/reach the network, and are not sandboxed merely by tool approvals. Fable cannot inherit marketplace installability as a security verdict.

## 2. Trust domains

```text
T0  Fable core distribution
    signed/reviewed Studio + Runtime + first-party Host Adapter

T1  reviewed first-party in-process provider
    shipped/pinned with Fable or separately reviewed and integrity-pinned

T2  isolated local provider
    subprocess/MCP/worker process with explicit OS/runtime permission envelope

T3  remote provider/service
    network boundary; explicit data/credential policy

T4  unreviewed candidate package
    metadata/source may be inspected; execution prohibited until approved
```

A provider may move between tiers only through an explicit review/release decision. Popularity or marketplace listing never upgrades trust automatically.

## 3. Installation pipeline

```text
Discover
  -> Fetch metadata/source without executing package code
  -> Parse package/provider manifest
  -> Identify executable entry points and install scripts
  -> Enumerate requested permissions and side effects
  -> Resolve source/publisher/version/integrity
  -> Perform static/security review appropriate to trust tier
  -> Compare with user/workspace policy
  -> Ask approval when required
  -> Pin exact version + integrity identity
  -> Install using bounded installer
  -> Health/conformance check
  -> Enable explicitly
  -> Audit activation
```

### Fail-closed rules

Do not execute/install when:

- source/version identity cannot be established for an executable third-party package;
- requested permissions exceed policy and no valid approval exists;
- package manifest asks for an unknown privileged permission domain;
- integrity verification fails;
- provider ABI/Host Adapter compatibility fails;
- health/conformance validation shows malformed contract behavior;
- install source redirects to an unapproved origin during a security-sensitive fetch without policy permitting it.

## 4. Package install scripts

Package-manager install scripts are executable code. They must be surfaced as part of review rather than treated as metadata.

For untrusted candidates, prefer metadata/source inspection that does not run lifecycle scripts. If installation requires scripts, that fact changes the permission/risk preview and may require isolated installation.

## 5. In-process provider policy

V1 permits in-process providers only when:

- first-party or explicitly audited;
- exact version/integrity pinned;
- permissions documented;
- Host Adapter compatibility tested;
- no safer transport materially satisfies the same use case without unacceptable loss.

Marketplace/external providers default to out-of-process transports where feasible.

## 6. Filesystem policy

Filesystem grants are explicit:

```text
read scope
write scope
delete/rename scope
symlink policy
special-file policy
workspace boundary
outside-workspace exceptions
```

A model-provided path is data, not authority.

The provider/Host Adapter must canonicalize paths according to the enforcement platform and reject scope escapes. Symlink/special-file behavior must be tested rather than assumed from string-prefix checks.

Shared workspace mutation is serialized by default at the scheduler level. Isolation/worktree policy is separate from path authorization.

## 7. Shell policy

Shell execution has a declared mode:

```text
none
read-mostly
workspace-write
full-access
```

The exact host mapping can differ, but the Host Adapter must reject an invocation if it cannot enforce the required ceiling without silently widening access.

Dangerous bypass modes are never selected by a Worker/model itself.

Command strings, arguments and environment inputs are separated where transport permits. Runtime policy decides whether shell execution is allowed; provider/model output merely proposes/request it.

## 8. Network policy

Network capability declares destination class/scope:

```text
none
explicit-hosts
provider-api
repository-host
browser-user-session
unrestricted
```

Credential-bearing requests require HTTPS or an explicitly trusted local/IPC transport. Non-loopback plaintext forwarding of bearer credentials is prohibited.

Providers cannot broaden allowed hosts through redirects without a redirect policy that revalidates the destination.

## 9. Credential model

Run/Task/Worker state contains only credential references.

```ts
interface CredentialRefV1 {
  providerId: string
  key: string
  scope?: string
}
```

Credential values:

- are resolved at operation time when possible;
- are passed only to the provider/executor that needs them;
- are never included in prompts unless the user explicitly chose a provider whose protocol inherently requires that secret and policy allows it;
- are never persisted in Fable Run events, artifacts or evidence metadata;
- are redacted from diagnostics/logs.

DSH CredentialProvider is one valid host implementation because safe `describe()` metadata is separated from secret-bearing `resolve()` and values need not cross remote/UI read boundaries.

## 10. Repository mutation policy

Repository permissions are split:

```text
repository.read
repository.write
repository.push
repository.pull_request.create
repository.review.write
repository.merge
repository.issue.close
```

Merge and Issue closure are not implied by ordinary repository write.

Before merge:

- re-read PR head SHA;
- re-read required checks/reviews;
- compare with approved/evidenced head;
- reject stale approval/evidence;
- apply branch/ruleset/provider constraints;
- require configured human approval when policy says so.

No force push or shared-history rewrite is permitted by default.

## 11. Human approval

Approval binds to an exact action envelope:

```text
action type
resource/repository
requested permissions
provider
side-effect class
relevant commit/operation identity
expiration if any
```

Approval is not a generic “allow this Worker forever” token unless an explicit policy defines such a scope.

A changed PR head, changed command, widened path/network scope or changed provider invalidates an approval when it changes the approved action identity.

## 12. DSH child-agent approval constraint

Current DSH continuable subagent design pins child approval policy to `never`. Fable therefore does not design privileged Worker execution around interactive approval occurring inside a DSH child Agent.

Preferred flow:

```text
Worker proposes typed capability invocation
  -> Runtime validates policy
  -> Runtime requests human approval if required
  -> Capability Broker invokes authorized provider/Host Adapter
  -> result/evidence returned to Worker/Task
```

This preserves agency authority even if the host's child-agent approval semantics change.

## 13. Dokion authority interaction

When an active Dokion Playbook governs work, its declared permissions/order/approvals are hard constraints in addition to Fable policy.

Effective authority is the intersection, never the union:

```text
allowed = Fable policy ∩ active Dokion contract ∩ provider/host constraints
```

Fable cannot “approve around” a Dokion denial, and Dokion approval cannot grant a permission that Fable policy prohibits.

## 14. Plugin revocation and update

Provider update is equivalent to new executable code.

Update flow repeats:

- compatibility check;
- integrity/source identity;
- permission delta;
- side-effect delta;
- install-script delta;
- conformance/health checks.

A permission increase requires explicit re-approval. Auto-update is limited to policies that explicitly allow the publisher/channel and cannot silently expand permissions.

Revocation disables new scheduling immediately. Active operations are cancelled where safe; uncertain external side effects enter reconciliation.

## 15. Audit trail

Security-relevant Run events include:

```text
provider.discovered
provider.enabled
provider.disabled
provider.update_requested
permission.requested
permission.granted
permission.denied
approval.requested
approval.decided
credential_ref.used
external_side_effect.started
external_side_effect.reconciled
repository.merge_requested
repository.merge_completed
```

Audit events contain stable IDs and bounded metadata, not secrets or full prompts.

## 16. Sandbox limitations

A sandbox capability is only as strong as the executing provider/host platform.

Fable must distinguish:

- model/tool sandbox policy;
- provider process isolation;
- plugin implementation isolation;
- workspace/worktree isolation;
- OS account/container/VM isolation.

No documentation may state “sandboxed plugin” merely because its tools run in a sandbox.

## 17. Browser sessions

Browser providers may hold authenticated user sessions. Therefore:

- browser session access is an explicit permission domain;
- page/site scope should be bounded where the provider supports it;
- cookies/session tokens are provider-owned and not copied to Run state;
- navigation to credential/phishing-sensitive domains follows provider/browser security policy;
- destructive remote actions still pass through Fable side-effect/approval policy.

## 18. Provider result validation

All provider output is untrusted input at the ABI boundary.

Runtime validates:

- schema;
- provider/capability identity;
- artifact references;
- evidence references;
- size limits;
- no undeclared permission escalation;
- no impossible lifecycle transition;
- no direct Run-complete command.

Malformed results fail the invocation and can mark the provider degraded when policy warrants.

## 19. Prompt injection boundary

External content returned by repository/search/browser providers is data. It cannot redefine Runtime policy, Provider ABI, permissions or approval requirements.

Workers may reason about external instructions only within their Task scope. Runtime control-plane decisions are derived from structured policy/state, not arbitrary fetched text.

## 20. Supply-chain controls

M8 marketplace requires, at minimum:

- immutable version identity;
- integrity digest;
- publisher/source metadata;
- provenance where available;
- explicit permission manifest;
- install-script declaration;
- compatibility/conformance result;
- revocation support;
- update permission-delta review;
- audit trail.

Signatures can strengthen provenance but do not replace source/permission/security review.

## 21. Security tests required before M6/M7

### Runtime / ABI

- denied permission prevents provider invocation;
- provider cannot forge another provider's EvidenceRef identity;
- raw credentials absent from serialized Run database fixtures;
- malformed provider output fails closed;
- approval for one action cannot authorize a changed action;
- cancelled Worker cannot later commit a privileged success transition.

### Workspace

- canonical path escape tests including symlink cases;
- shared-workspace mutation lease tests;
- worktree identity/isolation tests;
- special-file handling where supported.

### Repository

- stale PR head prevents merge;
- failed/current CI prevents merge;
- merge permission separate from push/write;
- duplicate/non-idempotent PR creation reconciliation.

### Provider installation

- integrity mismatch blocks activation;
- unknown permission domain blocks activation;
- permission increase on update requires review;
- install script is detected before execution;
- revoked provider cannot be newly scheduled.

## 22. Deferred hardening

The following are not needed to prove M1-M6 but block a public third-party Marketplace:

- cross-platform process isolation benchmark and escape analysis;
- signing/publisher identity policy;
- malicious provider test corpus;
- package provenance verification policy;
- network egress sandbox design;
- marketplace revocation distribution;
- remote-provider data-residency and enterprise policy profiles.

These are M8 blockers, not excuses to weaken Wave-1 trust boundaries.
