# Security Advisory Finding: [Vulnerability Name]

## Advisory Metadata
- **Severity**: [CRITICAL / HIGH / MEDIUM / LOW]
- **CWE / Category**: [e.g. CWE-89: SQL Injection / Broken Access Control]
- **Affected File**: `src/api/routes.ts:L112`

## Vulnerability Description & Exploit Scenario
[Describe how an attacker could exploit the issue, trust boundaries breached, and data impact]

## Mitigated Implementation
```typescript
// Secure parameterized query replacing raw string concatenation
const result = await db.query(
  'SELECT id, email, role FROM users WHERE organization_id = $1 AND id = $2',
  [orgId, userId]
);
```
