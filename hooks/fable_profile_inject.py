#!/usr/bin/env python3
"""get-fable SessionStart context injector.

When a project has opted in with `.fable/`, inject a compact summary of the
canonical workflow, durable phase, failure streak, and open cards. The hook is
model-agnostic: it never assigns a model tier or synthetic model identity.

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
    selected = select_skill(state, open_items)

    lines = [
        "[get-fable] Canonical workflow active.",
        "Runtime state: phase=%s; failureStreak=%d; substantial=%s; selected=%s."
        % (phase, streak, str(substantial).lower(), selected),
        "Routing priority: recover repeated or stale failure; verify completion or review; "
        "discover load-bearing unknowns; plan broad work; execute a bounded accepted card.",
        "Completion rule: substantial work requires fresh passing evidence tied to the requested behavior.",
    ]

    if selected == "fable-recover":
        lines.append(
            "Recovery rule: change the diagnosis before more code. Check harness, then the actual execution path, "
            "then product logic, then state the violated invariant."
        )
    elif selected == "fable-verify":
        lines.append(
            "Verification rule: inspect the real affected path, try to falsify it, and record fresh evidence before completion."
        )
    elif selected == "fable-discover":
        lines.append(
            "Discovery rule: resolve only facts that can change the implementation and distinguish measured facts from inference."
        )
    elif selected == "fable-plan":
        lines.append(
            "Planning rule: create bounded cards with explicit acceptance conditions before implementation."
        )
    elif selected == "fable-execute":
        lines.append(
            "Execution rule: implement one accepted card, run its acceptance immediately, and avoid unrelated scope."
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
