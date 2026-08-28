#!/usr/bin/env python3
"""get-fable command-result attribution hook.

Claude Code reports command failures with PostToolUseFailure. Codex reports
Bash completion through PostToolUse even when the command exits non-zero.
Gemini and Antigravity expose shell completion through AfterTool. This handler
normalizes all three result styles and retains legacy payload compatibility.

Two consecutive command failures move the durable workflow to `recovering` and
select `fable-recover`. The hook remains advisory and fail-open.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _fable_common import (  # noqa: E402
    read_hook_input,
    start_dir,
    find_fable_dir,
    ledger_path,
    parse_ledger,
    load_fail_streak,
    save_fail_streak,
    record_command_result,
)

_EXIT_CODE_RE = re.compile(r"[Ee]xit code[: ]+([0-9]+)")

RECOVERY_CONTEXT = (
    "[get-fable] Repeated command failure moved durable state to fable-recover. "
    "Change the diagnosis before another code edit. Attribution order: "
    "(1) HARNESS: prove the command, test driver, fixture, expectation, permissions, and environment; "
    "(2) EXECUTION PATH: prove the changed code is actually running, including branch, worktree, build output, generated files, cache, and runtime selection; "
    "(3) PRODUCT LOGIC: debug implementation after the first two are supported by evidence; "
    "(4) INVARIANT: state the general rule that would prevent this class of failure. "
    "Record the revised hypothesis before retrying."
)


def command_failed(tool_response):
    """Best-effort failure detection; uncertain results fail open as success."""
    response = tool_response
    if isinstance(response, str):
        match = _EXIT_CODE_RE.search(response)
        return bool(match and match.group(1) != "0")
    if not isinstance(response, dict):
        return False

    for key in ("exitCode", "exit_code", "code", "returncode", "statusCode"):
        value = response.get(key)
        if isinstance(value, int):
            return value != 0
    for key in ("is_error", "isError"):
        if response.get(key) is True:
            return True
    if response.get("success") is False or response.get("ok") is False:
        return True
    if response.get("error") not in (None, False, "", {}):
        return True

    text = " ".join(
        str(response.get(key, ""))
        for key in ("stdout", "stderr", "output", "error", "returnDisplay", "llmContent")
    )
    match = _EXIT_CODE_RE.search(text)
    return bool(match and match.group(1) != "0")


def event_failed(data):
    """Classify native host events while preserving response-based detection."""
    event_name = data.get("hook_event_name")
    if event_name == "PostToolUseFailure":
        return True
    return command_failed(data.get("tool_response"))


def main():
    data = read_hook_input()
    fable_dir = find_fable_dir(start_dir(data))
    if not fable_dir:
        return 0

    _open, _has_any, paused = parse_ledger(ledger_path(fable_dir))
    if paused:
        return 0

    failed = event_failed(data)
    durable = record_command_result(fable_dir, failed)

    session_id = data.get("session_id")
    if session_id:
        if failed:
            save_fail_streak(session_id, load_fail_streak(session_id) + 1)
        elif load_fail_streak(session_id):
            save_fail_streak(session_id, 0)

    if not failed:
        return 0

    streak = int(durable.get("failureStreak", 0)) if isinstance(durable, dict) else load_fail_streak(session_id)
    if streak >= 2:
        event_name = data.get("hook_event_name")
        if not isinstance(event_name, str) or not event_name.strip():
            event_name = "PostToolUseFailure"
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": event_name,
                "additionalContext": RECOVERY_CONTEXT + " failureStreak=%d." % streak,
            }
        }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        sys.stderr.write("[get-fable] fail-streak error (ignored): %r\n" % exc)
        sys.exit(0)
