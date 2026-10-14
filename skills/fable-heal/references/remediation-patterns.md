# Security Remediation Patterns

## 1. SQL Injection (CWE-89)
- Replace string concatenations and template literals in database queries with parameterized placeholders ($1, $2 or ?).
- Ensure input types are strictly coerced and validated before passing to query drivers.

## 2. Broken Object Level Authorization (IDOR / BOLA, CWE-639)
- Verify tenant or user ownership before querying, mutating, or returning domain records.
- Enforce multi-tenant scoping at the query layer (e.g. `WHERE id = $1 AND tenant_id = $2`).

## 3. CORS Misconfiguration (CWE-942)
- Replace wildcard `Access-Control-Allow-Origin: *` with explicit whitelist origin checks.
- Reject requests with unrecognized or untrusted origins.

## 4. Missing Security Headers (CWE-1021)
- Configure strict Content-Security-Policy, X-Content-Type-Options (nosniff), X-Frame-Options (DENY), and HSTS.

## 5. Sensitive File Exposure (CWE-200)
- Guard against direct access to `.env`, `.git`, secret configs, and private keys via routing denial middleware.

## 6. Server-Side Request Forgery (SSRF, CWE-918)
- Validate and restrict outbound request URLs against loopback (127.0.0.1), link-local, and cloud metadata (169.254.169.254).
