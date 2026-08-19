# Example: Inspecting an Unfamiliar Monorepo

## Task
Understand how user authentication tokens are signed and verified across microservices.

## Steps
1. Locate auth entry points (`find . -name "*auth*" -o -name "*jwt*"`).
2. Trace token issuance function (`src/auth/token-service.ts#signToken`).
3. Verify algorithm and secret handling (`RS256` using private key in vault).
4. Record finding: "[measured] Auth uses RS256 with key rotation in `src/auth/keys.ts`."
5. Hand off to `fable-plan` with bounded facts.
