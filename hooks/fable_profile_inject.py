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


def select_skill(state, open_items):
    if isinstance(state, dict):
        if int(state.get("failureStreak", 0)) >= 2 or state.get("phase") == "recovering":
            return "fable-recover"
        current = state.get("currentSkill")
        if isinstance(current, str) and current.startswith("fable-"):
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
        "Completion rule: a newer workspace mutation makes older verification stale; substantial work requires passing completion evidence for the current generation.",
    ]

    if isinstance(active_card, str) and active_card.strip():
        lines.append("Active card: %s" % active_card.strip())

    if selected == "fable-recover":
        lines.append(
            "Recovery rule: change the diagnosis before more code. Check harness, then actual execution path, then product logic, then the violated invariant."
        )
    elif selected in ("fable-verify", "fable-review", "fable-security", "fable-release"):
        lines.append(
            "Proof rule: inspect the real current state, try to falsify the relevant claim, and record only evidence that proves that specific gate."
        )
    elif selected in ("fable-discover", "fable-research"):
        lines.append(
            "Evidence rule: resolve only facts that can change the next decision and distinguish observed facts from inference."
        )
    elif selected == "fable-plan":
        lines.append(
            "Planning rule: create bounded cards with explicit acceptance conditions before implementation."
        )
    elif selected in ("fable-execute", "fable-tdd", "fable-delegate"):
        lines.append(
            "Build rule: keep ownership and scope bounded, record workspace mutation generations, and verify after the final mutation."
        )

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
