# Research & Discoveries: DeepSeek Harness & Awesome DSH Plugin

## 1. Awesome DSH Plugin Publishing Rules
- File path in awesome-dsh-plugin: `data/plugins/<owner>__<repo>.yml` -> `data/plugins/imMamdouhaboammar__get-fable.yml`
- Format:
  ```yaml
  url: https://github.com/imMamdouhaboammar/get-fable
  name: imMamdouhaboammar/get-fable
  category: workflow
  description:
    en: Modular frontier execution discipline for DSH: evidence-first routing across 25 skills, Manus-style file planning, verification gates, fail-streak recovery, and an interactive web dashboard.
    zh: DeepSeek Harness 的模块化前沿执行纪律：覆盖 25 项技能的循证路由、Manus 风格持久化文件规划、验证门禁、失败恢复与交互式 Web 看板。
  ```
- Requirements:
  - `package.json` must declare `"dsh": { "bundle": { "patch": "./cordis.patch.yml" }, "client": { "platform": "web" } }`
  - `cordis.patch.yml` must exist at repo root with `insert` rule.
  - Repo must be $\ge 1$ day old with $\ge 10$ commits.
  - Must have `dsh-plugin` GitHub topic.
  - No marketing superlatives; accurate description.

## 2. Cordis / DSH Plugin Architecture
- Kernel: Cordis meta-framework.
- Host Plugin: Exports `name`, `inject`, and `apply(ctx, config)` function or class.
  - Injected services commonly: `webServer` (for Express/Koa HTTP routes), `sessionProjections`, `llm`.
- Web Client: Loaded via `window.__ModuleLoader__.load({ id: "get-fable", factory: (require) => ... })`.
  - Can register sidebar widget, settings/dashboard tabs, or view projections.
  - Uses CSS variables `--dsw-alias-*` for seamless dark/light theme integration.

## 3. Fable Capabilities to Expose in DSH
- Complete Fable Lifecycle Engine (Discovery, Plan, Execute, Verify, Recovery, Release).
- 25 Fable Skills registry & interactive task routing.
- Manus-style File-based planning (`task_plan.md`, `progress.md`, `findings.md`, `.mode`, and SHA-256 attestation).
- Diagnostic Health & Auto-Repair (`Fable Doctor`).
- Live State Dashboard & Sidebar Pill.
