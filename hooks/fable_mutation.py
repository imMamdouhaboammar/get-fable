#!/usr/bin/env python3
"""Advance get-fable mutation generation after successful write-oriented tools.

Hosts may provide a matcher before invoking this hook, but the hook also checks
known tool names itself so adapters with broader PostToolUse events do not mark
read-only or command activity as workspace mutations.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _fable_common import (  # noqa: E402
    find_fable_dir,
    read_hook_input,
    record_workspace_mutation,
    start_dir,
)

MUTATING_TOOLS = {
    "edit",
    "write",
    "multiedit",
    "notebookedit",
    "apply_patch",
    "applypatch",
}


def response_failed(data):
    response = data.get("tool_response")
    if not isinstance(response, dict):
        return False
    if response.get("is_error") is True or response.get("error"):
        return True
    exit_code = response.get("exitCode")
    return isinstance(exit_code, int) and exit_code != 0


def mutating_tool(data):
    name = data.get("tool_name") or data.get("toolName") or data.get("tool")
    if name is None:
        return True
    return str(name).replace("-", "").replace("_", "").lower() in {
        item.replace("_", "") for item in MUTATING_TOOLS
    }


def main():
    data = read_hook_input()
    if not mutating_tool(data) or response_failed(data):
        return 0

    fable_dir = find_fable_dir(start_dir(data))
    if not fable_dir:
        return 0

    record_workspace_mutation(fable_dir)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        sys.stderr.write("[get-fable] mutation hook error (ignored): %r\n" % exc)
        sys.exit(0)
