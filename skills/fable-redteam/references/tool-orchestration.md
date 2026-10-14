# Fable RedTeam Tool Orchestration Guide

`fable-redteam` orchestrates 6 best-of-breed ethical offensive security frameworks into a single unified workflow, backed by a native TypeScript fallback engine.

## 1. Integrated Architecture

| Tool | Role | Execution Mechanism | Fallback When Missing |
|---|---|---|---|
| **0x4m4/HexStrike-AI** | Automated vulnerability scans (Nuclei, Nmap, FFuf, Nikto) | MCP Server / Docker container | Native HTTP Probe |
| **akto-api-security/akto** | OWASP API Top 10 & business logic auditing | OpenAPI / Swagger schema parser & HTTP engine | Native Probe / Spec Analyzer |
| **SnailSploit/Claude-Red** | Cognitive tactical playbooks & LLM prompt defenses | Built-in playbook heuristics & tactical rules | Built-in heuristics |
| **AIPentest/CyberStrikeAI** | Multi-stage attack graph & exploit kill chains | In-memory graph solver | Single-vector finding report |
| **vxcontrol/pentagi** | Sandboxed autonomous multi-agent swarm | Isolated Docker bridge network | Controlled sequential probe |
| **GH05TCREW/pentestagent**| Interactive dynamic payload driver | CLI subprocess runner | Native Probe |
| **Native Probe** | Universal zero-dependency baseline | Pure TypeScript HTTP/fetch client | N/A (Always available) |

---

## 2. Safety Invariants

1. **Colima Prohibition:** The workspace strictly forbids Colima. `get-fable redteam setup` checks for Colima processes, sockets, and environment variables, aborting with a clean error if found. Supported container engines are Docker Desktop, OrbStack, and Podman.
2. **Fail-Closed Scope:** All requests are validated against `.fable/redteam.json`.
3. **Safe-Mode:** Rate-limiting (10 req/s), zero destructive SQL/OS mutations, no service disruption.

---

## 3. Closed-Loop Remediation

Any Critical or High severity findings can be immediately converted into Fable work cards:
```bash
get-fable redteam fix
```
This updates `.fable/LEDGER.md`, allowing the AI agent to transition into `$fable-plan` and `$fable-tdd` to remediate the vulnerability with automated tests.
