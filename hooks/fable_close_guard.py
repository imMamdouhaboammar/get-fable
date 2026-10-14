#!/usr/bin/env python3
"""get-fable Stop guard.

The guard combines the human ledger contract with strict `.fable/state.json`
semantics. It blocks stop for open cards, checked cards without substantive
ledger evidence, malformed durable state, stale current-generation evidence,
or substantial work whose durable phase has not reached `complete`.

Unexpected host/runtime errors remain fail-open. Invalid project state is an
explicit workflow condition and therefore blocks substantial completion.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _fable_common import (  # noqa: E402
    read_hook_input,
    start_dir,
    find_fable_dir,
    ledger_path,
    state_path,
    parse_ledger,
    closed_without_evidence,
    read_state,
    has_fresh_passing_state_evidence,
    has_pending_mutation_debt,
    safe_fable_boundary,
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


def block_invalid_state(path):
    sys.stderr.write(
        "[get-fable] BLOCKED stop: %s is present but invalid for the current lifecycle schema. "
        "Run `get-fable doctor` and repair or migrate durable state before claiming completion.\n"
        % path
    )
    return 2


def block_state_if_needed(state):
    if not isinstance(state, dict) or not state.get("substantial"):
        return 0

    if not has_fresh_passing_state_evidence(state):
        sys.stderr.write(
            "[get-fable] BLOCKED stop: substantial work has no fresh passing completion evidence for the current mutation generation. "
            "Record proof with `get-fable evidence pass <kind> <source> <detail>` after verifying the requested behavior.\n"
        )
        return 2

    if state.get("phase") != "complete":
        sys.stderr.write(
            "[get-fable] BLOCKED stop: substantial work has current verification evidence but durable workflow phase is '%s', not 'complete'. "
            "Finish verification and transition with `get-fable state complete`.\n"
            % state.get("phase")
        )
        return 2

    return 0


def validated_state_or_block(fable_dir):
    path = state_path(fable_dir)
    if not os.path.isfile(path):
        return None, None
    state = read_state(fable_dir)
    if state is None:
        return None, block_invalid_state(path)
    return state, None


def main():
    data = read_hook_input()
    fable_dir = find_fable_dir(start_dir(data))
    if not fable_dir:
        return 0
    if not safe_fable_boundary(fable_dir):
        sys.stderr.write("[get-fable] BLOCKED stop: unsafe .fable filesystem boundary; repair symlinks or special files before completion.\n")
        return 2
    pending = has_pending_mutation_debt(fable_dir)
    if pending is None:
        return block_invalid_state(state_path(fable_dir))
    if pending:
        sys.stderr.write(
            "[get-fable] BLOCKED stop: workspace mutation debt is pending reconciliation. "
            "Run the next state transaction, then verify the resulting mutation generation.\n"
        )
        return 2
    if data.get("stop_hook_active"):
        return 0

    state, blocked = validated_state_or_block(fable_dir)
    if blocked is not None:
        return blocked

    path = ledger_path(fable_dir)
    if not os.path.isfile(path):
        return block_state_if_needed(state)

    open_items, _has_any, paused = parse_ledger(path)
    if paused:
        return 0
    if open_items:
        return block_open_cards(path, open_items)

    bad = closed_without_evidence(path)
    if bad:
        return block_missing_ledger_evidence(path, bad)

    return block_state_if_needed(state)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        sys.stderr.write("[get-fable] close guard error (ignored): %r\n" % exc)
        sys.exit(0)
