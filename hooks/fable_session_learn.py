#!/usr/bin/env python3
"""Automatic post-session learning collector for get-fable.

Triggered on Stop and SessionEnd events across supported hosts (Claude, Codex, Antigravity).
Extracts verified learnings (Decisions, Lessons, Patterns, Surprises) with L3+ confidence,
guarantees agent-kernel availability (auto-installing if missing), and persists learn chunks.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _fable_common import read_hook_input, start_dir, find_fable_dir  # noqa: E402


def find_binary(name: str):
    found = shutil.which(name)
    if found:
        return found
    candidates = [
        Path.home() / ".bun" / "bin" / name,
        Path("/opt/homebrew/bin") / name,
        Path("/usr/local/bin") / name,
    ]
    for p in candidates:
        if p.exists() and os.access(p, os.X_OK):
            return str(p)
    return None


def ensure_agent_kernel():
    """Ensure agent-kernel is installed; install via Bun/npm if missing."""
    ak_bin = find_binary("agent-kernel")
    if ak_bin:
        return ak_bin

    bun_bin = find_binary("bun")
    if bun_bin:
        try:
            subprocess.run([bun_bin, "install", "-g", "agent-kernel"], capture_output=True, timeout=30)
            ak_bin = find_binary("agent-kernel")
            if ak_bin:
                return ak_bin
        except Exception:
            pass

    npm_bin = find_binary("npm")
    if npm_bin:
        try:
            subprocess.run([npm_bin, "install", "-g", "agent-kernel"], capture_output=True, timeout=30)
            ak_bin = find_binary("agent-kernel")
            if ak_bin:
                return ak_bin
        except Exception:
            pass

    return None


def resolve_transcript(data):
    """Attempt to locate the current session transcript."""
    # 1. From explicit hook data
    for key in ("transcript_path", "transcriptPath", "log_path"):
        cand = data.get(key)
        if cand and os.path.exists(cand):
            return Path(cand)

    # 2. From Antigravity brain directory
    brain_dir = Path.home() / ".gemini" / "antigravity" / "brain"
    session_id = data.get("session_id") or data.get("conversation_id")
    if session_id and brain_dir.exists():
        cand = brain_dir / str(session_id) / ".system_generated" / "logs" / "transcript.jsonl"
        if cand.exists():
            return cand

    # 3. Find most recent brain session
    if brain_dir.exists():
        try:
            sessions = sorted(
                [d for d in brain_dir.iterdir() if d.is_dir() and not d.name.startswith(".")],
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            for sess in sessions[:3]:
                cand = sess / ".system_generated" / "logs" / "transcript.jsonl"
                if cand.exists():
                    return cand
        except Exception:
            pass

    return None


def passes_filter(claim: str) -> bool:
    """Filter out generic boilerplate and absolute host paths."""
    lower = claim.lower()
    if any(p in lower for p in ["write tests", "check logs", "be careful", "debug it", "try again"]):
        return False
    if "/Users/" in claim or "/var/folders/" in claim:
        return False
    return 20 <= len(claim) <= 300


def extract_learnings_from_session(transcript_path: Path, workspace_root=None):
    """Extract L3+ verified learnings across 4 categories."""
    learnings = []
    seen = set()

    def add_fact(fact, category="lesson", confidence="L3"):
        fact = fact.strip().strip("-*• ")
        fact = re.sub(r'[\r\n]+', ' ', fact)
        if fact not in seen and passes_filter(fact):
            seen.add(fact)
            learnings.append({
                "fact": fact,
                "category": category,
                "confidence": confidence
            })

    # 1. Extract from transcript
    if transcript_path and transcript_path.exists():
        try:
            with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        step = json.loads(line)
                    except Exception:
                        continue

                    content = step.get("content", "") or ""
                    if step.get("type") in ("PLANNER_RESPONSE", "MODEL"):
                        for text_line in content.split("\n"):
                            text_line = text_line.strip()
                            # Verified Fixes / Root Causes (L3)
                            m_fix = re.match(r'^(?:-|\*|\d+\.)\s+(?:Root cause|Solution|Fix|Resolved|Key takeaway|Learned):\s*(.+)', text_line, re.I)
                            if m_fix:
                                add_fact(m_fix.group(1), category="lesson", confidence="L3")
                            # Architectural Decisions
                            m_dec = re.match(r'^(?:-|\*|\d+\.)\s+(?:Decision|Chose|Selected):\s*(.+)', text_line, re.I)
                            if m_dec:
                                add_fact(m_dec.group(1), category="decision", confidence="L3")
                            # Reusable Invariants
                            elif any(text_line.lower().startswith(p) for p in ["always ", "never ", "ensure ", "prefer ", "must "]):
                                add_fact(text_line, category="pattern", confidence="L3")
        except Exception:
            pass

    # 2. Extract from workspace artifacts
    if workspace_root:
        fable_dir = find_fable_dir(workspace_root)
        if fable_dir:
            ledger_file = os.path.join(fable_dir, "LEDGER.md")
            if os.path.exists(ledger_file):
                try:
                    with open(ledger_file, "r", encoding="utf-8") as f:
                        for l in f:
                            if "-- evidence:" in l and "- [x]" in l:
                                m = re.search(r'- \[x\]\s*(.+?)\s*--', l)
                                if m:
                                    add_fact(f"Verified requirement: {m.group(1).strip()}", category="lesson", confidence="L4")
                except Exception:
                    pass

    return learnings


def persist_learnings(learnings, workspace_root, session_id="auto"):
    if not learnings:
        return 0, 0

    # 1. agent-kernel
    ak_count = 0
    ak_bin = ensure_agent_kernel()
    if ak_bin:
        for item in learnings:
            fact = item["fact"]
            level = "critical" if item.get("confidence") in ("L3", "L4") else "normal"
            try:
                cmd = [ak_bin, "remember", fact, "--type", "rule", "--level", level]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if res.returncode == 0:
                    ak_count += 1
            except Exception:
                pass

    # 2. gbrain
    gb_count = 0
    gb_bin = find_binary("gbrain")
    if gb_bin:
        for item in learnings:
            fact = item["fact"]
            try:
                cmd = [
                    gb_bin,
                    "remember",
                    fact,
                    "--provenance", f"session:{session_id} get-fable auto-learn",
                    "--entity", "learnings/session"
                ]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                if res.returncode == 0:
                    gb_count += 1
            except Exception:
                pass

    # 3. Local .fable/learnings.json
    fable_dir = find_fable_dir(workspace_root)
    if fable_dir:
        learnings_file = os.path.join(fable_dir, "learnings.json")
        existing = []
        if os.path.exists(learnings_file):
            try:
                with open(learnings_file, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                existing = []
        new_records = [
            {
                "fact": item["fact"],
                "category": item.get("category", "lesson"),
                "confidence": item.get("confidence", "L3"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_id": session_id
            }
            for item in learnings
        ]
        try:
            with open(learnings_file, "w", encoding="utf-8") as f:
                json.dump(existing + new_records, f, indent=2)
        except Exception:
            pass

    return ak_count, gb_count


def main():
    try:
        data = read_hook_input()
        workspace_dir = start_dir(data)
        transcript = resolve_transcript(data)

        learnings = extract_learnings_from_session(transcript, workspace_root=workspace_dir)
        if not learnings:
            return 0

        session_id = data.get("session_id") or (transcript.parent.parent.name if transcript else "auto")
        ak_count, gb_count = persist_learnings(learnings, workspace_dir, session_id=session_id)

        if ak_count > 0 or gb_count > 0:
            print(f"[fable-learning] Documentation complete: {ak_count} rules persisted to agent-kernel, {gb_count} to gbrain.")
    except Exception:
        # Hooks must fail open
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
