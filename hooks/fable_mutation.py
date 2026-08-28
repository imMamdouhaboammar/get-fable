#!/usr/bin/env python3
"""Advance get-fable mutation generation after write-oriented tool attempts.

Hosts may provide a matcher before invoking this hook, but the hook also checks
known tool names itself so broad host events do not mark read-only or command
activity as workspace mutations. Failed writes are conservative mutations
because a tool can partially change the workspace before reporting failure.
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
    "write_file",
    "write_to_file",
    "replace",
    "replace_file_content",
    "multi_replace_file_content",
    "create_file",
    "delete_file",
    "move_file",
    "rename_file",
}


def normalized_tool_name(value):
    return str(value).replace("-", "").replace("_", "").lower()


def mutating_tool(data):
    name = data.get("tool_name") or data.get("toolName") or data.get("tool")
    if name is None:
        return True
    normalized = normalized_tool_name(name)
    return normalized in {normalized_tool_name(item) for item in MUTATING_TOOLS}


def main():
    data = read_hook_input()
    if not mutating_tool(data):
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
