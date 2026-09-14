# Knowledge Synthesis & Storage Protocol

## Purpose
Define the multi-target storage protocol across `agent-kernel`, `gbrain`, `docs/solutions/`, `CONCEPTS.md`, and repository `docs/learning/` for Phase 2 of **Fable Learning**, incorporating principles from `ce-compound` and `learn`.

---

## Storage Hierarchy

| Layer | System | Role | Scope | Artifact Format |
|---|---|---|---|---|
| **L1** | `agent-kernel` | Universal agent policy & critical rules | System-wide across all agents | CLI: `agent-kernel remember` |
| **L2** | `gbrain` | Associative graph & semantic memory | Cross-session associative recall | CLI: `gbrain remember` |
| **L3** | `docs/solutions/` | Durable problem & solution codification | Project & codebase root | Markdown: `YYYY-MM-DD-<slug>.md` |
| **L4** | `CONCEPTS.md` | Domain glossary & mental models | Project & architecture scope | Markdown table in `docs/solutions/` |
| **L5** | `docs/learning/` | Chronological session retrospectives | Repository history | Markdown: `session-<date>-<topic>.md` |
| **L6** | `agent-kernel Playbooks` | Repeatable multi-step workflows | Domain-level procedural guides | `agent-kernel evolve generate` |

---

## 1. `agent-kernel` Rule Storage

Every verified learning with confidence $\ge L3$ is codified into an atomic rule chunk in `agent-kernel`:

```bash
# Save critical rule chunk
agent-kernel remember "<atomic claim statement>" --type rule --level critical

# Propose workflow rule with explicit attribution
agent-kernel propose --from get-fable --text "<rule text>" --reason "Extracted from session <id>"
```

### Atomicity & Quality Rules
- **One claim per rule**: One condition and one action. Never combine multiple distinct instructions into a single rule.
- **Action-oriented**: Formulate as clear directives (e.g. "When doing X, always ensure Y because Z").
- **Zero Secrets**: Never store tokens, passwords, private keys, local absolute paths, or credentials.

### Auto-Installation Protocol
If `agent-kernel` is not found on the host, the runtime automatically invokes:
```bash
bun install -g agent-kernel || npm install -g agent-kernel
```
If network or permissions prevent installation, the learnings are safely buffered in `~/.gemini/antigravity/learning-inbox/` for later synchronization.

---

## 2. GBrain Chunk Schema

Index each verified learning and pattern into GBrain:

```bash
gbrain remember "<one concrete learning statement>" \
  --provenance "session:<id> date:<ISO-date> topic:<domain>" \
  --entity "learnings/<domain>"

gbrain add-tag "<chunk-id>" --tag "reusable" --tag "<domain>" --tag "auto-hook"
```

---

## 3. Compound Solution Codification (`docs/solutions/`)

When a session resolves a non-trivial bug, configuration issue, test failure, or architectural challenge, author a durable solution doc in:
`docs/solutions/YYYY-MM-DD-<problem-slug>.md`

Following the schema from `references/solution-architecture.md`:
- Frontmatter containing `title`, `problem_type`, `impact_scope`, `root_cause`, `verified_fix`, `verification_command`, and `confidence`.
- Verbatim error symptom or failing test output.
- Root cause explanation contrasting failed attempts with the working fix.
- Exact code diff or command executed.
- Machine-checked verification command and output.
- Reusable invariant & prevention rule.

---

## 4. Vocabulary & Concept Indexing (`CONCEPTS.md`)

When a solution introduces or relies on domain-specific vocabulary, specialized abbreviations, or architectural primitives:
- Update `docs/solutions/CONCEPTS.md`.
- Record: Term, Category, Domain Definition, First Observed In, Related Rules.

---

## 5. Repository Retrospectives (`docs/learning/`)

For broad milestone reviews or multi-turn sessions with multiple takeaways:
- Create `docs/learning/session-<YYYY-MM-DD>-<topic>.md`.
- Summarize problems, verified resolutions, and durable rules.

---

## 6. `agent-kernel` Playbook Generation

When **all three conditions** are met:
1. $\ge 3$ learnings share the same domain or workflow.
2. At least 1 verified fix ($L3+$ confidence).
3. A repeatable sequential remediation or setup path exists.

Trigger:
```bash
agent-kernel evolve generate \
  --title "<Verb-Phrase Title>" \
  --topic "<domain>"
```
