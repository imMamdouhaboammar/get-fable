# Code Review Finding: [Finding Title]

## Finding Summary (Alibaba OCR Schema)
- **Path**: `src/path/to/file.ts`
- **Lines**: `L45-L60` (`start_line: 45`, `end_line: 60`)
- **Severity**: `critical` | `high` | `medium` | `low`
- **Category**: `bug` | `security` | `performance` | `maintainability` | `test` | `style` | `documentation` | `other`

## Description & Failure Scenario
[Detailed explanation of the failure mode citing the exact changed behavior, missing null-safety, concurrency race, or security injection risk]

## Existing Code
```typescript
const token = request.headers['authorization'];
const user = decodeTokenUnsafe(token);
```

## Recommended Remediation (Suggestion Code)
```typescript
const authHeader = request.headers['authorization'];
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return response.status(401).json({ error: 'Unauthorized' });
}
const user = await verifyTokenCryptographically(authHeader.slice(7));
```
