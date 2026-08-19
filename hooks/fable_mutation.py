#!/usr/bin/env python3
"""Advance get-fable mutation generation after successful write-oriented tools.

The host matcher should limit this hook to write/edit tools. The hook is fail-open
and acts only when a project-local `.fable` directory is present.
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


def response_failed(data):
    response = data.get("tool_response")
    if not isinstance(response, dict):
        return False
    if response.get("is_error") is True or response.get("error"):
        return True
    exit_code = response.get("exitCode")
    return isinstance(exit_code, int) and exit_code != 0


def main():
    data = read_hook_input()
    if response_failed(data):
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
