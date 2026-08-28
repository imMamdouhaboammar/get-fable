---
name: get-fable
description: >
  Route and orchestrate the canonical get-fable coding lifecycle — discover, research, plan, build, verify, review, secure, release, recover — from durable .fable state and incoming intent. Use when starting any substantial engineering task, resuming from a handoff, navigating lifecycle phase transitions, or determining the next load-bearing specialist when the current path is ambiguous. Do NOT use when a specific fable-* specialist already has clear, still-valid ownership of an in-progress bounded task.
---

# get-fable — Repository-Local Lifecycle Adapter

This is the host-installed adapter. The **canonical semantic source** lives in:

- `skills/get-fable/SKILL.md` — full orchestration protocol
- `skills/get-fable/registry.json` — all 25 skill nodes, routing graph, precedence gates
- Root `skills/fable-*/SKILL.md` — specialist skill instructions
- Root `AGENTS.md` — working contract, invariants, verification commands

---

## What get-fable does

`get-fable` is a lifecycle harness, not a prompt pack. It surrounds any coding agent with:

```
DISCOVER → RESEARCH → PLAN → TDD → DELEGATE → EXECUTE
                                       ↓
                              VERIFY → REVIEW → SECURITY
                                       ↓
                              RELEASE or RECOVER → HANDOFF
```

Every transition is **evidence-gated**. Completion cannot be claimed unless fresh, mutation-current evidence passes. Research receipts and execution logs do not substitute for behavior verification.

---

## Routing Decision Table

| Situation | Specialist to activate |
|---|---|
| Repository/runtime facts unknown | `fable-discover` |
| External API / current version uncertain | `fable-research` |
| Architecture or contract decision needed | `fable-plan` |
| Testable behavior change or bug fix | `fable-tdd` |
| Genuinely independent, disjoint bounded cards | `fable-delegate` |
| Single accepted bounded implementation card | `fable-execute` |
| Fresh falsification evidence required | `fable-verify` |
| Independent diff correctness review | `fable-review` |
| Trust boundary / auth / secret / vulnerability | `fable-security` |
| Merge / publish / release readiness | `fable-release` |
| Cross-session / cross-agent continuation | `fable-handoff` |
| Agent-control change needs benchmark proof | `fable-eval` |
| Repeated or contradictory failure (≥ 2 attempts) | `fable-recover` |
| Next atomic move unclear inside active work | `fable-spark` |
| Reduce complexity, remove dead code | `fable-simplify` |
| Persistent memory / cross-session facts | `fable-memory` |
| Recurring poll / CI babysit / interval loop | `fable-loop` |
| Live runtime smoke test / start server | `fable-run` |
| Harness config / settings change | `fable-config` |
| Independent oracle / headless contract test | `fable-simulator` |
| Autonomous scoped background work | `fable-cowork` |
| Data visualization / chart / dashboard | `fable-dataviz` |
| Technical proposal / architecture diagram | `fable-artifact` |
| Author new V2-standard skill | `skill-creator` |

---

## Precedence Gates (hard overrides before intent scoring)

Apply in order before routing by intent:

1. **Corrupted/invalid `.fable` state** → diagnose/repair state.
2. **Failure streak ≥ 2** with materially similar attempts → `fable-recover`.
3. **Explicit security-sensitive request** (auth, secrets, trust boundaries) → `fable-security`.
4. **Stale verification** when completion or release is requested → `fable-verify` first.
5. **Load-bearing unknown** that would change the design → `fable-discover` or `fable-research`.
6. Otherwise → route by task ownership in the table above.

---

## Routing Protocol (condensed)

### Stage 1 — Read durable state + intent together
Consider: active card, failure streak, mutation vs verified generation, open review/security findings, unresolved unknowns, release/handoff state. The last chat message does not erase lifecycle state.

### Stage 2 — Apply precedence gates
Check hard overrides before intent scoring.

### Stage 3 — Distinguish outcome from task type
- "Ship it" is an outcome; verification may still be required.
- "Fix this" is an outcome; root location may still be unknown.
- "Make it faster" may be research + measurement before execution.

### Stage 4 — Route to one primary owner
Output: selected skill · reason · evidence used · gate that permits the next transition.

### Stage 5 — Persist only meaningful transitions
Update `.fable` lifecycle state only when the route changes actual work phase or evidence freshness.

### Stage 6 — Re-route on new evidence
A route is not permanent. Recompute when: an assumption is disproved, scope expands, a failure repeats, security risk appears, mutation makes proof stale.

---

## Decision Rules

- `failureStreak >= 2` with materially similar attempts outranks execution → recovery.
- Explicit vulnerability/auth/secret/trust-boundary work routes to security even if the diff also needs general review.
- Current external API uncertainty → `fable-research`. Repository-local uncertainty → `fable-discover`.
- A testable bug/behavior change routes through `fable-tdd` unless a regression harness is impossible.
- "Done", "merge", "ship", "release" cannot bypass stale or missing verification.
- A passing receipt or research note is not completion-capable evidence.
- Delegation requires real semantic independence — not just different-looking files.
- Handoff delivers continuity; it does not substitute for behavior verification.
- Prefer the narrowest specialist. Keep the orchestrator routing until one specialist clearly owns the next decision.

---

## Invariants

- One primary skill owns the next load-bearing decision.
- State/evidence precedence can override textual intent when necessary for safety.
- No completion or release route relies on evidence older than the current mutation.
- Repeated failed hypotheses do not route back to blind execution.
- Research (external current fact) and discovery (repository/runtime fact) are distinct routes.
- Routing explanations are traceable to intent and state — not hidden scoring alone.

---

## Anti-Patterns to Refuse

- Routing by one keyword while ignoring the full lifecycle state.
- Treating the user's desired final outcome as the immediate next action.
- Re-routing every conversational turn for ceremony when the active specialist still has valid ownership.
- Using `fable-spark` as a substitute for specialist selection.
- Sending a repeated failure back to execute without recovery.
- Accepting stale verification because the user said "ship it".
- Selecting multiple primary skills with no ordering.

---

## Routing Packet Template

```
Intent / outcome:
Current phase / card:
State overrides: failure / stale evidence / security / unknowns
Primary next decision:
Selected skill:
Why this skill now:
Gate to leave it:
Likely continuation(s):
```

---

## Completion Criteria for This Skill

A routing turn is complete when:
- The next load-bearing decision has exactly one clear specialist owner.
- All six precedence gates were checked.
- The route is consistent with current evidence and `.fable` state.
- The specialist receives enough context to begin without reinterpreting the full conversation history.
- No later lifecycle claim is implied before its evidence exists.

---

## Key Session Learnings Installed Here

From session 2026-08-28 (`docs/learning/session-2026-08-28-skill-pack-svg-release.md`):

- **Logo sourcing**: probe `<product>.dev/icon.svg` or official GitHub repo first; CDN is fallback only.
- **Icon-table discipline**: merge logo `<img>` inline with the agent name; never a separate Icon column; one agent per row.
- **state.json hygiene**: `git checkout -- .fable/state.json` before every `bun run check` or `npm publish`; tests mutate it to schema v3.
- **Version bump**: use `scripts/bump-version.ts <version>` then `bun run check` to verify all 30+ reference points.
- **README professionalism**: remove any sentence that reads like a dev retrospective or self-deprecating checklist commentary before publishing.
- **Delegation safety**: confirm disjoint file ownership before dispatching parallel subagents.

---

*Canonical routing source: `skills/get-fable/SKILL.md` · Registry: `skills/get-fable/registry.json`*
