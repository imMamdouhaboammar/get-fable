# Fable Eco Curated Ecosystem Baseline

## 1. Curation principle

The official profile should be small enough that each included capability has a clear role and support burden. The goal is not to collect every interesting agent project. The goal is to provide a coherent stack with limited overlap, predictable installation, and runtime contracts that Fable can reason about

Status in this document means proposed Eco support status, not a claim about upstream quality

## 2. Stable launch candidates

### `imMamdouhaboammar/agent-kernel`

Role: governance and durable agent context foundation
Proposed status: stable after adapter qualification
Why: directly aligned with the user's Fable ecosystem and can provide governance primitives without introducing a peer router

### `obra/superpowers`

Role: engineering methodology and workflow skills
Proposed status: stable skill provider
Activation: selected workflows only, not entire skill set injected into every task

### `amElnagdy/guard-skills`

Role: quality and post-change guard skills
Proposed status: stable after mapping guards to Fable proof stages

### `DietrichGebert/ponytail`

Role: simplicity and anti-overengineering review
Proposed status: stable advisory capability

### `colbymchenry/codegraph`

Role: primary local code intelligence provider
Proposed status: stable primary provider after platform/install qualification
Conflict policy: primary-provider conflict with alternate code graph providers

### `vercel-labs/agent-browser`

Role: primary deterministic browser interaction provider
Proposed status: stable where platform prerequisites pass

### `pbakaus/impeccable`

Role: primary frontend quality and UI review skill provider
Proposed status: stable skill provider
Conflict policy: context-overlap with alternative broad design taste packs

### `rtk-ai/rtk`

Role: shell, test, and Git output compaction
Proposed status: stable with host-specific enforcement grade
Important: package identity must be explicit because generic package names can collide

### `microsoft/markitdown`

Role: document ingestion and normalization
Proposed status: stable optional dependency for document-heavy work

### `kunchenguid/no-mistakes`

Role: delivery or quality enforcement
Proposed status: stable opt-in after exact overlap with existing Fable gates is mapped. It must not become a second completion authority

## 3. Optional specialized candidates

### `usestrix/strix`
Role: authorized security testing
Status: optional security profile only
Requirement: explicit security scope and active-testing permission

### `browser-use/browser-use`
Role: autonomous browser agent for tasks beyond deterministic browser primitives
Status: optional
Routing preference: use deterministic browser provider first when sufficient

### `Panniantong/Agent-Reach`
Role: external research/reach capability
Status: optional research profile

### `garrytan/gbrain`
Role: memory or cross-agent knowledge support
Status: optional until ownership and state interaction with `fable-memory` is proven

### `reviewdog/reviewdog`
Role: CI/review diagnostics
Status: optional delivery profile

### `tirth8205/code-review-graph`
Role: review-specific dependency/impact analysis
Status: optional code-review profile
Conflict: context-overlap with primary code graph provider, not necessarily hard install conflict

### `nextlevelbuilder/ui-ux-pro-max-skill`
Role: additional searchable UI/UX guidance data
Status: optional frontend profile
Conflict: context-overlap with Impeccable, so runtime selects one primary guidance source per step unless playbook explicitly combines them

### `D4Vinci/Scrapling`
Role: web extraction
Status: optional research profile due heavier runtime footprint

### `headroomlabs-ai/headroom`
Role: context compaction
Status: experimental until measurable benefit and host safety are demonstrated

### `JuliusBrussee/caveman`
Role: compact context/communication style
Status: experimental until output contracts and overlap are clear

## 4. Compatibility or selective-import candidates

### `garrytan/gstack`
Use selected specialist workflows where they fill a gap. Do not install the entire workflow collection as an independent lifecycle controller by default

### `mattpocock/skills`
Import qualified individual skills, not necessarily the full repository as one capability

### `EveryInc/compound-engineering-plugin`
Treat as a source of selected learning/engineering workflows. Avoid duplicating `fable-learning` and Fable lifecycle ownership

### `imMamdouhaboammar/delegate-team`
Treat as delegated execution provider. Fable remains decomposition and routing authority

### `open-gsd/gsd-core`
Compatibility only because it overlaps lifecycle orchestration

### `affaan-m/ECC`
Compatibility only until overlapping engineering control behavior is isolated

## 5. Not default candidates due overlap or unclear marginal value

- `Graphify-Labs/graphify`: alternate graph provider; qualify only if it provides a material feature not covered by selected primary
- `Egonex-AI/Understand-Anything`: broad understanding graph overlaps code intelligence role
- `Nutlope/hallmark`: frontend/design overlap with Impeccable
- `Leonxlnx/taste-skill`: frontend taste overlap with Impeccable
- `tw93/Waza`: engineering workflow overlap with Superpowers, Ponytail, and guard skills
- `multica-ai/andrej-karpathy-skills`: selected principles can be imported, but default full pack adds context overlap
- `OthmanAdi/planning-with-files`: get-fable already owns durable planning/state concepts; compatibility may be useful but not default
- `msitarzewski/agency-agents`: persona catalog is not required for core Eco provisioning
- `lsdefine/GenericAgent`: alternative agent runtime, not a default capability
- `blader/humanizer`: optional writing profile only, not engineering core
- `toon-format/toon`: get-fable already carries TOON as a dependency, so Eco should not duplicate it as an external install unless upstream architecture changes
- `ayghri/i-have-adhd`: keep outside core until a concrete engineering capability contract and user benefit are defined

## 6. Proposed profiles

### Core
- agent-kernel
- superpowers
- guard-skills
- ponytail
- codegraph
- rtk

### Frontend
Core plus:
- impeccable
- agent-browser
- ui-ux-pro-max optional

### Research
Core plus:
- Agent-Reach
- MarkItDown
- Scrapling optional
- browser-use optional

### Security
Core plus:
- Strix
- reviewdog optional

### Full Curated
Union of stable plus optional items that are compatible on current machine. Experimental items remain excluded unless `--experimental` is set

## 7. Admission checklist for any official capability

A candidate does not enter stable catalog until all answers are yes:
- source identity is unambiguous
- license can be recorded
- stable version strategy exists
- install driver can be expressed without arbitrary shell script
- supported platform matrix is known
- uninstall ownership can be proven
- health check is deterministic enough for automation
- runtime role is distinct
- permissions are declared
- conflict/overlap behavior is declared
- host exposure mode is known
- adapter contract tests exist
- failure and fallback behavior are known
- no secret persistence is required
