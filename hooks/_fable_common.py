"""Shared helpers for get-fable lifecycle hooks.

Safety contract:
- FAIL OPEN: an unexpected hook error must not brick the host session.
- OPT IN: hooks act only inside a project with a `.fable/` directory.
- PROJECT LOCAL: durable workflow state stays in `.fable/state.json`.
"""
import datetime
import json
import os
import re
import sys
import tempfile
import time

STATE_SCHEMA_VERSION = 1
CANONICAL_SKILLS = {
    "get-fable",
    "fable-discover",
    "fable-plan",
    "fable-execute",
    "fable-verify",
    "fable-recover",
}
PHASES = {
    "idle",
    "discovering",
    "planned",
    "executing",
    "verifying",
    "recovering",
    "complete",
    "blocked",
}


def read_hook_input():
    """Parse hook JSON delivered on stdin. Return {} on any problem."""
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return {}
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def start_dir(data):
    """Best-effort project directory from hook cwd, else process cwd."""
    cwd = data.get("cwd")
    if cwd and os.path.isdir(cwd):
        return cwd
    try:
        return os.getcwd()
    except Exception:
        return "."


def find_fable_dir(start):
    """Walk upward for `.fable/`, stopping at the project git root."""
    try:
        cur = os.path.abspath(start)
    except Exception:
        return None
    while True:
        candidate = os.path.join(cur, ".fable")
        if os.path.isdir(candidate):
            return candidate
        if os.path.isdir(os.path.join(cur, ".git")):
            return None
        parent = os.path.dirname(cur)
        if parent == cur:
            return None
        cur = parent


def ledger_path(fable_dir):
    return os.path.join(fable_dir, "LEDGER.md")


def state_path(fable_dir):
    return os.path.join(fable_dir, "state.json")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def read_state(fable_dir):
    """Read a valid schema-v1 state object, or None on any problem."""
    try:
        with open(state_path(fable_dir), encoding="utf-8") as handle:
            state = json.load(handle)
        if not isinstance(state, dict) or state.get("schemaVersion") != STATE_SCHEMA_VERSION:
            return None
        if state.get("phase") not in PHASES:
            return None
        skill = state.get("currentSkill")
        if skill is not None and skill not in CANONICAL_SKILLS:
            return None
        streak = state.get("failureStreak")
        if not isinstance(streak, int) or streak < 0:
            return None
        if not isinstance(state.get("substantial"), bool):
            return None
        if not isinstance(state.get("evidence"), list):
            return None
        return state
    except Exception:
        return None


def write_state(fable_dir, state):
    """Atomically write state beside the current state file. Best effort."""
    if not isinstance(state, dict):
        return False
    try:
        os.makedirs(fable_dir, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(prefix=".state.", suffix=".tmp", dir=fable_dir)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(state, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_path, state_path(fable_dir))
            return True
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
    except Exception:
        return False


def has_fresh_passing_state_evidence(state):
    if not isinstance(state, dict):
        return False
    evidence = state.get("evidence", [])
    if not isinstance(evidence, list) or not evidence:
        return False
    latest = evidence[-1]
    detail = latest.get("detail") if isinstance(latest, dict) else None
    return (
        isinstance(latest, dict)
        and latest.get("result") == "pass"
        and isinstance(detail, str)
        and bool(detail.strip())
    )


def record_command_result(fable_dir, failed):
    """Update durable failure state after a command result."""
    state = read_state(fable_dir)
    if state is None:
        return None

    if failed:
        state["failureStreak"] = int(state.get("failureStreak", 0)) + 1
        if state["failureStreak"] >= 2 and state.get("phase") != "complete":
            state["phase"] = "recovering"
            state["currentSkill"] = "fable-recover"
            state["substantial"] = True
    else:
        state["failureStreak"] = 0

    state["updatedAt"] = now_iso()
    write_state(fable_dir, state)
    return state


EVIDENCE_RE = re.compile(r"(evidence|verified|证据|凭证|验证)\s*[:：]", re.IGNORECASE)
MIN_EVIDENCE_CHARS = 6


def closed_without_evidence(path):
    """List checked ledger cards with missing or hollow evidence markers."""
    bad = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                text = line.strip()
                if text[:5].lower() != "- [x]":
                    continue
                match = EVIDENCE_RE.search(text)
                if not match or len(text[match.end():].strip()) < MIN_EVIDENCE_CHARS:
                    bad.append(text)
    except Exception:
        return []
    return bad


def _sessions_dir():
    directory = os.path.join(tempfile.gettempdir(), "fable-mode-sessions")
    os.makedirs(directory, exist_ok=True)
    return directory


def _safe_sid(session_id):
    return re.sub(r"[^A-Za-z0-9._-]", "_", str(session_id))[:120]


def _streak_file(session_id):
    return os.path.join(_sessions_dir(), _safe_sid(session_id) + ".fails")


def load_fail_streak(session_id):
    if not session_id:
        return 0
    try:
        with open(_streak_file(session_id), encoding="utf-8") as handle:
            return max(0, int(handle.read().strip() or 0))
    except Exception:
        return 0


def save_fail_streak(session_id, count):
    if not session_id:
        return
    try:
        directory = _sessions_dir()
        now = time.time()
        for filename in os.listdir(directory):
            candidate = os.path.join(directory, filename)
            try:
                if now - os.path.getmtime(candidate) > 7 * 86400:
                    os.remove(candidate)
            except OSError:
                pass
        with open(_streak_file(session_id), "w", encoding="utf-8") as handle:
            handle.write(str(int(count)))
    except Exception:
        pass


def parse_ledger(path):
    """Return (open_items, has_any, paused) for a ledger file."""
    open_items = []
    has_any = False
    paused = False
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                text = line.strip()
                if text.upper().startswith("PAUSED"):
                    reason = text[len("PAUSED"):].strip(" \t:：-–—")
                    if len(reason.strip()) >= 3:
                        paused = True
                    continue
                if len(text) < 4 or not text.startswith("- ["):
                    continue
                mark = text[3:4].lower()
                if text[2:5] == "[ ]":
                    has_any = True
                    open_items.append(text)
                elif mark in ("x", "~"):
                    has_any = True
    except FileNotFoundError:
        return [], False, False
    except Exception:
        return [], False, False
    return open_items, has_any, paused
