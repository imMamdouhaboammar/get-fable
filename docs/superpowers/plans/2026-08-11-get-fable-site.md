# get-fable Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a distinctive static editorial website for get-fable without changing the CLI runtime or adding framework dependencies

**Architecture:** Keep the website isolated under `site/` with semantic HTML, one CSS file, one small progressive-enhancement JavaScript file, and a local copy of the existing mascot. Add lightweight static tests that run with the repository's existing Bun test command. Deploy the `site/` directory as the public root

**Tech Stack:** HTML5, modern CSS, vanilla JavaScript, Bun test, static hosting

## Global Constraints

- Preserve the repository's existing CLI behavior and package dependencies
- Use true white, near-black, neutral grays, and the existing mascot mint `#5BBF9B`
- No gradients, glassmorphism, neon, glow, abstract blobs, fake metrics, fake dashboards, stock imagery, AI robots, decorative pills, or repetitive card grids
- Do not claim model-weight changes or equivalence with frontier models
- Use only commands and compatibility claims already supported by the README and implementation
- Support keyboard focus, reduced motion, semantic landmarks, and 320px-wide mobile layouts without horizontal overflow

---

### Task 1: Build the semantic landing-page structure

**Files:**
- Create: `site/index.html`
- Test: `site/site.test.ts`

**Interfaces:**
- Consumes: existing repository copy, license paths, third-party notice path, GitHub repository URL
- Produces: stable section IDs used by navigation, CSS, and progressive enhancement

- [ ] **Step 1: Write structural tests**

Create tests that assert the page contains the approved hero headline, required section IDs, GitHub CTA, quick-start commands, independent-project disclaimer, stylesheet/script references, and no unsupported frontier-equivalence language

- [ ] **Step 2: Run the test and confirm it fails before the page exists**

Run `bun test site/site.test.ts`

Expected result: failing read/assertion because `site/index.html` does not exist yet

- [ ] **Step 3: Implement semantic HTML**

Create landmarks for header, main, individual content sections, and footer. Use the approved section order and exact supported CLI commands. Keep interactive controls code-native and accessible

- [ ] **Step 4: Run structural tests**

Run `bun test site/site.test.ts`

Expected result: all structural tests pass

### Task 2: Implement the editorial visual system and responsive layout

**Files:**
- Create: `site/styles.css`
- Modify: `site/site.test.ts`

**Interfaces:**
- Consumes: class names and section IDs from `site/index.html`
- Produces: desktop, tablet, and mobile visual treatment with shared tokens

- [ ] **Step 1: Add CSS contract tests**

Assert the stylesheet includes the mint token `#5BBF9B`, reduced-motion media query, mobile breakpoint, focus-visible treatment, fluid hero typography with `clamp()`, and no `linear-gradient`, `radial-gradient`, `backdrop-filter`, or glow-style box shadows

- [ ] **Step 2: Run tests and confirm the new CSS assertions fail**

Run `bun test site/site.test.ts`

Expected result: CSS-specific assertions fail before `site/styles.css` exists

- [ ] **Step 3: Implement tokens and page layout**

Create the white editorial shell, sticky minimal header, oversized hero typography, run-trace composition, black thesis section, open two-column comparison, numbered discipline list, responsive workflow rail, terminal block, boundary section, and final CTA. Use rules and whitespace instead of card framing

- [ ] **Step 4: Implement responsive and accessibility states**

Add breakpoints for tablet and mobile, keyboard focus, high-contrast link states, safe wrapping for code blocks, and reduced-motion fallbacks

- [ ] **Step 5: Run CSS contract tests**

Run `bun test site/site.test.ts`

Expected result: all CSS contract tests pass

### Task 3: Add progressive enhancement

**Files:**
- Create: `site/script.js`
- Modify: `site/site.test.ts`

**Interfaces:**
- Consumes: `[data-copy]`, `[data-copy-status]`, `[data-reveal]`, `[data-trace-step]`, and `[data-year]` hooks from the HTML
- Produces: clipboard feedback, reveal activation, current year, and a lightweight run-trace progression

- [ ] **Step 1: Add script contract tests**

Assert the script checks for `prefers-reduced-motion`, uses the Clipboard API with a fallback-safe failure path, writes an accessible copy-status message, updates the year, and never blocks core page navigation when JavaScript is unavailable

- [ ] **Step 2: Run tests and confirm script assertions fail**

Run `bun test site/site.test.ts`

Expected result: JavaScript-specific assertions fail before `site/script.js` exists

- [ ] **Step 3: Implement progressive enhancement**

Keep behavior small and dependency-free. Copy the quick-start block when requested, update status text to `Copied`, activate reveal classes through IntersectionObserver when motion is allowed, and cycle the run-trace active state only when reduced motion is not requested

- [ ] **Step 4: Run tests**

Run `bun test site/site.test.ts`

Expected result: all site tests pass

### Task 4: Add the site-local mascot asset and deployment configuration

**Files:**
- Create: `site/assets/mascot.svg`
- Create: `vercel.json`
- Modify: `site/site.test.ts`

**Interfaces:**
- Consumes: existing `assets/mascot.svg`
- Produces: self-contained static deployment with `site/` as the output root

- [ ] **Step 1: Add asset/deployment assertions**

Assert the mascot exists locally under `site/assets/`, the HTML references the local asset, and `vercel.json` declares the static `site` output without a build framework

- [ ] **Step 2: Copy the existing mascot exactly**

Use the current repository mascot unchanged so the website and README share the same brand mark

- [ ] **Step 3: Add static Vercel configuration**

Configure Vercel to publish `site/` directly with clean static routing and no application build dependency

- [ ] **Step 4: Run the complete repository test command**

Run `bun test`

Expected result: existing tests and new website tests pass

### Task 5: Browser and production verification

**Files:**
- No product source changes unless QA reveals a defect

**Interfaces:**
- Consumes: deployed website
- Produces: verified production URL and QA evidence

- [ ] **Step 1: Deploy the committed site**

Deploy the repository with `site/` as the public output directory

- [ ] **Step 2: Verify HTTP and asset loading**

Check the production page, stylesheet, JavaScript, mascot, GitHub CTA, license link, and third-party notice link

- [ ] **Step 3: Verify desktop and mobile rendering**

Inspect desktop and mobile-sized layouts for typography, spacing, overflow, section order, code wrapping, and CTA usability

- [ ] **Step 4: Verify interactions**

Confirm navigation anchors, copy control, reduced-motion behavior, and external links remain usable

- [ ] **Step 5: Final trust audit**

Confirm the live page contains no model-equivalence claim, fake metric, fake customer proof, unsupported compatibility statement, or unreviewed legal/provenance claim
