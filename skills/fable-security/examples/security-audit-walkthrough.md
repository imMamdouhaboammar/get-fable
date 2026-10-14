# Example: Security Audit on Password Reset Endpoint

## Task
Audit `/api/auth/reset-password` endpoint.

## Steps
1. Verify token entropy: crypto-grade random bytes (min 32 bytes).
2. Verify token storage: hashed (SHA-256) in DB with 15-minute expiration.
3. Verify single-use: token invalidated immediately upon consumption.
4. Record finding: "[measured] Password reset implements secure hashing and single-use expiry."
