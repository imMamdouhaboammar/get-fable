# Claude-Red Tactical Cognitive Playbooks

This reference provides ethical offensive security reasoning frameworks compiled from `SnailSploit/Claude-Red`. It guides AI agents (such as Antigravity, Claude Code, Cursor, and Codex) when conducting penetration testing through `fable-redteam`.

## 1. Ethical Red Teaming Mindset

- **Evidence Over Assumption:** Never report a vulnerability without observable proof (HTTP status, response snippet, or reproducible cURL).
- **Non-Destructive Boundary:** All probes MUST respect `safeMode: true`. Do not execute `DROP`, `DELETE`, denial of service, or account lockout attacks.
- **Fail-Closed Scope:** If target domain or port is not explicitly declared in `.fable/redteam.json`, halt testing immediately.

---

## 2. Tactical Domain Heuristics

### A. Broken Object Level Authorization (BOLA / IDOR) - CWE-639
1. **Identifier Discovery:** Identify route patterns containing numeric, UUID, or hash identifiers (`/api/accounts/{id}/transactions`, `/api/profile?user_id=102`).
2. **Dual-Token Replay:**
   - Establish baseline response as `User A` querying `Resource A`.
   - Replay exact request using `User A` token querying `Resource B` (owned by `User B`).
   - If response yields `200 OK` with sensitive attributes belonging to `User B`, confirm IDOR.
3. **Remediation Contract:** Validate resource tenant ownership at the database/query layer (`WHERE user_id = :session_user_id`), not just route-level authentication.

### B. Unauthenticated State Mutation - CWE-306
1. **Method Tampering:** Examine POST, PUT, PATCH, DELETE endpoints.
2. **Omit Authorization:** Send identical payload without `Authorization` or `Cookie` headers.
3. **Verify State Mutation:** Check if server returns 200/201 and persists changes.

### C. Arbitrary CORS Reflection - CWE-346
1. **Origin Reflection:** Send `Origin: https://attacker-origin.example.com`.
2. **Examine Headers:**
   - Check if `Access-Control-Allow-Origin` reflects `https://attacker-origin.example.com`.
   - Check if `Access-Control-Allow-Credentials: true` is enabled.
3. **Exploit Impact:** Any malicious website visited by an authenticated user can read private API data via `fetch(..., { credentials: 'include' })`.

### D. LLM & Agentic Prompt Security - CWE-20
1. **Instruction Boundary Isolation:** Test whether user input strings can escape delimiters to override system directives.
2. **Secret Leakage:** Ensure system prompts do not contain raw secrets, tokens, or private instructions that can be coaxed via jailbreaks.
