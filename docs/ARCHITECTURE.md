# get-fable: Public architecture overview

get-fable separates the coding model from the engineering process around it. The community edition uses plain-text Skills and public manifests; the separately published CLI handles local project state, host configuration, and optional lifecycle hooks.

## Two installation layers

| Layer | Public interface | What it does |
| --- | --- | --- |
| Community Skills | `npx skills add imMamdouhaboammar/get-fable` | Describes when a specialist should act, what evidence it needs, and when to stop |
| CLI package | `bun add -g get-fable` | Adds project initialization, host integrations, routing, state, checks, and selected hooks |

These layers are complementary, not identical. A Skills-only setup cannot enforce CLI-backed state transitions; a CLI installed without compatible host integration cannot promise automatic hooks in that host.

## Public Skill graph

The on-disk consumer catalog currently contains **41 public Skills in 8 packs**, described in [CANONICAL_SKILLS.md](CANONICAL_SKILLS.md). The lifecycle normally proceeds through repository discovery, current-source research, planning, testable implementation, fresh verification, review, and handoff or release.

The registry includes prerequisite/continuation links and phases to assist routing. Those links express intended workflow decisions, not a guarantee that every model will invoke every Skill.

## Project-local state

The optional CLI can manage files within `.fable/` to preserve work cards, progress, and evidence outside the current chat. Typical concepts include the active lifecycle phase, mutation generation, and whether recorded verification is still current after edits.

The exact schema, supported flags, and hook behavior belong to the installed CLI version. Do not infer them solely from documentation snapshots. Use `get-fable doctor --json-v1` and `get-fable status --json-v1` to inspect the current environment.

## Host integration tiers

There are **32 listed host targets**. Some adapters install Skills or rules; others can also register lifecycle hooks. Host capabilities and security policies determine which integrations are available. See [HOSTS.md](HOSTS.md), then verify the actual installed host rather than assuming feature parity.

## Trust and security boundary

- A Skill is advisory guidance unless a compatible host/runtime actually enforces a gate.
- Hooks and installers may write to project or user configuration; inspect changes and seek consent before replacements.
- No instructions can substitute for application-specific tests, current primary-source research, and independent review.
- Private engine code, internal operations, benchmark oracles, customer material, and unreleased commercial assets are outside this public architecture surface.
- Export and release safety requirements are documented in [PUBLIC_RELEASE_POLICY.md](PUBLIC_RELEASE_POLICY.md).

## Why this matters

The important guarantee is a *checkable process*, not a claim of superior model intelligence. Your agent can investigate a bug, write an acceptance check, make a bounded change, and then explain what evidence does and does not prove. That is a useful improvement even before any specialized runtime integration is added.
