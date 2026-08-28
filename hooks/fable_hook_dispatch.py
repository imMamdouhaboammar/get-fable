#!/usr/bin/env python3
"""Host-neutral lifecycle hook dispatcher for get-fable.

The dispatcher accepts field variations used by Claude Code, Codex, Gemini,
Antigravity, and generic agent harnesses, normalizes them to the canonical
get-fable hook payload, then executes one existing policy handler.

For Antigravity, it also translates get-fable's shared exit/context semantics
back into Antigravity's explicit JSON decisions and injection objects. This
keeps the lifecycle policy shared while each host receives its native contract.

Unexpected dispatcher errors fail open. Deliberate blocking from a handler is
preserved or translated into the host's documented blocking response.
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


def first_workspace_path(data):
    for key in ("workspacePaths", "workspace_paths"):
        value = data.get(key)
        if isinstance(value, list):
            for item in value:
                if isinstance(item, str) and item.strip():
                    return item.strip()
    return None


def normalize_payload(raw, event_name=None, host=None):
    """Return one canonical payload without copying prompt/tool content to logs."""
    data = dict(raw) if isinstance(raw, dict) else {}
    context = first_dict(data.get("context"), data.get("workspace"))
    tool = first_dict(data.get("tool"))
    tool_call = first_dict(data.get("toolCall"), data.get("tool_call"))
    tool_call_args = first_dict(tool_call.get("args"))

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
        first_workspace_path(data),
        tool_call_args.get("Cwd"),
        tool_call_args.get("cwd"),
    )
    tool_name = first_value(
        data.get("tool_name"),
        data.get("toolName"),
        tool_call.get("name"),
        tool.get("name"),
        data.get("tool") if isinstance(data.get("tool"), str) else None,
    )
    tool_input = first_value(
        data.get("tool_input"),
        data.get("toolInput"),
        data.get("arguments"),
        data.get("input"),
        tool_call.get("args"),
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
    if tool_response is None and data.get("error") not in (None, ""):
        tool_response = {"error": data.get("error")}

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
        data.get("conversationId"),
        data.get("conversation_id"),
    )
    if session_id is not None:
        data["session_id"] = str(session_id)

    turn_id = first_value(
        data.get("turn_id"),
        data.get("turnId"),
        data.get("stepIdx"),
        data.get("invocationNum"),
        data.get("executionNum"),
    )
    if turn_id is not None:
        data["turn_id"] = str(turn_id)

    stop_active = first_value(data.get("stop_hook_active"), data.get("stopHookActive"))
    if stop_active is not None:
        data["stop_hook_active"] = bool(stop_active)

    model = first_value(data.get("model"), data.get("modelName"), data.get("model_name"))
    if model is not None:
        data["model"] = str(model)

    resolved_host = first_value(host, data.get("hook_host"), data.get("host"), data.get("provider"))
    if resolved_host is not None:
        data["hook_host"] = str(resolved_host).lower()

    return data


def parse_json_object(text):
    if not isinstance(text, str) or not text.strip():
        return {}
    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def antigravity_default_output(event_name):
    if event_name == "PreToolUse":
        return {"decision": "allow"}
    if event_name == "PostToolUse":
        return {}
    if event_name == "PreInvocation":
        return {"injectSteps": []}
    if event_name == "PostInvocation":
        return {"injectSteps": [], "terminationBehavior": ""}
    if event_name == "Stop":
        return {"decision": "allow"}
    return {}


def adapt_antigravity_result(handler, event_name, returncode, stdout, stderr):
    """Translate canonical handler results to Antigravity's JSON contract."""
    parsed = parse_json_object(stdout)
    reason = (stderr or "").strip()

    if handler == "profile" and event_name == "PreInvocation":
        context = first_dict(parsed.get("hookSpecificOutput")).get("additionalContext")
        if isinstance(context, str) and context.strip():
            return 0, json.dumps({"injectSteps": [{"ephemeralMessage": context.strip()}]}, ensure_ascii=False), stderr
        return 0, json.dumps({"injectSteps": []}), stderr

    if handler == "spawn" and event_name == "PreToolUse":
        if returncode == 2:
            return 0, json.dumps({
                "decision": "deny",
                "reason": reason or "get-fable blocked unbounded delegation",
            }, ensure_ascii=False), ""
        return 0, json.dumps({"decision": "allow"}), stderr

    if handler == "close" and event_name == "Stop":
        if returncode == 2:
            return 0, json.dumps({
                "decision": "continue",
                "reason": reason or "get-fable requires current completion evidence",
            }, ensure_ascii=False), ""
        return 0, json.dumps({"decision": "allow"}), stderr

    return 0, json.dumps(antigravity_default_output(event_name), ensure_ascii=False), stderr


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

        host_name = str(payload.get("hook_host") or "").lower()
        event_name = str(payload.get("hook_event_name") or "")
        if host_name == "antigravity":
            code, stdout, stderr = adapt_antigravity_result(
                args.handler,
                event_name,
                int(proc.returncode or 0),
                proc.stdout,
                proc.stderr,
            )
            if stdout:
                sys.stdout.write(stdout)
            if stderr:
                sys.stderr.write(stderr)
            return code

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
