# Repository hygiene inventory

Root historical/reference material is retained deliberately unless provenance and replacement are clear. It is excluded from npm by the package whitelist.

| Path | Classification | Runtime | npm | Action |
| --- | --- | --- | --- | --- |
| `package.json`, `bun.lock`, `tsconfig.json` | canonical | Yes | package metadata | Keep |
| `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `AGENTS.md` | canonical documentation | No | selected public docs | Keep |
| `Fable-work` | historical/reference source material | No | No | Retain until provenance review |
| `Fable-Spark` | historical/reference source material | No | No | Retain until provenance review |
| `System-Prompt` | historical/reference source material | No | No | Retain until provenance review |
| `Fable-Simulator-Code-Assistant` | historical/reference source material | No | No | Retain until provenance review |
| `evals/` | developer evaluation material and holdouts | No | No | Keep outside runtime distribution |
| `eval/` | runtime/lifecycle evaluation material | Yes | Yes | Keep |
| `test/` | developer verification | No | No | Keep outside distribution |
| `docs/superpowers/` | internal implementation plans | No | No | Keep outside distribution |

Moving or deleting historical source material is intentionally deferred because this session did not establish enough provenance to prove it obsolete. Exclusion from runtime and package artifacts removes the immediate context and supply-chain cost without destroying source history.
