#!/usr/bin/env python3
"""get-fable PreToolUse guard for detailed delegation.

When a project is opted in, a large Agent/Task/Workflow delegation requires a
live open ledger card. Small delegations and forks are exempt. The guard is
model-agnostic and does not rank or block model names.

Fail-open on unexpected errors.
"""
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


def payload_len(tool_input):
    if not isinstance(tool_input, dict):
        return 0
    parts = []
    for key in ("prompt", "script", "description"):
        value = tool_input.get(key)
        if isinstance(value, str):
            parts.append(value)
    return len("\n".join(parts))


def is_fork(tool_input):
    if not isinstance(tool_input, dict):
        return False
    for key in ("subagent_type", "agentType", "agent_type"):
        value = tool_input.get(key)
        if isinstance(value, str) and "fork" in value.lower():
            return True
    return False


def main():
    data = read_hook_input()
    tool_input = data.get("tool_input", {}) or {}
    fable_dir = find_fable_dir(start_dir(data))
    if not fable_dir:
        return 0

    if is_fork(tool_input):
        return 0

    try:
        threshold = int(os.environ.get("FABLE_SPAWN_MIN_CHARS", "1500"))
    except ValueError:
        threshold = 1500
    if payload_len(tool_input) < threshold:
        return 0

    open_items, _has_any, paused = parse_ledger(ledger_path(fable_dir))
    if paused or open_items:
        return 0

    state = read_state(fable_dir)
    phase = state.get("phase") if isinstance(state, dict) else "legacy"
    selected = state.get("currentSkill") if isinstance(state, dict) else None

    sys.stderr.write(
        "[get-fable] BLOCKED detailed delegation: the project is armed but the current round has no OPEN ledger card.\n"
        "Durable state: phase=%s; selected=%s.\n"
        "Before broad fan-out, record the bounded card and its acceptance condition in .fable/LEDGER.md. "
        "If load-bearing facts are still unknown, use fable-discover first. If repeated failure is active, "
        "make the recovery hypothesis and repair card explicit before delegation. Small spawns below %d chars and forks are exempt.\n"
        % (phase, selected or "none", threshold)
    )
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        sys.stderr.write("[get-fable] spawn guard error (ignored): %r\n" % exc)
        sys.exit(0)
