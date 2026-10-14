#!/usr/bin/env python3
"""get-fable SessionStart context injector.

When a project has opted in with `.fable/`, inject a compact summary of the
canonical workflow, durable phase, mutation/verification generations, failure
streak, active card, and open cards. The hook is model-agnostic.

Advisory and fail-open. Exit 0 on every unexpected error.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _fable_common import (  # noqa: E402
    read_hook_input,
    start_dir,
    find_fable_dir,
    ledger_path,
    parse_ledger,
    read_state,
)

MAX_LIST = 12
PHASE_SKILL = {
    "discovering": "fable-discover",
    "planned": "fable-plan",
    "executing": "fable-execute",
    "verifying": "fable-verify",
    "recovering": "fable-recover",
}

SKILL_RULES = {
    "get-fable": (
        "Orchestration rule: route deterministically by evidence precedence and load only the active specialist skill."
    ),
    "fable-discover": (
        "Evidence rule: resolve only facts that can change the next decision and distinguish observed facts from inference."
    ),
    "fable-research": (
        "Evidence rule: resolve external facts against primary official sources before implementation and distinguish observed facts from inference."
    ),
    "fable-plan": (
        "Planning rule: create bounded cards with explicit acceptance conditions before implementation."
    ),
    "fable-tdd": (
        "Build rule: drive behavior changes through red-observed -> minimal code -> green-observed regression tests, and verify after the final mutation."
    ),
    "fable-delegate": (
        "Build rule: parallelize only when write, semantic, and verification independence hold, using explicit TOON delegation contracts."
    ),
    "fable-execute": (
        "Build rule: keep ownership and scope bounded, record workspace mutation generations, and verify after the final mutation."
    ),
    "fable-verify": (
        "Proof rule: inspect the real current state, try to falsify the relevant claim, and record only evidence that proves that specific gate."
    ),
    "fable-review": (
        "Proof rule: inspect the actual git diff line-by-line for concrete failure scenarios and record grounded review evidence."
    ),
    "fable-security": (
        "Proof rule: trace attacker-controlled input across trust boundaries, verify zero exposed secrets, and record security evidence only for security-scoped work."
    ),
    "fable-redteam": (
        "Redteam rule: verify target CIDR and maintenance-window scope first, probe non-destructively, and emit CVSS v3.1 + SARIF findings."
    ),
    "fable-heal": (
        "Heal rule: synthesize minimal security patches with regression tests that neutralize reproduction payloads, respecting the remediation circuit breaker."
    ),
    "fable-release": (
        "Proof rule: certify release readiness against required checks, clean working trees, and verified distribution artifacts."
    ),
    "fable-handoff": (
        "Handoff rule: compact session decisions, generation stamps, and one explicit next action into continuation state without claiming behavior completion."
    ),
    "fable-eval": (
        "Eval rule: freeze reproducible baselines, test against held-out suites, and define rollback criteria before promoting prompt or router changes."
    ),
    "fable-learning": (
        "Learning rule: extract evidence-grounded failure lessons and reusable engineering patterns into Failure-lessons/ and .fable/learnings.json."
    ),
    "fable-recover": (
        "Recovery rule: change the diagnosis before more code. Check harness, then actual execution path, then product logic, then the violated invariant."
    ),
    "fable-dataviz": (
        "Dataviz rule: generate accessible SVG charts and dashboard tiles with explicit viewBox dimensions and verified light/dark theme contrast."
    ),
    "fable-artifact": (
        "Artifact rule: author structured technical proposals, Mermaid diagrams, and responsive interactive components with clear visual hierarchy."
    ),
    "fable-simplify": (
        "Simplify rule: flatten nested control flow and remove dead branches or duplication only when behavior and passing tests are strictly preserved."
    ),
    "fable-loop": (
        "Loop rule: enforce explicit iteration budgets, exponential backoff, and deterministic exit conditions on every recurring poll."
    ),
    "fable-run": (
        "Runtime rule: launch the exact built artifact, verify readiness probes (HTTP 200 or clean exit), and tear down spawned processes cleanly."
    ),
    "fable-memory": (
        "Memory rule: persist single-fact provenance-backed records in structured MEMORY.md stores with zero secrets or credentials."
    ),
    "fable-config": (
        "Config rule: apply least-privilege harness settings, validate JSON schemas, and verify hook bindings behaviorally."
    ),
    "fable-simulator": (
        "Simulator rule: verify against an independent oracle or headless browser matrix while preserving untracked workspace files."
    ),
    "fable-cowork": (
        "Cowork rule: chain tools silently within permitted file boundaries and report outcomes first without mid-chain noise."
    ),
    "fable-spark": (
        "Spark rule: predict the single smallest atomic next engineering move from live state, or remain silent when no high-confidence move exists."
    ),
    "fable-skill-creator": (
        "Skill-creator rule: author Deep Playbook V2 skills with valid YAML frontmatter, containment-safe resources, and objective BinEval benchmarks."
    ),
    "fable-architecture": (
        "Architecture rule: evaluate Scale, Domain Decoupling, and Resource Intensity vectors at inception and enforce microservices + gRPC/broker East-West transport when thresholds cross."
    ),
    "fable-eco": (
        "Ecosystem rule: resolve curated capabilities deterministically, commit transaction journals, and verify host health checks."
    ),
    "fable-context-thrift": (
        "Context-thrift rule: conserve token budget by eliminating redundant file reads, batching searches, and targeting exact symbol ranges."
    ),
    "fable-finish-your-turn": (
        "Finish-turn rule: drive all authorized subtasks and transient errors to verified completion without premature stops or upward delegation."
    ),
    "fable-native-code": (
        "Native-code rule: match surrounding repository idioms and strip defensive bloat or narrating comments so diffs read like native code."
    ),
    "fable-outcome-first": (
        "Outcome-first rule: lead every response with the direct outcome or answer in the first sentence with zero sycophancy."
    ),
    "fable-prove-it": (
        "Prove-it rule: enforce verification rungs (written != runs != verified) and never round partial checks up to completion."
    ),
    "fable-scope-discipline": (
        "Scope-discipline rule: keep diffs surgical and atomic to the authorized request; adjacency is never permission for drive-by edits."
    ),
    "fable-domain": (
        "Domain rule: ground sector workflows in verified primary sources and generate domain adapters alongside adversarial trap fixtures."
    ),
    "fable-judge": (
        "Judge rule: adversarially audit completed work to detect weakened tests, hollow assertions, or false completion claims."
    ),
    "fable-method": (
        "Method rule: classify the ask, define explicit done criteria, act surgically, and verify by direct observation."
    ),
    "fable-council": (
        "Council rule: convene independent CLI agents to deliberate and challenge assumptions before locking high-impact plans."
    ),
    "fable-tend": (
        "Tend rule: autonomously triage CI failures and resolve PR conflicts with verified patches while respecting human merge gates."
    ),
    "fable-wise": (
        "Wise rule: apply Depth, Breadth, Coil, and Mesh cognitive reflexes to consolidate single sources of truth and strip architectural slop."
    ),
}


def select_skill(state, open_items):
    if isinstance(state, dict):
        if int(state.get("failureStreak", 0)) >= 2 or state.get("phase") == "recovering":
            return "fable-recover"
        current = state.get("currentSkill")
        if isinstance(current, str) and (current == "get-fable" or current.startswith("fable-")):
            return current
        phase_skill = PHASE_SKILL.get(state.get("phase"))
        if phase_skill:
            return phase_skill
    return "fable-execute" if open_items else "get-fable"


def build_context(state, open_items, paused):
    if paused:
        return (
            "[get-fable] Project workflow is PAUSED by .fable/LEDGER.md. "
            "Durable state is preserved, but lifecycle enforcement is suspended "
            "for this unrelated round until the PAUSED line is removed."
        )

    phase = state.get("phase", "legacy") if isinstance(state, dict) else "legacy"
    streak = int(state.get("failureStreak", 0)) if isinstance(state, dict) else 0
    substantial = bool(state.get("substantial", False)) if isinstance(state, dict) else False
    mutation_generation = int(state.get("mutationGeneration", 0)) if isinstance(state, dict) else 0
    verified_generation = int(state.get("verifiedGeneration", -1)) if isinstance(state, dict) else -1
    active_card = state.get("activeCard") if isinstance(state, dict) else None
    selected = select_skill(state, open_items)

    lines = [
        "[get-fable] Canonical coding lifecycle active.",
        "Runtime state: phase=%s; failureStreak=%d; substantial=%s; selected=%s; mutationGeneration=%d; verifiedGeneration=%d."
        % (
            phase,
            streak,
            str(substantial).lower(),
            selected,
            mutation_generation,
            verified_generation,
        ),
        "Routing priority: recover repeated failure; route explicit trust-boundary work; prove delivery claims; "
        "research current external facts; discover repository unknowns; plan broad work; use test-first behavior changes; execute bounded cards.",
        "TOON protocol: format inter-agent messages, subagent contracts, and state payloads in ```toon ... ``` with explicit [N] counts.",
        "Completion rule: a newer workspace mutation makes older verification stale; substantial work requires passing completion evidence for the current generation.",
    ]

    if isinstance(active_card, str) and active_card.strip():
        lines.append("Active card: %s" % active_card.strip())

    rule = SKILL_RULES.get(selected)
    if rule:
        lines.append(rule)

    if open_items:
        shown = open_items[:MAX_LIST]
        lines.append("Open ledger cards (%d):\n%s" % (
            len(open_items),
            "\n".join("  " + item for item in shown),
        ))
        if len(open_items) > len(shown):
            lines.append("  ... and %d more" % (len(open_items) - len(shown)))

    return "\n".join(lines)


def main():
    data = read_hook_input()
    fable_dir = find_fable_dir(start_dir(data))
    if not fable_dir:
        return 0

    open_items, _has_any, paused = parse_ledger(ledger_path(fable_dir))
    state = read_state(fable_dir)
    context = build_context(state, open_items, paused)
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": context,
        }
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        sys.stderr.write("[get-fable] profile injector error (ignored): %r\n" % exc)
        sys.exit(0)
