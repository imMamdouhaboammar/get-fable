# Healing Walkthrough: From RedTeam Finding to Closed-Loop Verification

## 1. Offensive Discovery
A redteam scan detects an unauthenticated access vulnerability:
`get-fable redteam scan --target http://localhost:3000` -> `FIND-AUTH-1 (CRITICAL)`

## 2. Dry-Run Remediation Preview
Preview candidate patches and unified diffs:
`get-fable heal --findings .fable/redteam-findings.json --dry-run`

## 3. Atomic Application & Regression Guarding
Apply the patch and emit a continuous regression test suite:
`get-fable heal --findings .fable/redteam-findings.json --auto-apply --generate-tests`

## 4. Verification Probe
Verify the fix eliminates the vulnerability:
`get-fable redteam verify --target http://localhost:3000`
