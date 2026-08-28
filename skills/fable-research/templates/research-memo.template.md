# Technical Research Memo: [Topic / SDK Name]

## Executive Summary
[Concise synthesis of research findings, version compatibility, and architectural recommendations]

## Primary Source Grounding
| Source | Version Target | Authoritative URL / Reference | Key Finding |
|---|---|---|---|
| Official Docs | v4.2.0 | https://example.com/docs | Method signature changed from `auth.verify()` to `auth.verifyToken()` |
| GitHub Changelog | v4.0.0 | https://github.com/org/repo/releases/tag/v4.0.0 | Deprecated callback API removed in favor of Promises |

## API Contract & Code Example
```typescript
import { createClient } from 'example-sdk';

const client = createClient({
  apiKey: process.env.EXAMPLE_API_KEY,
  apiVersion: '2026-08-01'
});

const response = await client.verifyToken({ token: 'raw_jwt_token' });
```

## Architectural Implications
- Update all call sites in `src/auth/` to use the new `verifyToken()` promise interface.
- Add regression test for token expiration handling.
