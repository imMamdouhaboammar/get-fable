#!/usr/bin/env python3
"""get-fable Stop guard.

The guard combines the human ledger contract with strict `.fable/state.json`
semantics. It blocks stop for open cards, checked cards without substantive
ledger evidence, substantial work without passing state evidence, or
substantial work whose durable phase has not reached `complete`.

Loop-safe and fail-open on unexpected errors.
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
    closed_without_evidence,
    read_state,
    has_fresh_passing_state_evidence,
)

MAX_LIST = 12


def block_open_cards(path, open_items):
    shown = open_items[:MAX_LIST]
    lines = "\n".join("    " + item for item in shown)
    if len(open_items) > len(shown):
        lines += "\n    ... and %d more" % (len(open_items) - len(shown))
    sys.stderr.write(
        "[get-fable] BLOCKED stop: %d open ledger card(s) in %s\n%s\n"
        "Finish and verify each card, defer it with a concrete reason, or pause the round for genuinely unrelated work.\n"
        % (len(open_items), path, lines)
    )
    return 2


def block_missing_ledger_evidence(path, bad):
    shown = bad[:MAX_LIST]
    lines = "\n".join("    " + item for item in shown)
    if len(bad) > len(shown):
        lines += "\n    ... and %d more" % (len(bad) - len(shown))
    sys.stderr.write(
        "[get-fable] BLOCKED stop: %d checked card(s) in %s have no substantive ledger evidence:\n%s\n"
        "Append `-- evidence: <command/result or observation>` or uncheck the card and verify it.\n"
        % (len(bad), path, lines)
    )
    return 2


def block_state_if_needed(state):
    if not isinstance(state, dict) or not state.get("substantial"):
        return 0

    if not has_fresh_passing_state_evidence(state):
        sys.stderr.write(
            "[get-fable] BLOCKED stop: substantial work has no fresh passing state evidence in .fable/state.json. "
            "Record fresh proof with `get-fable evidence pass <kind> <source> <detail>` after verifying the requested behavior.\n"
        )
        return 2

    if state.get("phase") != "complete":
        sys.stderr.write(
            "[get-fable] BLOCKED stop: substantial work has passing evidence but durable workflow phase is '%s', not 'complete'. "
            "Finish verification and transition with `get-fable state complete`.\n"
            % state.get("phase")
        )
        return 2

    return 0


def main():
    data = read_hook_input()
    if data.get("stop_hook_active"):
        return 0

    fable_dir = find_fable_dir(start_dir(data))
    if not fable_dir:
        return 0

    path = ledger_path(fable_dir)
    if not os.path.isfile(path):
        return block_state_if_needed(read_state(fable_dir))

    open_items, _has_any, paused = parse_ledger(path)
    if paused:
        return 0
    if open_items:
        return block_open_cards(path, open_items)

    bad = closed_without_evidence(path)
    if bad:
        return block_missing_ledger_evidence(path, bad)

    return block_state_if_needed(read_state(fable_dir))


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        sys.stderr.write("[get-fable] close guard error (ignored): %r\n" % exc)
        sys.exit(0)
