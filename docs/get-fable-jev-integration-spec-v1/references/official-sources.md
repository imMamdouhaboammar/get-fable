# Official sources checked

Checked 2026-09-18.

## TypeSafe

- Introduction / Jev announcement: https://typesafe.ai/blog/introducing-system-one-models-and-jev
- Quick start: https://docs.typesafe.ai/introduction/quickstart
- Models: https://docs.typesafe.ai/models
- Choice: https://docs.typesafe.ai/primitives/choice
- Noul: https://docs.typesafe.ai/primitives/noul
- Score: https://docs.typesafe.ai/primitives/score
- Confidence: https://docs.typesafe.ai/confidence
- How to build: https://docs.typesafe.ai/concepts/how-to-build-with-system-one
- Intent routing: https://docs.typesafe.ai/patterns/intent-routing
- Confidence routing: https://docs.typesafe.ai/patterns/confidence-routing
- Speculative fan-out: https://docs.typesafe.ai/patterns/fan-out
- Jev 1.13 jaggedness: https://docs.typesafe.ai/model-jaggedness/jev-1.13
- JavaScript SDK: https://docs.typesafe.ai/sdk/javascript
- Skill suggestion cookbook: https://docs.typesafe.ai/cookbooks/skill_suggestion
- Legal: https://docs.typesafe.ai/legal
- Official JS SDK repository: https://github.com/typesafe-ai/typesafe-sdk-js

## get-fable

Repository: https://github.com/imMamdouhaboammar/get-fable

Baseline commit:

`8446e33378ca7c55313fe8e08f57de9e353519ce`

Key files reviewed:

- `package.json`
- `docs/ARCHITECTURE.md`
- `docs/CANONICAL_SKILLS.md`
- `src/core/task-router.ts`
- `src/core/types.ts`
- `src/core/state.ts`
- `src/core/eval-runner.ts`
- `src/dsh/api.ts`
- `test/eval.test.ts`
- `test/rust-parity.test.ts`
- `crates/fable-core/src/router/mod.rs`
- `crates/fable-core/src/types.rs`
- `eval/benchmarks/routing-v1.json`
- `eval/scenarios/lifecycle-v2.json`
