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


def check_anti_churn_delegation(fable_dir, tool_input):
    receipts_path = os.path.join(fable_dir, "anti-churn", "receipts.ndjson")
    if not os.path.isfile(receipts_path):
        return 0, ""

    prompt_or_task = ""
    if isinstance(tool_input, dict):
        for k in ("prompt", "task", "instruction", "description", "command", "Subagents"):
            if k in tool_input:
                prompt_or_task = str(tool_input[k])
                break
    elif isinstance(tool_input, str):
        prompt_or_task = tool_input

    if not prompt_or_task or len(prompt_or_task.strip()) < 20:
        return 0, ""

    import hashlib
    task_digest = "sha256:" + hashlib.sha256(prompt_or_task.strip().encode("utf-8")).hexdigest()

    try:
        with open(receipts_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                if task_digest in line:
                    if '"outcome":"pending"' in line or '"outcome": "pending"' in line:
                        return 2, (
                            "[get-fable] BLOCKED duplicate spawn: task has an active in-flight anti-churn reservation. "
                            "Wait for prior worker or invalidate prior reservation.\n"
                        )
    except Exception:
        pass

    return 0, ""


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

    open_items, _has_any, paused = parse_ledger(ledger_path(fable_dir))
    if paused:
        return 0

    churn_code, churn_msg = check_anti_churn_delegation(fable_dir, tool_input)
    if churn_code != 0:
        sys.stderr.write(churn_msg)
        return churn_code

    try:
        threshold = int(os.environ.get("FABLE_SPAWN_MIN_CHARS", "1500"))
    except ValueError:
        threshold = 1500
    if payload_len(tool_input) < threshold:
        return 0

    if open_items:
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
