#!/usr/bin/env python3
"""Host-neutral lifecycle hook dispatcher for get-fable.

The dispatcher accepts the small field variations used by Claude Code, Codex,
Antigravity, and generic agent harnesses, normalizes them to the canonical
get-fable hook payload, then executes one of the existing hook handlers.

Unexpected dispatcher errors fail open. A deliberate non-zero exit from a
handler is preserved so lifecycle guards can still block when the host supports
blocking hooks.
"""
import argparse
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

HANDLERS = {
    "profile": "fable_profile_inject.py",
    "spawn": "fable_spawn_guard.py",
    "failure": "fable_fail_streak.py",
    "mutation": "fable_mutation.py",
    "close": "fable_close_guard.py",
    "event": "fable_event_observer.py",
}


def first_dict(*values):
    for value in values:
        if isinstance(value, dict):
            return value
    return {}


def first_value(*values):
    for value in values:
        if value is not None and value != "":
            return value
    return None


def normalize_payload(raw, event_name=None, host=None):
    """Return one canonical hook payload without copying prompt/tool content."""
    data = dict(raw) if isinstance(raw, dict) else {}
    context = first_dict(data.get("context"), data.get("workspace"))
    tool = first_dict(data.get("tool"))

    event = first_value(
        event_name,
        data.get("hook_event_name"),
        data.get("hookEventName"),
        data.get("event_name"),
        data.get("eventName"),
        data.get("event"),
    )
    cwd = first_value(
        data.get("cwd"),
        data.get("workspace_root"),
        data.get("workspaceRoot"),
        data.get("project_root"),
        data.get("projectRoot"),
        context.get("cwd"),
        context.get("root"),
    )
    tool_name = first_value(
        data.get("tool_name"),
        data.get("toolName"),
        tool.get("name"),
        data.get("tool") if isinstance(data.get("tool"), str) else None,
    )
    tool_input = first_value(
        data.get("tool_input"),
        data.get("toolInput"),
        data.get("arguments"),
        data.get("input"),
        tool.get("input"),
    )
    tool_response = first_value(
        data.get("tool_response"),
        data.get("toolResponse"),
        data.get("response"),
        data.get("result"),
        data.get("output"),
        tool.get("response"),
    )

    if event is not None:
        data["hook_event_name"] = str(event)
    if cwd is not None:
        data["cwd"] = str(cwd)
    if tool_name is not None:
        data["tool_name"] = str(tool_name)
    if tool_input is not None:
        data["tool_input"] = tool_input
    if tool_response is not None:
        data["tool_response"] = tool_response

    session_id = first_value(
        data.get("session_id"),
        data.get("sessionId"),
        data.get("thread_id"),
        data.get("threadId"),
    )
    if session_id is not None:
        data["session_id"] = str(session_id)

    turn_id = first_value(data.get("turn_id"), data.get("turnId"))
    if turn_id is not None:
        data["turn_id"] = str(turn_id)

    stop_active = first_value(data.get("stop_hook_active"), data.get("stopHookActive"))
    if stop_active is not None:
        data["stop_hook_active"] = bool(stop_active)

    resolved_host = first_value(host, data.get("hook_host"), data.get("host"), data.get("provider"))
    if resolved_host is not None:
        data["hook_host"] = str(resolved_host).lower()

    return data


def parse_args():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--handler", required=True, choices=sorted(HANDLERS))
    parser.add_argument("--event")
    parser.add_argument("--host")
    return parser.parse_args()


def main():
    args = parse_args()
    try:
        raw_text = sys.stdin.read()
        raw = json.loads(raw_text) if raw_text.strip() else {}
        payload = normalize_payload(raw, event_name=args.event, host=args.host)
        handler = os.path.join(ROOT, HANDLERS[args.handler])
        proc = subprocess.run(
            [sys.executable, handler],
            input=json.dumps(payload, ensure_ascii=False),
            text=True,
            capture_output=True,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        if proc.stdout:
            sys.stdout.write(proc.stdout)
        if proc.stderr:
            sys.stderr.write(proc.stderr)
        return int(proc.returncode or 0)
    except Exception as exc:
        sys.stderr.write("[get-fable] hook dispatcher error (ignored): %r\n" % exc)
        return 0


if __name__ == "__main__":
    sys.exit(main())
