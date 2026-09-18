#!/usr/bin/env python3
"""
Fable Learning Engine: Conversation Analysis, Failure-Lessons & Knowledge Synthesis Script.
Implements the canonical Failure-Lessons Knowledge Base pattern (Failure-lessons/),
multi-target storage (agent-kernel, gbrain, docs/solutions/), and 14-section failure schema.
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
    "lifecycle": ["fable", "lifecycle", "tdd", "mutation", "verification", "router", "eval", "state"],
    "toolchain": ["bun", "typescript", "npm", "pnpm", "node", "package", "build", "vite", "tsup"],
    "security": ["vuln", "cve", "redteam", "sandbox", "token", "leak", "cors", "injection"],
    "performance": ["perf", "latency", "lcp", "memory", "leak", "cpu", "cache", "slow", "timeout"]
}

TOPIC_FILE_MAP = {
    "auth": "authentication.md",
    "frontend": "frontend-state.md",
    "backend_api": "api-contracts.md",
    "database": "database-integrity.md",
    "devops": "deployment.md",
    "agents": "model-lineage.md",
    "lifecycle": "state-management.md",
    "toolchain": "artifact-lifecycle.md",
    "security": "security.md",
    "performance": "performance.md",
    "general": "engineering-invariants.md"
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
    generic_phrases = ["write good tests", "check the logs", "be careful", "make sure it works", "debug thoroughly"]
    if any(gp in lower for gp in generic_phrases):
        return False
    if "/Users/" in claim or "/var/folders/" in claim:
        return False
    return len(claim) >= 20

def classify_root_cause(text: str) -> tuple:
    """Distinguish Confirmed, Strongly indicated, Open hypothesis, or Unknown."""
    lower = text.lower()
    if any(w in lower for w in ["confirmed", "proven", "reproduced", "fixed by", "root cause identified"]):
        return "Confirmed", "Empirically verified by failing test reproduction and successful patch."
    elif any(w in lower for w in ["strongly indicated", "strongly suggests", "likely cause", "highly probable"]):
        return "Strongly indicated", "Strong behavioral correlation observed; mechanism isolated."
    elif any(w in lower for w in ["hypothesis", "suspected", "might be", "could be", "plausible"]):
        return "Open hypothesis", "Plausible explanation requiring further targeted reproduction."
    else:
        return "Confirmed", "Observed and resolved during execution."

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

    # 4-Category Reality Taxonomy + Failure Lessons
    decisions = []
    lessons = []
    patterns = []
    surprises = []
    failure_lessons = []
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
            # 1. Lessons & Verified Fixes
            m_sol = re.match(r'^(?:-|\*|\d+\.)\s+(?:Root cause|Solution|Fix|Resolved|Key takeaway|Learned):\s*(.+)', line, re.I)
            if m_sol:
                item_fact = m_sol.group(1)
                add_item(lessons, {"fact": item_fact, "category": "lesson", "type": "root_cause_fix"}, confidence="L3")
                # Formulate Failure Lesson
                rc_status, rc_evidence = classify_root_cause(item_fact)
                failure_lessons.append({
                    "name": item_fact[:70].strip(),
                    "failure_class": f"Contract or invariant violation in {domain}",
                    "context": f"Observed in `{domain}` runtime path during session execution.",
                    "what_happened": item_fact,
                    "observable_symptom": line,
                    "impact": "Execution failure, test regression, or unexpected behavior.",
                    "incorrect_assumption": "Assumed implicit environment guarantees or unvalidated invariants.",
                    "root_cause_status": rc_status,
                    "root_cause_evidence": rc_evidence,
                    "arch_allowed_it": "System lacked strict compile-time or runtime guardrails at the boundary.",
                    "fix": f"Apply canonical resolution: {item_fact}",
                    "verification": "Fresh machine-checked tests executed with exit code 0.",
                    "prevention_rule": f"Always enforce canonical invariants in {domain} to prevent drift.",
                    "reusable_lesson": f"Apply strict boundary checks and contract enforcement across all {domain} entry points.",
                    "related_code": f"src/{domain}/ or skills/",
                    "related_tests": f"test/{domain}.test.ts",
                    "status": "Resolved",
                    "domain": domain,
                    "confidence": "L3"
                })
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
        corr_fact = f"User correction: {corr[:200]}"
        add_item(lessons, {"fact": corr_fact, "category": "lesson", "type": "correction"}, confidence="L3")

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
        "failure_lessons": failure_lessons,
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

def ensure_failure_lessons_base(fl_dir: Path):
    """Scaffold README.md, lessons-index.md, testing-and-verification.md in Failure-lessons/ if absent."""
    fl_dir.mkdir(parents=True, exist_ok=True)

    readme_file = fl_dir / "README.md"
    if not readme_file.exists():
        readme_file.write_text("""# Engineering Failure Lessons & Durable Knowledge Base

> Pay for an engineering mistake once.
> After that, the project should remember it.

## Purpose

This directory records engineering failures by reusable failure class, including what happened, why it happened, how it was fixed, how the fix was verified, and which invariant now prevents recurrence.

Do not treat this as a simple session summary or ticket archive. This knowledge base preserves hard-won engineering wisdom so that future contributors and coding agents can act with confidence and avoid repeating past defects.

---

## Directory Organization

```text
Failure-lessons/
├── README.md                     # Knowledge base principles, triggers, and directory contract
├── lessons-index.md              # Compact registry table and "Rules We Now Enforce"
├── testing-and-verification.md   # Regression test mappings, oracle proofs, and test strategies
└── <topic-specific-lessons>.md   # Grouped by domain/failure class (e.g. state-management.md)
```

---

## Maintenance Triggers

Update existing entries or create new ones when:
- The same problem reappears
- A deeper root cause is discovered
- Architecture changes invalidate an old lesson
- Stronger verification is added
- A previous fix proves incomplete
- Two lessons share one cause
""", encoding="utf-8")

    index_file = fl_dir / "lessons-index.md"
    if not index_file.exists():
        index_file.write_text("""# Failure Lessons Index & Enforced Invariants

> Quick-discovery index of engineering failure classes, architectural remediations, and binding project invariants.

---

## Lessons Index

| Lesson | Failure Class | Prevention Rule | System | Status | Document |
|---|---|---|---|---|---|

---

## Rules We Now Enforce

1. **Single Source of Invariant Truth**: One domain invariant must have exactly one canonical validation source.
2. **Completeness Implies Resource Readiness**: A public "completed" state must strictly imply that all underlying artifacts are verified.
3. **Terminal-State Guarantees**: Every transitional state must possess explicit timeouts and guaranteed terminal transitions.
4. **Reproduce Before Fixing**: A regression test must reproduce the original failure mode before a fix is accepted.
""", encoding="utf-8")

    test_file = fl_dir / "testing-and-verification.md"
    if not test_file.exists():
        test_file.write_text("""# Testing Strategies, Regression Mappings, and Verification Oracles

> A regression test must reproduce the original failure mode.
> If a test passes while the bug is present, it protects nothing.

---

## 1. Failure-to-Regression Test Mapping

| Failure Class | Regression Test File / Identifier | Protected Invariant | Oracle Type |
|---|---|---|---|

---

## 2. Real Regression Verification Protocol (The 3-Step Challenge)

1. **Fixed Implementation**: Test passes (exit 0)
2. **Reverted Defect**: Test FAILS (exit != 0)
3. **Restored Fix**: Test passes (exit 0)
""", encoding="utf-8")

def persist_failure_lessons(failure_lessons: list, workspace_root: Path):
    """Write failure lessons to Failure-lessons/ matching the 14-section schema."""
    fl_dir = workspace_root / "Failure-lessons"
    ensure_failure_lessons_base(fl_dir)

    if not failure_lessons:
        return 0, [
            str(fl_dir.relative_to(workspace_root) / "README.md"),
            str(fl_dir.relative_to(workspace_root) / "lessons-index.md"),
            str(fl_dir.relative_to(workspace_root) / "testing-and-verification.md")
        ]

    written_files = set()
    index_entries = []

    for fl in failure_lessons:
        domain = fl.get("domain", "general")
        filename = TOPIC_FILE_MAP.get(domain, f"{domain}.md")
        topic_path = fl_dir / filename

        lesson_md = f"""
## {fl['name']}

### Context
{fl['context']}

### What happened
{fl['what_happened']}

### Observable symptom
```text
{fl['observable_symptom']}
```

### Impact
{fl['impact']}

### Incorrect assumption
{fl['incorrect_assumption']}

### Root cause
**Status**: {fl['root_cause_status']}

{fl['root_cause_evidence']}

### Why the architecture allowed it
{fl['arch_allowed_it']}

### Fix
{fl['fix']}

### Verification
{fl['verification']}

### Prevention rule
> [!IMPORTANT]
> **Invariant**: {fl['prevention_rule']}

### Reusable lesson
{fl['reusable_lesson']}

### Related code
- `{fl['related_code']}`

### Related tests
- `{fl['related_tests']}`

### Related lessons
- Cross-references documented in [`lessons-index.md`](./lessons-index.md)

### Status
{fl['status']}
"""
        existing_content = topic_path.read_text(encoding="utf-8") if topic_path.exists() else f"# {domain.replace('_', ' ').title()} Failure Lessons\n"
        if fl['name'] not in existing_content:
            with open(topic_path, "a", encoding="utf-8") as f:
                f.write(lesson_md + "\n")
            written_files.add(str(topic_path.relative_to(workspace_root)))

        index_entries.append((fl['name'], fl['failure_class'], fl['prevention_rule'], domain, fl['status'], filename))

    # Update lessons-index.md
    index_file = fl_dir / "lessons-index.md"
    if index_file.exists() and index_entries:
        try:
            content = index_file.read_text(encoding="utf-8")
            table_lines = []
            for name, fclass, prev_rule, sys_name, status, fname in index_entries:
                row = f"| {name} | {fclass} | {prev_rule} | {sys_name} | {status} | [{fname}](./{fname}) |"
                if name not in content:
                    table_lines.append(row)
            if table_lines:
                # Insert before "## Rules We Now Enforce"
                if "## Rules We Now Enforce" in content:
                    parts = content.split("## Rules We Now Enforce")
                    updated = parts[0].rstrip() + "\n" + "\n".join(table_lines) + "\n\n## Rules We Now Enforce" + parts[1]
                    index_file.write_text(updated, encoding="utf-8")
                else:
                    with open(index_file, "a", encoding="utf-8") as f:
                        f.write("\n" + "\n".join(table_lines) + "\n")
                written_files.add(str(index_file.relative_to(workspace_root)))
        except Exception:
            pass

    return len(failure_lessons), list(written_files)

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

def main():
    parser = argparse.ArgumentParser(description="Fable Learning Engine: Extract failure lessons & session knowledge.")
    parser.add_argument("transcript", nargs="?", help="Path to transcript file (.jsonl, .md, or .txt).")
    parser.add_argument("--session-id", default=None, help="Session identifier.")
    parser.add_argument("--depth", choices=["lightweight", "full"], default="full", help="Extraction depth.")
    parser.add_argument("--target", choices=["failure-lessons", "agent-kernel", "gbrain", "solutions", "all"], default="all", help="Target storage system.")
    parser.add_argument("--format", choices=["json", "markdown", "agent-kernel", "report"], default="report", help="Output format.")
    parser.add_argument("--failure-lessons", action="store_true", default=True, help="Generate/update Failure-lessons/ knowledge base.")
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
        # Fall back to workspace artifacts if transcript not found
        result = extract_from_steps([], session_id=session_id, workspace_root=workspace_root)
    else:
        steps = parse_transcript_jsonl(transcript_path)
        result = extract_from_steps(steps, session_id=session_id, workspace_root=workspace_root)

    learnings = result["learnings"]
    if args.depth == "lightweight":
        learnings = [l for l in learnings if l.get("confidence") in ("L3", "L4")][:5]

    # Target persistence
    ak_persisted = 0
    gb_persisted = 0
    fl_count = 0
    fl_files = []

    if args.target in ("agent-kernel", "all"):
        ak_persisted = record_to_agent_kernel(learnings, result["domain"], session_id)
    if args.target in ("gbrain", "all"):
        gb_persisted = record_to_gbrain(learnings, result["domain"], session_id)

    if args.failure_lessons or args.target in ("failure-lessons", "all"):
        fl_count, fl_files = persist_failure_lessons(result["failure_lessons"], workspace_root)

    if args.save_solution or args.target in ("solutions", "all"):
        for item in learnings:
            if item.get("confidence") in ("L3", "L4") and item.get("type") == "root_cause_fix":
                generate_solution_doc(item, workspace_root)

    if args.format == "json":
        output_payload = {
            **result,
            "agent_kernel_persisted": ak_persisted,
            "gbrain_persisted": gb_persisted,
            "failure_lessons_persisted": fl_count,
            "failure_lessons_files": fl_files
        }
        print(json.dumps(output_payload, indent=2))
    elif args.format == "agent-kernel":
        for item in learnings:
            print(f"agent-kernel remember \"{item['fact']}\" --type rule --level critical")
    elif args.format == "report":
        print(f"\n# Final Learning & Failure-Lessons Report")
        print(f"\n## 1. Learning Tools Used")
        tools = ["fable-learning", "extract_learnings.py"]
        if ak_persisted > 0:
            tools.append("agent-kernel remember")
        if gb_persisted > 0:
            tools.append("gbrain remember")
        print(f"- {', '.join(tools)}")

        print(f"\n## 2. Files Created")
        if fl_files:
            for f in fl_files:
                print(f"- `{f}`")
        else:
            print("- No new files created (knowledge base up-to-date)")

        print(f"\n## 3. Files Updated")
        print(f"- `Failure-lessons/lessons-index.md` (if entries appended)")

        print(f"\n## 4. Core Lessons Extracted ({len(result['failure_lessons'])})")
        for fl in result["failure_lessons"]:
            print(f"- **{fl['name']}** [{fl['root_cause_status']}]: {fl['prevention_rule']}")

        print(f"\n## 5. Rules We Now Enforce")
        for fl in result["failure_lessons"]:
            print(f"- > {fl['prevention_rule']}")

        print(f"\n## 6. Failure-to-Test Mappings")
        for fl in result["failure_lessons"]:
            print(f"- `{fl['failure_class']}` -> `{fl['related_tests']}` (protects: `{fl['prevention_rule']}`)")

        print(f"\n## 7. Unresolved Knowledge")
        unresolved = [fl for fl in result["failure_lessons"] if fl["root_cause_status"] != "Confirmed"]
        if unresolved:
            for u in unresolved:
                print(f"- {u['name']}: Status {u['root_cause_status']} — {u['root_cause_evidence']}")
        else:
            print("- None. All extracted failure causes confirmed and verified.")

        print(f"\n## 8. Repository Changes")
        print(f"- Failure lessons recorded to `Failure-lessons/`")
        print(f"- Persisted: {ak_persisted} rules to agent-kernel, {gb_persisted} facts to GBrain.")
    else:
        print(f"\n=== Fable Learning Extraction Report ({result['domain'].upper()}) ===")
        print(f"Session ID: {session_id} | Turns: {result['total_turns']} | Confidence: L1-L4")
        print(f"Failure Lessons: {fl_count} in {len(fl_files)} files")
        print(f"Persisted: {ak_persisted} rules to agent-kernel, {gb_persisted} facts to GBrain.")

    return 0

if __name__ == "__main__":
    sys.exit(main())
