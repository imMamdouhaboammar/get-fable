# Threat Modeling & Security Review Matrix

## Trust Boundary Checklist
1. **Authentication**: Identity validation, session tokens, JWT expiry, MFA gates.
2. **Authorization**: RBAC/ABAC checks, tenant isolation, IDOR prevention.
3. **Input Sanitization**: SQL injection, XSS, Command injection, Path traversal.
4. **Secret Hygiene**: Zero hardcoded API keys, private keys, or passwords.
5. **Transport & Storage**: TLS everywhere, encrypted credentials at rest.
