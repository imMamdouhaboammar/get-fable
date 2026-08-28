#!/usr/bin/env python3
"""Privacy-minimal lifecycle event journal for get-fable.

Only event metadata is persisted. Prompt text, tool arguments, tool output, and
assistant messages are intentionally excluded. The journal is project-local,
opt-in through the presence of `.fable/`, capped, and fail-open.
"""
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _fable_common import read_hook_input, start_dir, find_fable_dir  # noqa: E402

MAX_BYTES = 256 * 1024
RETAIN_LINES = 500


def classify_success(data):
    event = str(data.get("hook_event_name") or "")
    if event == "PostToolUseFailure":
        return False
    response = data.get("tool_response")
    if isinstance(response, dict):
        for key in ("exitCode", "exit_code", "code", "returncode"):
            value = response.get(key)
            if isinstance(value, int):
                return value == 0
        if response.get("is_error") is True or response.get("isError") is True:
            return False
    return None


def compact_if_needed(path):
    try:
        if not os.path.isfile(path) or os.path.getsize(path) <= MAX_BYTES:
            return
        with open(path, "r", encoding="utf-8") as handle:
            lines = handle.readlines()[-RETAIN_LINES:]
        temp = path + ".tmp"
        with open(temp, "w", encoding="utf-8") as handle:
            handle.writelines(lines)
        os.replace(temp, path)
    except Exception:
        pass


def main():
    data = read_hook_input()
    fable_dir = find_fable_dir(start_dir(data))
    if not fable_dir:
        return 0

    event_name = data.get("hook_event_name")
    if not isinstance(event_name, str) or not event_name.strip():
        return 0

    event = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "event": event_name.strip(),
        "host": str(data.get("hook_host") or "generic")[:40],
    }
    for source, target, limit in (
        ("session_id", "sessionId", 120),
        ("turn_id", "turnId", 120),
        ("tool_name", "toolName", 120),
        ("source", "source", 80),
        ("reason", "reason", 80),
        ("trigger", "trigger", 80),
        ("agent_type", "agentType", 80),
    ):
        value = data.get(source)
        if isinstance(value, str) and value.strip():
            event[target] = value.strip()[:limit]

    success = classify_success(data)
    if success is not None:
        event["success"] = success

    path = os.path.join(fable_dir, "events.jsonl")
    compact_if_needed(path)
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        sys.stderr.write("[get-fable] event observer error (ignored): %r\n" % exc)
        sys.exit(0)
