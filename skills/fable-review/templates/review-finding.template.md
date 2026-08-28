# Code Review Finding: [Finding Title]

## Finding Summary
- **Location**: `src/path/to/file.ts:L45-L60`
- **Severity**: [BLOCKING / WARNING / SUGGESTION]
- **Category**: [Correctness / Security / Architecture / Performance]

## Description & Evidence
[Detailed explanation of the issue citing specific line numbers, potential race conditions, or unhandled edge cases]

## Recommended Remediation
```diff
- const token = request.headers['authorization'];
- const user = decodeTokenUnsafe(token);
+ const authHeader = request.headers['authorization'];
+ if (!authHeader || !authHeader.startsWith('Bearer ')) {
+   return response.status(401).json({ error: 'Unauthorized' });
+ }
+ const user = await verifyTokenCryptographically(authHeader.slice(7));
```
