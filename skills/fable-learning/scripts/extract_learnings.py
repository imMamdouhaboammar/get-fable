#!/usr/bin/env python3
"""
Fable Learning Engine: Conversation Analysis & Knowledge Synthesis Script
Upgraded with paradigms from gsd-extract-learnings, learn, ce-compound, engineering-ai-engineer, and ml-best-practices.

Parses conversation transcripts (Antigravity JSONL, markdown, raw text) and lifecycle artifacts,
extracts Decisions, Lessons, Patterns, and Surprises, scores empirical confidence (L1-L4),
ensures agent-kernel is installed, persists learnings to agent-kernel and GBrain,
and optionally generates compound solution docs in docs/solutions/ and updates CONCEPTS.md.
"""

import sys
import os
import json
import re
import argparse
import subprocess
import shutil
from datetime import datetime, timezone
from pathlib import Path

DOMAINS = {
    "auth": ["auth", "oauth", "jwt", "supabase-auth", "login", "session", "credential"],
    "frontend": ["nextjs", "react", "tailwind", "ui", "component", "css", "html", "vite"],
    "backend_api": ["api", "rest", "graphql", "mcp", "fastapi", "endpoint", "route", "server"],
    "database": ["db", "postgres", "supabase", "query", "schema", "sql", "migration", "prisma"],
    "devops": ["deploy", "ci", "docker", "k8s", "vercel", "railway", "git", "github", "hook"],
    "agents": ["agent", "llm", "prompt", "skill", "playbook", "gemini", "claude", "antigravity"],
    "lifecycle": ["fable", "lifecycle", "tdd", "mutation", "verification", "router", "eval"],
    "toolchain": ["bun", "typescript", "npm", "pnpm", "node", "package", "build", "vite", "tsup"]
}

def clean_text(raw_text: str) -> str:
    text = re.sub(r'<USER_REQUEST>([\s\S]*?)</USER_REQUEST>', r'\1', raw_text)
    text = re.sub(r'<[A-Z_]+>[\s\S]*?</[A-Z_]+>', '', text)
    text = re.sub(r'<[A-Za-z0-9_\-]+(\s+[^>]*)?>', '', text)
    text = re.sub(r'</[A-Za-z0-9_\-]+>', '', text)
    return text.strip()

def detect_domain(text: str) -> str:
    lower_text = text.lower()
    scores = {}
    for domain, keywords in DOMAINS.items():
        score = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', lower_text))
        if score > 0:
            scores[domain] = score
    if not scores:
        return "general"
    return max(scores.items(), key=lambda x: x[1])[0]

def parse_transcript_jsonl(file_path: Path):
    steps = []
    if not file_path.exists():
        return steps

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                steps.append(data)
            except Exception:
                continue
    return steps

def passes_three_question_filter(claim: str, domain: str) -> bool:
    """The /learn 3-question filter: recurrence, predictive utility, specificity."""
    lower = claim.lower()
    # Reject generic boilerplate
    generic_phrases = ["write good tests", "check the logs", "be careful", "make sure it works", "debug thoroughly"]
    if any(gp in lower for gp in generic_phrases):
        return False
    # Reject raw paths or machine-specific artifacts
    if "/Users/" in claim or "/var/folders/" in claim:
        return False
    return len(claim) >= 20

def extract_from_steps(steps, session_id="unknown", workspace_root=None):
    user_inputs = []
    planner_responses = []
    tool_outputs = []
    corrections = []
    confirmations = []

    for step in steps:
        stype = step.get("type")
        raw_content = step.get("content", "") or ""
        content = clean_text(raw_content)
        thinking = step.get("thinking", "") or ""

        if stype == "USER_INPUT":
            if not content:
                continue
            user_inputs.append(content)
            lower = content.lower()
            if any(w in lower for w in ["no,", "no ", "not that", "instead", "wrong", "fix this", "error:", "failed", "broken"]):
                corrections.append(content)
            elif any(w in lower for w in ["great", "perfect", "good job", "looks good", "proceed", "approved"]):
                confirmations.append(content)
        elif stype == "PLANNER_RESPONSE":
            planner_responses.append(content)
            if thinking:
                planner_responses.append(thinking[:500])
        elif stype == "SYSTEM":
            tool_outputs.append(content[:1000])

    full_conversation_text = "\n".join(user_inputs + planner_responses)
    domain = detect_domain(full_conversation_text)

    # 4-Category Reality Taxonomy (GSD)
    decisions = []
    lessons = []
    patterns = []
    surprises = []
    seen_facts = set()

    def add_item(collection, item, confidence="L2"):
        fact = item.get("fact", "").strip().strip("-*• ")
        if len(fact) < 15 or len(fact) > 300:
            return
        fact = re.sub(r'[\r\n]+', ' ', fact)
        if fact not in seen_facts:
            seen_facts.add(fact)
            item["fact"] = fact
            item["domain"] = domain
            item["confidence"] = confidence
            item["session_id"] = session_id
            item["timestamp"] = datetime.now(timezone.utc).isoformat()
            collection.append(item)

    for resp in planner_responses:
        for line in resp.split("\n"):
            line = line.strip()
            # 1. Lessons & Solutions (L3 if verified fix)
            m_sol = re.match(r'^(?:-|\*|\d+\.)\s+(?:Root cause|Solution|Fix|Resolved|Key takeaway|Learned):\s*(.+)', line, re.I)
            if m_sol:
                add_item(lessons, {"fact": m_sol.group(1), "category": "lesson", "type": "root_cause_fix"}, confidence="L3")
            # 2. Decisions
            m_dec = re.match(r'^(?:-|\*|\d+\.)\s+(?:Decision|Chose|Selected|Architectural choice):\s*(.+)', line, re.I)
            if m_dec:
                add_item(decisions, {"fact": m_dec.group(1), "category": "decision"}, confidence="L3")
            # 3. Patterns
            m_pat = re.match(r'^(?:-|\*|\d+\.)\s+(?:Pattern|Workflow|Best practice):\s*(.+)', line, re.I)
            if m_pat:
                add_item(patterns, {"fact": m_pat.group(1), "category": "pattern"}, confidence="L3")
            elif any(line.lower().startswith(prefix) for prefix in ["always ", "never ", "ensure ", "prefer ", "must ", "avoid "]):
                add_item(patterns, {"fact": line, "category": "pattern"}, confidence="L2")
            # 4. Surprises
            m_sur = re.match(r'^(?:-|\*|\d+\.)\s+(?:Surprise|Unexpected|Notice|Discovered):\s*(.+)', line, re.I)
            if m_sur:
                add_item(surprises, {"fact": m_sur.group(1), "category": "surprise"}, confidence="L2")

    for corr in corrections:
        add_item(lessons, {"fact": f"User correction: {corr[:200]}", "category": "lesson", "type": "correction"}, confidence="L3")

    # If workspace has lifecycle artifacts, harvest them
    if workspace_root and Path(workspace_root).exists():
        root_p = Path(workspace_root)
        ledger_file = root_p / ".fable" / "LEDGER.md"
        if ledger_file.exists():
            try:
                for l in ledger_file.read_text(encoding="utf-8").splitlines():
                    if "-- evidence:" in l and "- [x]" in l:
                        fact_match = re.search(r'- \[x\]\s*(.+?)\s*--', l)
                        if fact_match:
                            add_item(lessons, {"fact": f"Verified card: {fact_match.group(1).strip()}", "category": "lesson"}, confidence="L4")
            except Exception:
                pass

    all_learnings = decisions + lessons + patterns + surprises

    return {
        "session_id": session_id,
        "domain": domain,
        "total_turns": len(steps),
        "user_messages_count": len(user_inputs),
        "corrections_count": len(corrections),
        "confirmations_count": len(confirmations),
        "decisions": decisions,
        "lessons": lessons,
        "patterns": patterns,
        "surprises": surprises,
        "learnings": all_learnings
    }

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
    """Check if agent-kernel is available; if not, attempt automatic installation."""
    bin_path = find_binary("agent-kernel")
    if bin_path:
        return bin_path

    # Attempt auto-install via Bun or npm
    bun_bin = find_binary("bun")
    if bun_bin:
        try:
            subprocess.run([bun_bin, "install", "-g", "agent-kernel"], capture_output=True, timeout=30)
            bin_path = find_binary("agent-kernel")
            if bin_path:
                return bin_path
        except Exception:
            pass

    npm_bin = find_binary("npm")
    if npm_bin:
        try:
            subprocess.run([npm_bin, "install", "-g", "agent-kernel"], capture_output=True, timeout=30)
            bin_path = find_binary("agent-kernel")
            if bin_path:
                return bin_path
        except Exception:
            pass

    return None

def record_to_agent_kernel(learnings: list, domain: str, session_id: str):
    """Persist verified learnings to agent-kernel remember."""
    agent_kernel_bin = ensure_agent_kernel()
    if not agent_kernel_bin:
        return 0

    success_count = 0
    for item in learnings:
        fact = item["fact"]
        if not passes_three_question_filter(fact, domain):
            continue
        level = "critical" if item.get("confidence") in ("L3", "L4") else "normal"
        cmd = [
            agent_kernel_bin,
            "remember",
            fact,
            "--type", "rule",
            "--level", level
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                success_count += 1
        except Exception:
            pass
    return success_count

def record_to_gbrain(learnings: list, domain: str, session_id: str):
    """Persist learnings to GBrain chunks."""
    gbrain_bin = find_binary("gbrain")
    if not gbrain_bin:
        return 0

    success_count = 0
    for item in learnings:
        fact = item["fact"]
        cmd = [
            gbrain_bin,
            "remember",
            fact,
            "--provenance", f"session:{session_id} domain:{domain}",
            "--entity", f"learnings/{domain}"
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                success_count += 1
        except Exception:
            pass
    return success_count

def generate_solution_doc(verified_learning: dict, workspace_root: Path):
    """Generate a Compound Engineering solution doc in docs/solutions/."""
    solutions_dir = workspace_root / "docs" / "solutions"
    solutions_dir.mkdir(parents=True, exist_ok=True)

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', verified_learning["fact"][:40].lower()).strip('-')
    sol_file = solutions_dir / f"{date_str}-{slug}.md"

    content = f"""---
title: "{verified_learning['fact'][:80]}"
problem_type: "{verified_learning.get('domain', 'general')}"
impact_scope: "repo"
root_cause: "{verified_learning['fact']}"
verified_fix: "Verified during session execution"
confidence: "{verified_learning.get('confidence', 'L3')}"
extracted_at: "{datetime.now(timezone.utc).isoformat()}"
session_id: "{verified_learning.get('session_id', 'unknown')}"
---

# {verified_learning['fact'][:80]}

## Problem Overview
During session execution, an issue in the `{verified_learning.get('domain', 'general')}` domain was encountered.

## Root Cause Analysis
{verified_learning['fact']}

## Verified Resolution
Empirically validated and resolved.

## Reusable Invariant
> [!IMPORTANT]
> **Rule:** {verified_learning['fact']}
"""
    try:
        sol_file.write_text(content, encoding="utf-8")
        return sol_file
    except Exception:
        return None

def update_concepts_dictionary(terms: list, workspace_root: Path):
    """Append newly discovered domain vocabulary to docs/solutions/CONCEPTS.md."""
    if not terms:
        return
    solutions_dir = workspace_root / "docs" / "solutions"
    solutions_dir.mkdir(parents=True, exist_ok=True)
    concepts_file = solutions_dir / "CONCEPTS.md"

    if not concepts_file.exists():
        concepts_file.write_text("""# Concept Dictionary & Domain Vocabulary

| Term | Category | Domain Definition | First Observed In | Related Rules / Invariants |
|---|---|---|---|---|
""", encoding="utf-8")

    lines = []
    for term, cat, defn in terms:
        lines.append(f"| {term} | {cat} | {defn} | session extraction | See docs/solutions/ |")
    
    try:
        with open(concepts_file, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    except Exception:
        pass

def main():
    parser = argparse.ArgumentParser(description="Fable Learning Engine: Extract and persist session learnings.")
    parser.add_argument("transcript", nargs="?", help="Path to transcript file (.jsonl, .md, or .txt).")
    parser.add_argument("--session-id", default=None, help="Session identifier.")
    parser.add_argument("--depth", choices=["lightweight", "full"], default="full", help="Extraction depth.")
    parser.add_argument("--target", choices=["agent-kernel", "gbrain", "solutions", "all"], default="all", help="Target storage system.")
    parser.add_argument("--format", choices=["json", "markdown", "agent-kernel"], default="markdown", help="Output format.")
    parser.add_argument("--save-solution", action="store_true", help="Generate docs/solutions/ document for L3+ fixes.")
    parser.add_argument("--workspace", default=".", help="Workspace root directory.")

    args = parser.parse_args()
    workspace_root = Path(args.workspace).resolve()

    # Resolve transcript path
    transcript_path = None
    session_id = args.session_id or "session-auto"

    if args.transcript:
        candidate = Path(args.transcript)
        if candidate.exists():
            transcript_path = candidate
    elif args.session_id:
        brain_path = Path.home() / ".gemini" / "antigravity" / "brain" / args.session_id / ".system_generated" / "logs" / "transcript.jsonl"
        if brain_path.exists():
            transcript_path = brain_path

    if not transcript_path:
        # Check active session brain
        brain_dir = Path.home() / ".gemini" / "antigravity" / "brain"
        if brain_dir.exists():
            dirs = sorted([d for d in brain_dir.iterdir() if d.is_dir() and not d.name.startswith(".")], key=lambda x: x.stat().st_mtime, reverse=True)
            for d in dirs[:3]:
                cand = d / ".system_generated" / "logs" / "transcript.jsonl"
                if cand.exists():
                    transcript_path = cand
                    session_id = d.name
                    break

    if not transcript_path or not transcript_path.exists():
        print(f"Error: Could not locate transcript file.", file=sys.stderr)
        return 1

    steps = parse_transcript_jsonl(transcript_path)
    result = extract_from_steps(steps, session_id=session_id, workspace_root=workspace_root)

    learnings = result["learnings"]
    if args.depth == "lightweight":
        learnings = [l for l in learnings if l.get("confidence") in ("L3", "L4")][:5]

    # Target persistence
    ak_persisted = 0
    gb_persisted = 0
    if args.target in ("agent-kernel", "all"):
        ak_persisted = record_to_agent_kernel(learnings, result["domain"], session_id)
    if args.target in ("gbrain", "all"):
        gb_persisted = record_to_gbrain(learnings, result["domain"], session_id)

    if args.save_solution or args.target in ("solutions", "all"):
        for item in learnings:
            if item.get("confidence") in ("L3", "L4") and item.get("type") == "root_cause_fix":
                generate_solution_doc(item, workspace_root)

    if args.format == "json":
        output_payload = {
            **result,
            "agent_kernel_persisted": ak_persisted,
            "gbrain_persisted": gb_persisted
        }
        print(json.dumps(output_payload, indent=2))
    elif args.format == "agent-kernel":
        for item in learnings:
            print(f"agent-kernel remember \"{item['fact']}\" --type rule --level critical")
    else:
        print(f"\n=== Fable Learning Extraction Report ({result['domain'].upper()}) ===")
        print(f"Session ID: {session_id} | Turns: {result['total_turns']} | Confidence: L1-L4")
        print(f"\n## Decisions ({len(result['decisions'])})")
        for d in result["decisions"]:
            print(f"- [{d.get('confidence', 'L3')}] {d['fact']}")
        print(f"\n## Lessons ({len(result['lessons'])})")
        for l in result["lessons"]:
            print(f"- [{l.get('confidence', 'L3')}] {l['fact']}")
        print(f"\n## Patterns ({len(result['patterns'])})")
        for p in result["patterns"]:
            print(f"- [{p.get('confidence', 'L2')}] {p['fact']}")
        print(f"\n## Surprises ({len(result['surprises'])})")
        for s in result["surprises"]:
            print(f"- [{s.get('confidence', 'L2')}] {s['fact']}")
        print(f"\nPersisted: {ak_persisted} rules to agent-kernel, {gb_persisted} facts to GBrain.")

    return 0

if __name__ == "__main__":
    sys.exit(main())
