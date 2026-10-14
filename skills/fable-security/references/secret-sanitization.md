# Secret Sanitization & Credential Hygiene Protocol

## Purpose
Guidelines for detecting, masking, sanitizing, and preventing credential leaks across codebase files, commit history, logs, and agent artifacts.

## Credential Detection Patterns
Scan for high-entropy tokens, private keys, and vendor credential patterns:
- AWS Access Keys (`AKIA[0-9A-Z]{16}`)
- GitHub Personal Access Tokens (`ghp_[0-9a-zA-Z]{36}`, `github_pat_*`)
- OpenAI / Anthropic API Keys (`sk-ant-*`, `sk-[0-9a-zA-Z]{48}`)
- Stripe Secret Keys (`sk_live_[0-9a-zA-Z]{24}`)
- Private RSA/SSH Keys (`-----BEGIN (RSA|OPENSSH) PRIVATE KEY-----`)
- Database Connection Strings (`postgres://user:pass@host:port/db`)

## Sanitization Protocol
1. **Masking in Logs & Artifacts**: Redact detected keys immediately, displaying only the first 4 and last 4 characters (e.g. `sk-ant-1234...abcd`).
2. **Environment Vault Storage**: Move plaintext secrets into secure local environment vaults or `.env.local` (added to `.gitignore`).
3. **Git History Scrubbing**: If a secret was committed to git history, treat it as compromised. Advise immediate key revocation and rotation, then purge git history using `git filter-repo` or BFG Repo-Cleaner.
