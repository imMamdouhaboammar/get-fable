# Task Plan: DeepSeek Harness (DSH) Plugin & Consumed UI for get-fable

## Goal
Transform `get-fable` into a fully compatible, installable DeepSeek Harness (DSH) Plugin with Cordis bundle manifests, backend REST service, and a consumed React/Preact Web UI client, and prepare the publication metadata for `awesome-dsh-plugin`.

## Current Phase
Phase 5: Awesome-DSH-Plugin Publication Spec & Documentation (Complete)

## Phases

### Phase 1: DSH Bundle & Manifest Configuration
- [x] Create `cordis.patch.yml` at repository root with `insert` entry for `get-fable`.
- [x] Update `package.json` with `dsh.bundle`, `dsh.client`, keywords, and exports (`.`, `./client`, `./package.json`).
- [x] Configure `tsconfig.json` to build both Host and Web Client bundles.
- Status: complete

### Phase 2: DSH Backend Plugin & Service Architecture
- [x] Implement `src/dsh/types.ts` defining Cordis context, services (`webServer`, `sessionProjections`, `llm`), and config schemas.
- [x] Implement `src/dsh/api.ts` exposing REST routes:
  - `GET /api/fable/status` (current phase, work card, fail streak, state health)
  - `GET /api/fable/plan` (reads `task_plan.md`, `progress.md`, `findings.md`, `.mode`, and attestation)
  - `GET /api/fable/skills` (returns complete registry of 25 Fable skills and metadata)
  - `POST /api/fable/route` (runs Fable task router on input task/prompt)
  - `POST /api/fable/doctor` (runs diagnostic check and auto-repair)
- [x] Implement `src/dsh/index.ts` as the Cordis host plugin entrypoint that binds services and lifecycle hooks.
- Status: complete

### Phase 3: Consumed UI Development (DSH Web Client)
- [x] Implement DSH Web UI styling in `src/dsh/client/styles.ts` matching DSH theme variables (`--dsw-alias-*`).
- [x] Build React/JSX components:
  - `FableWidget`: Sidebar status indicator, phase badge, fail-streak alert, quick-fix button.
  - `FableDashboard`: Full dashboard tab for DSH settings / tab surface.
  - `PlanViewer`: Manus-style live markdown / structured phase viewer for `task_plan.md` and attestation.
  - `SkillGraph`: Visual interactive explorer of the 25 Fable skills and their neural links.
  - `TaskRouterTester`: Interactive task testing sandbox.
- [x] Bundle into `src/dsh/client/index.tsx` registered via `window.__ModuleLoader__.load({ id: "get-fable", factory: ... })`.
- Status: complete

### Phase 4: Build, Typecheck & Verification
- [x] Add build scripts in `package.json` to build `dist/index.js` and `dist/client.js` with Bun.
- [x] Write automated tests in `test/dsh-plugin.test.ts` to verify Cordis plugin registration, REST endpoints, and schema conformity.
- [x] Run `bun run check` (typecheck, 68 tests, build) to verify everything compiles cleanly.
- Status: complete

### Phase 5: Awesome-DSH-Plugin Publication Spec & Documentation
- [x] Create `data/plugins/imMamdouhaboammar__get-fable.yml` matching awesome-dsh-plugin schema.
- [x] Update `README.md` and `docs/dsh-plugin.md` with installation and usage instructions for DSH users.
- [x] Update `installer.ts` and `cli.ts` so `get-fable install-dsh` configures DSH targets (`~/.dsh/cordis.patch.yml`).
- Status: complete

## Next Step
Work is fully implemented, verified, and ready for publication and PR submission.
