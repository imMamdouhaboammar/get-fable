# get-fable Website Design Spec

## Goal

Create a modern static product site for `get-fable` that explains the frontier-style execution thesis clearly, feels distinct from generic AI SaaS landing pages, and can be deployed without changing the CLI runtime or adding application dependencies

## Creative direction

Use an editorial research-lab aesthetic built from true white, near-black, neutral grays, and the existing mascot mint `#5BBF9B`

The page should feel like a strong technical publication crossed with a product launch, not a dashboard or AI-template landing page

Avoid gradients, glassmorphism, neon, glow, abstract blobs, fake metrics, fake dashboards, repetitive card grids, stock imagery, AI robots, generic orbit graphics, decorative pills, and excessive shadows

Use the existing rabbit mascot as a restrained brand character, not as a large decorative illustration repeated through the page

## Information architecture

One responsive long-form landing page with these sections in order

1. Header
2. Hero
3. The question behind get-fable
4. Ordinary run versus disciplined run
5. Six execution disciplines
6. How a run changes
7. Quick start / terminal block
8. Compatibility and boundaries
9. Open-source / provenance note
10. Final CTA and footer

## Hero

Primary headline

> Your model is capable of more than the way you run it

Supporting copy

> get-fable adds frontier-style execution discipline around AI coding agents with specs, persistent task state, lifecycle hooks, reusable skills, failure handling, and verification

Primary action

> View on GitHub

Secondary action

> Read the thesis

Hero proof line

> The weights stay the same. The working conditions do not

The first viewport should pair the headline with a code-native run trace showing the progression from prompt to spec to ledger to hooks to evidence

## Product thesis

The page should explain that raw model capability matters, but the working environment around the model also changes reliability on long-running agent work

The site must never claim that get-fable changes model weights, reproduces a proprietary model, or makes a smaller model equivalent to Claude Fable 5, Claude Mythos 5, GPT-5.6 Sol, or another frontier model

References to those models are descriptive examples only

## Comparison section

Show two open editorial columns rather than cards

### Ordinary run

- Vague instruction
- Context drifts across turns
- Repeated failures trigger more retries
- Completion is declared when output looks finished

### With get-fable

- Spec before implementation
- Task state persists outside chat
- Repeated failures change the response strategy
- Completion requires observable evidence

## Six execution disciplines

Use a numbered vertical editorial list with one sticky section heading on large screens

1. Plan before implementation
2. Keep task state outside the chat
3. Carry working rules across turns
4. React differently when failures repeat
5. Reuse skills and agent instructions
6. Require evidence before completion

## Workflow strip

Represent the lifecycle as a horizontal sequence on desktop and a vertical sequence on mobile

Prompt → Spec → Ledger → Hooks → Work → Verify

Use thin rules, typography, and state changes instead of rounded cards or icon tiles

## Quick start

Use only commands currently documented in the README

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable
bun ./bin/get-fable.js status
bun ./bin/get-fable.js assets
bun ./bin/get-fable.js install
```

Include a working copy button implemented with a small progressive-enhancement script

## Compatibility and boundaries

State that automatic configuration currently exists for Claude Code, the repository's Antigravity / Gemini config target, and Agent Kernel when present

State that the request proxy is a development utility and not a hardened public gateway

Do not imply universal provider or IDE compatibility

## Open-source note

Link to the repository license and `THIRD_PARTY_NOTICES.md`

State clearly that get-fable is an independent community project and is not affiliated with or endorsed by referenced model vendors or upstream projects

## Visual system

- Background: `#FFFFFF`
- Primary text: near-black around `#0B0D0C`
- Secondary text: neutral gray around `#626A66`
- Rules: light neutral gray around `#D9DEDB`
- Accent: existing mascot mint `#5BBF9B`
- Dark section: near-black with white and mint text
- Typography: system sans for editorial display and body, system monospace for code and small technical labels
- Radius: minimal, generally 0 to 12px only where functional
- Shadows: none by default
- Content width: approximately 1180 to 1240px
- Large hero type: responsive `clamp()` scale with strong line breaks

## Motion

Use subtle entrance reveals, a small run-trace progression, and clear hover/focus states

All non-essential motion must stop under `prefers-reduced-motion: reduce`

No parallax, floating decorative objects, or continuous attention-seeking animation

## Technical architecture

Create a self-contained static site under `site/`

- `site/index.html` owns semantic structure and content
- `site/styles.css` owns tokens, layout, responsive behavior, and motion
- `site/script.js` owns progressive enhancement only: copy interaction, current-year text, reveal activation, and the lightweight run-trace progression
- `site/assets/mascot.svg` is a site-local copy of the existing repository mascot

No framework and no new package dependency

## Accessibility and responsive requirements

- Semantic landmarks and heading order
- Visible keyboard focus
- Minimum practical text contrast
- Buttons and links usable from keyboard
- Copy control announces success without relying on color
- Mobile layout has no horizontal overflow at 320px width
- Reduced-motion support
- Decorative mascot usage uses appropriate alt handling

## Deployment

Prefer a production static deployment that serves the `site/` directory as the public root

The deployment must be checked after publishing for HTTP success, loaded CSS/JS/assets, responsive layout, and functional primary links
