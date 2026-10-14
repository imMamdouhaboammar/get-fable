# STRIDE Threat Modeling Matrix & Trust Boundaries

## Purpose
A structured threat modeling matrix based on STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) for evaluating system security boundaries.

## STRIDE Threat Matrix

| Threat Category | Definition | Potential Vulnerability | Mitigation Strategy |
|---|---|---|---|
| **Spoofing** | Impersonating a user or service | Forged JWTs, missing origin verification | Strong cryptographic signatures, OAuth 2.1 PKCE, mTLS |
| **Tampering** | Modifying data in transit or at rest | Parameter tampering, SQL injection | Input validation, parameterized queries, HMAC integrity checks |
| **Repudiation** | Denying an action took place | Missing audit logs, unsigned actions | Immutable audit logs, structured event logging, signed receipts |
| **Information Disclosure** | Exposing confidential data | Verbose stack traces, leaked secrets | Secret masking, sanitized error responses, encrypted storage |
| **Denial of Service** | Degrading system availability | Unbounded query limits, memory leaks | Rate limiting, request size limits, connection timeouts |
| **Elevation of Privilege** | Gaining unauthorized access | Broken object level auth (BOLA/IDOR) | Strict RBAC/ABAC middleware, least-privilege service roles |

## Trust Boundary Review Protocol
Identify every point where untrusted data crosses a boundary:
1. Client -> API Gateway (TLS termination, CORS, rate limits)
2. API Gateway -> Service Layer (JWT authentication, claim validation)
3. Service Layer -> Database / Queue (Parameterized queries, encrypted connections)
