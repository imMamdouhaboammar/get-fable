import { colors } from '../utils.js';
import { getPackageVersion } from '../cli.js';

export interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  content: string;
}

export const HELP_TOPICS: Record<string, HelpTopic> = {
  lifecycle: {
    id: 'lifecycle',
    title: 'Fable 8-Phase Lifecycle',
    summary: 'The deterministic software development lifecycle enforced by get-fable.',
    content: `
${colors.bright}${colors.cyan}FABLE 8-PHASE LIFECYCLE${colors.reset}
--------------------------------------------------
1. ${colors.green}idle${colors.reset}        - Project waiting for task assignment.
2. ${colors.yellow}discovering${colors.reset} - Grounding assumptions in source code and tracing execution paths.
3. ${colors.cyan}planned${colors.reset}     - Architecture designed, spec defined, task decomposed into cards.
4. ${colors.blue}executing${colors.reset}   - Bounded coding within accepted card scope.
5. ${colors.magenta}verifying${colors.reset}   - Collecting machine-checked test, build, and runtime evidence.
6. ${colors.red}recovering${colors.reset}  - Active anti-loop recovery and root-cause failure diagnosis.
7. ${colors.green}complete${colors.reset}    - All required gates passed, evidence generation matches mutation generation.
8. ${colors.yellow}blocked${colors.reset}     - Missing external dependencies or blocked on human approval.

${colors.bright}Invariant:${colors.reset} Every code mutation increases mutationGeneration. Verification must run
after the final mutation to bring verifiedGeneration up to mutationGeneration.
`,
  },

  skills: {
    id: 'skills',
    title: '25 Canonical Specialist Skills',
    summary: 'Role-specific coding skills with strict inputs, outputs, and gates.',
    content: `
${colors.bright}${colors.cyan}25 CANONICAL SPECIALIST SKILLS${colors.reset}
--------------------------------------------------
${colors.yellow}Core Pack:${colors.reset}
  - get-fable       : Universal front-door router and orchestrator
  - fable-discover  : Source code grounding and symbol tracing
  - fable-plan      : Architecture, migration plans, and task decomposition
  - fable-execute   : Focused implementation within accepted card bounds
  - fable-verify    : Machine-checked test, build, and runtime evidence
  - fable-recover   : Deterministic failure diagnosis and loop recovery

${colors.yellow}Intelligence Pack:${colors.reset}
  - fable-research  : Primary source and official documentation lookup

${colors.cyan}Build Pack:${colors.reset}
  - fable-tdd       : Test-driven development with red-green validation
  - fable-delegate  : Bounded parallel work delegation across subagents

${colors.magenta}Proof Pack:${colors.reset}
  - fable-review    : Independent diff and correctness review
  - fable-security  : Security boundary review and vulnerability checks

${colors.green}Delivery Pack:${colors.reset}
  - fable-release   : Release verification, semver, and packaging checks
  - fable-handoff   : Session context preservation and structured handoffs

${colors.green}Evolution Pack:${colors.reset}
  - fable-eval      : Holdout evaluation and benchmark scoring

${colors.blue}System Pack:${colors.reset}
  - fable-dataviz   : Accessible data visualizations and charts
  - fable-artifact  : Structured technical proposals and diagrams
  - fable-simplify  : Code quality cleanup and altitude refactoring
  - fable-loop      : Bounded recurring execution and polling loops
  - fable-run       : Live runtime process execution and smoke testing
  - fable-memory    : Persistent file-based memory and preference index
  - fable-config    : Agent harness configuration and permissions
  - fable-simulator : Independent oracle verification and simulation
  - fable-cowork    : Autonomous cowork execution and silent tool chaining
  - fable-spark     : Situational awareness and atomic next-move prediction

${colors.red}Creator Pack:${colors.reset}
  - skill-creator   : Author, refine, benchmark, and package skills
`,
  },

  spark: {
    id: 'spark',
    title: 'Fable Spark Situational Awareness',
    summary: 'Predicts the single most natural atomic next move after any step.',
    content: `
${colors.bright}${colors.cyan}FABLE SPARK SITUATIONAL AWARENESS${colors.reset}
--------------------------------------------------
Fable Spark evaluates 6 real-time signals:
  1. User Intent (explicit user request text)
  2. Active Card (.fable/state.json activeCard)
  3. Current Skill (currently active specialist skill)
  4. Missing Gates (missing proof or build gates)
  5. Mutation Delta (mutationGeneration > verifiedGeneration)
  6. Failure Streak (consecutive test/build failures)

${colors.bright}Usage:${colors.reset}
  $ get-fable spark
  $ get-fable spark --json
  $ get-fable spark "fix the failing test"
`,
  },

  evidence: {
    id: 'evidence',
    title: 'Evidence Kinds & Gates',
    summary: 'Machine-checked proof required before marking tasks complete.',
    content: `
${colors.bright}${colors.cyan}TYPED EVIDENCE KINDS${colors.reset}
--------------------------------------------------
  - test        : Unit, integration, or end-to-end test execution logs
  - build       : Compiler, bundler, or typecheck output
  - runtime     : Application runtime startup and smoke check
  - review      : Independent code review observations
  - observation : Grounded source code findings
  - security    : Vulnerability scan and secret exposure checks
  - research    : Primary source documentation lookup
  - receipt     : Git commit, deployment, or release receipt
  - handoff     : Session handoff artifact

${colors.bright}Recording Evidence:${colors.reset}
  $ get-fable evidence pass test "bun test" "132 tests passed"
  $ get-fable evidence fail build "tsc" "TS2322 in src/core/state.ts"
`,
  },

  platforms: {
    id: 'platforms',
    title: 'Supported AI Platforms & Integrations',
    summary: 'How get-fable integrates across 30 AI platforms and coding agents.',
    content: `
${colors.bright}${colors.cyan}SUPPORTED AI PLATFORMS (30 AGENTS & TOOLS)${colors.reset}
--------------------------------------------------
${colors.yellow}Proprietary & Commercial Markets:${colors.reset}
1. Claude Code         : ~/.claude/settings.json, CLAUDE.md, and 6 lifecycle hooks
2. Google Antigravity  : ~/.gemini/config/hooks.json, rules, and plugins
3. OpenAI Codex        : ~/.codex/rules/, skills/, and .codex-plugin/plugin.json
4. Cursor IDE          : ~/.cursor/rules/ and .cursor/rules/fable-lifecycle.mdc
5. GitHub Copilot      : ~/.copilot/rules/fable.md and .github/copilot-instructions.md
6. Devin               : ~/.devin/instructions.md, rules/, and skills/
7. Windsurf (Codeium)  : ~/.codeium/windsurf/rules.md and .windsurfrules
8. Replit Agent        : ~/.replit/rules/fable.md and .replit.md
9. Amazon Q Dev        : ~/.aws/amazon-q/rules/fable.md and .amazonq/rules.md
10. Trae (ByteDance)   : ~/.trae/rules/fable.md and .trae/rules/fable.md
11. Warp AI            : ~/.warp/rules/fable.md
12. Grok Build (xAI)   : ~/.grok/rules/, skills/, hooks.json, and plugins
13. Moonshot Kimi      : ~/.kimi/rules/fable.md
14. Atlarix            : ~/.atlarix/rules/fable.md
15. Vellum             : ~/.vellum/rules/fable.md
16. Codegen            : ~/.codegen/rules/fable.md
17. Muse Code          : ~/.muse/rules/fable.md
18. JetBrains Junie    : ~/.junie/rules/fable.md and .junie/rules/fable.md
19. Qodo               : ~/.qodo/rules/fable.md and .qodo/rules/fable.md
20. Roo Code           : ~/.roo/rules/fable.md, skills/, and .roomodes

${colors.cyan}Open-Source & Community Markets:${colors.reset}
21. Aider              : ~/.aider/rules/fable.md and .aider.prompt.md
22. Cline              : ~/.cline/rules/fable.md, skills/, and .clinerules
23. OpenHands          : ~/.openhands/microagents/, skills/, and rules/
24. OpenCode           : ~/.opencode/rules/ and canonical skills/
25. Continue           : ~/.continue/rules/fable.md and .continue/rules/fable.md
26. Kilo Code          : ~/.kilo/rules/fable.md, skills/, and .kilo/rules/fable.md
27. Plandex            : ~/.plandex/rules/fable.md and .plandex/context.md
28. AutoGPT            : ~/.autogpt/rules/fable.md
29. Hermes Agent       : ~/.hermes/rules/fable.md and skills/
30. Kiro               : ~/.kiro/rules/ and Python lifecycle hooks
`,
  },

  hooks: {
    id: 'hooks',
    title: 'Git & Lifecycle Hooks',
    summary: 'Automatic mutation tracking and quality enforcement.',
    content: `
${colors.bright}${colors.cyan}GIT & LIFECYCLE HOOKS${colors.reset}
--------------------------------------------------
${colors.yellow}Universal Git Hooks (.git/hooks/):${colors.reset}
  - pre-commit   : Runs get-fable lint to prevent unverified commits
  - post-commit  : Increments mutation generation in .fable/state.json
  - post-checkout: Emits real-time Fable Spark hint upon branch switch
  - pre-push     : Verifies all quality gates before pushing to remote

${colors.yellow}Install Git Hooks:${colors.reset}
  $ get-fable install git-hooks
`,
  },

  commands: {
    id: 'commands',
    title: 'Complete CLI Command Reference',
    summary: 'All get-fable commands, flags, and options.',
    content: `
${colors.bright}${colors.cyan}COMMAND REFERENCE${colors.reset}
--------------------------------------------------
  get-fable init                  Initialize .fable/ state and project rules
  get-fable route <task> [--apply] Route a task to the right specialist
  get-fable spark [intent]        Predict the atomic next move
  get-fable state <phase>         Transition lifecycle phase
  get-fable mutation [source]     Record a workspace mutation
  get-fable card <name> [--clear] Manage the active work card
  get-fable evidence ...          Record typed evidence
  get-fable doctor [--fix]        Validate and auto-repair installation
  get-fable lint                  Check state, ledger, and evidence consistency
  get-fable update [--check]      Check and perform auto-updates
  get-fable telemetry [status|..] Manage privacy-preserving local telemetry
  get-fable feed [list|search]    Explore and search available skills
  get-fable shell [zsh|bash|fish] Print shell integration script
  get-fable install [target]      Install integrations for platforms
  get-fable help [topic]          Show topic-specific interactive help
`,
  },
};

export function getHelpTopic(topicId?: string): HelpTopic | null {
  if (!topicId) return null;
  const key = topicId.toLowerCase().trim();
  return HELP_TOPICS[key] || null;
}

export function listHelpTopics(): HelpTopic[] {
  return Object.values(HELP_TOPICS);
}

export function renderInteractiveHelp(topicId?: string): string {
  if (topicId) {
    const topic = getHelpTopic(topicId);
    if (topic) return topic.content.trim();
    return `${colors.red}Unknown help topic: "${topicId}".${colors.reset}\nAvailable topics: ${Object.keys(HELP_TOPICS).join(', ')}`;
  }

  const topicsList = Object.values(HELP_TOPICS)
    .map((t) => `  ${colors.yellow}${t.id.padEnd(14)}${colors.reset} ${t.summary}`)
    .join('\n');

  return `
${colors.bright}${colors.cyan}get-fable v${getPackageVersion()}${colors.reset} | Comprehensive Interactive Helper

${colors.bright}USAGE:${colors.reset}
  $ get-fable help <topic>

${colors.bright}AVAILABLE HELP TOPICS:${colors.reset}
${topicsList}

Type ${colors.green}get-fable help <topic>${colors.reset} for detailed guidance on any topic.
`;
}
