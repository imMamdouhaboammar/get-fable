#!/usr/bin/env python3
"""get-fable pre-tool guard for substantial delegation.

When a project is opted in, a large Agent/Task/Workflow-style delegation
requires a live open ledger card. Small delegations and forks are exempt. The
guard recognizes common delegation tool names and nested delegation payloads
across Claude, Codex, Gemini, Antigravity, and generic agent harnesses.

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

DELEGATION_TOOL_MARKERS = (
    "agent",
    "subagent",
    "delegate",
    "delegation",
    "task",
    "workflow",
    "worker",
)


def payload_len(value):
    """Measure nested delegation content without depending on one host schema."""
    if isinstance(value, str):
        return len(value)
    if isinstance(value, dict):
        return sum(payload_len(item) for item in value.values())
    if isinstance(value, (list, tuple)):
        return sum(payload_len(item) for item in value)
    return 0


def contains_fork(value):
    if isinstance(value, str):
        return "fork" in value.lower()
    if isinstance(value, dict):
        for key, item in value.items():
            normalized = str(key).replace("-", "_").lower()
            if normalized in ("subagent_type", "agenttype", "agent_type", "mode", "type"):
                if contains_fork(item):
                    return True
            if isinstance(item, (dict, list, tuple)) and contains_fork(item):
                return True
    if isinstance(value, (list, tuple)):
        return any(contains_fork(item) for item in value)
    return False


def is_fork(tool_input):
    return contains_fork(tool_input)


def delegation_tool(data):
    name = data.get("tool_name") or data.get("toolName") or data.get("tool")
    if name is None:
        return True
    normalized = str(name).replace("-", "_").lower()
    return any(marker in normalized for marker in DELEGATION_TOOL_MARKERS)


def main():
    data = read_hook_input()
    if not delegation_tool(data):
        return 0

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
