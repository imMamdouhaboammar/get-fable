# RedTeam Audit Walkthrough

1. **Scope Configuration:**
   Define allowed hosts in `.fable/redteam.json`.
2. **Execute Scan:**
   Run `get-fable redteam --target http://localhost:3000 --profile api-logic --token "Bearer test"`.
3. **Review Report:**
   Inspect `docs/security/REDTEAM_REPORT.md` for findings.
4. **Remediate:**
   Use generated work cards in `$fable-plan` and `$fable-tdd` to implement and verify fixes.
