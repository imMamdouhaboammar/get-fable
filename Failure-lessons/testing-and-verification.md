# Testing Strategies, Regression Mappings, and Verification Oracles

> A regression test must reproduce the original failure mode.
> If a test passes while the bug is present, it protects nothing.

---

## 1. Failure-to-Regression Test Mapping

| Failure Class | Regression Test File / Identifier | Protected Invariant | Oracle Type |
|---|---|---|---|
| Workspace Staging & Packaging Boundary | `test/doctor-evidence.test.ts` / `checkPluginSkillsRoot` | Direct `skills/` children must contain `SKILL.md` and valid package manifests | Structural Diagnostic & AST |
| AST Heading Parser Invariant Drift | `test/fable-lint.test.ts` / `fable-lint.ts` | Deep Playbook headings must match standard H2 tokens without inline subtitles | Lexical Regex Matcher |


---

## 2. Real Regression Verification Protocol (The 3-Step Challenge)

1. **Fixed Implementation**: Test passes (exit 0)
2. **Reverted Defect**: Test FAILS (exit != 0)
3. **Restored Fix**: Test passes (exit 0)
