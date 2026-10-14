import { canonicalSkillIds, getSkillEntry, loadSkillRegistry } from '../skill-registry.js';
import type { FableSkillId, FableTaskShape, SkillRegistry } from '../types.js';

export interface JevNoulQuestion {
  type: 'noul';
  instructions: string | object | string[];
  criteria?: {
    true: string;
    false: string;
  };
}

export interface JevChoiceQuestion {
  type: 'choice';
  instructions: string | object | string[];
  criteria: Record<string, string | object | null>;
}

export interface JevScoreQuestion {
  type: 'score';
  instructions: string | object | string[];
  criteria: string[];
}

export type JevQuestion = JevNoulQuestion | JevChoiceQuestion | JevScoreQuestion;

/**
 * Hand-curated semantic boundary contrasts for lookalike skill pairs to prevent false classification.
 */
export const SKILL_BOUNDARY_CONTRASTS: Record<string, { useWhen: string; notWhen: string }> = {
  'get-fable': {
    useWhen: 'Select ONLY when orchestrating top-level lifecycle routing across all 42 Fable skills from idle or ambiguous entry state.',
    notWhen: 'NOT for executing specialized discovery, planning, coding, testing, review, or security subtasks directly.',
  },
  'fable-discover': {
    useWhen: 'Select ONLY when investigating unknown local repository code, runtime execution paths, or project layout.',
    notWhen: 'NOT for looking up external official third-party API documentation or when a card is already bounded.',
  },
  'fable-research': {
    useWhen: 'Select ONLY when checking current official external documentation, library APIs, release notes, or web facts.',
    notWhen: 'NOT for exploring the existing local codebase or executing local test suites.',
  },
  'fable-plan': {
    useWhen: 'Select ONLY when designing multi-step work breakdowns or converting discovery evidence into bounded implementation cards.',
    notWhen: 'NOT for executing a single already-bounded task, immediate quick fixes, or step-one microservices threshold scoring.',
  },
  'fable-tdd': {
    useWhen: 'Select ONLY when writing test-first regression tests for bug fixes or testable runtime behavior changes.',
    notWhen: 'NOT for refactoring with unchanged behavior or non-code documentation changes.',
  },
  'fable-delegate': {
    useWhen: 'Select ONLY when splitting independent work items across parallel subagents with disjoint write, semantic, and verification boundaries.',
    notWhen: 'NOT for single-agent execution or tightly-coupled sequential tasks sharing mutable contracts.',
  },
  'fable-execute': {
    useWhen: 'Select ONLY when implementing a single, well-scoped accepted work card with zero scope drift.',
    notWhen: 'NOT for broad multi-file planning, repeated failures needing diagnosis, or test-first behavior changes.',
  },
  'fable-verify': {
    useWhen: 'Select ONLY when validating implementations with fresh automated tests, builds, typechecks, and machine-checked evidence.',
    notWhen: 'NOT for giving qualitative diff feedback, adversarial fraud hunting, or investigating unknown codebase paths.',
  },
  'fable-review': {
    useWhen: 'Select ONLY when critiquing an existing git diff, pull request, or changed code for concrete failure scenarios and standards compliance.',
    notWhen: 'NOT for verifying completion evidence with automated test runners or writing new feature code.',
  },
  'fable-security': {
    useWhen: 'Select ONLY when auditing authentication, authorization, secrets, trust boundaries, and untrusted input validation.',
    notWhen: 'NOT for offensive penetration testing (fable-redteam) or automated vulnerability patching (fable-heal).',
  },
  'fable-redteam': {
    useWhen: 'Select ONLY when executing offensive penetration testing, CVSS v3.1 scoring, attack graphs, and automated vulnerability probing.',
    notWhen: 'NOT for defensive static code review or applying remediation patches.',
  },
  'fable-heal': {
    useWhen: 'Select ONLY when synthesizing, applying, and verifying security patches for vulnerabilities identified by fable-redteam.',
    notWhen: 'NOT for discovering new vulnerabilities or general non-security bug fixes.',
  },
  'fable-release': {
    useWhen: 'Select ONLY when auditing release readiness, certifying quality gates, publishing packages/binaries, or tagging releases.',
    notWhen: 'NOT for normal feature development, in-progress implementation, or CI conflict triage.',
  },
  'fable-handoff': {
    useWhen: 'Select ONLY when compacting session decisions, generation stamps, and exact next actions into durable cross-session continuation state.',
    notWhen: 'NOT for completing all work within the current session or replacing behavioral verification proof.',
  },
  'fable-eval': {
    useWhen: 'Select ONLY when benchmarking agent prompts, skill descriptions, or routing policies against reproducible baselines and holdout suites.',
    notWhen: 'NOT for normal application feature coding or unit testing product logic.',
  },
  'fable-learning': {
    useWhen: 'Select ONLY when extracting durable engineering lessons, failure postmortems, and reusable playbooks from session transcripts.',
    notWhen: 'NOT for transient scratch notes or routine code implementation.',
  },
  'fable-recover': {
    useWhen: 'Select ONLY when diagnosing repeated command failures (streak >= 2), broken environments, stale caches, or contradictory evidence.',
    notWhen: 'NOT for normal first-attempt task execution or blind retries.',
  },
  'fable-dataviz': {
    useWhen: 'Select ONLY when designing and generating accessible SVG charts, metric cards, heatmaps, and data visualization dashboards.',
    notWhen: 'NOT for backend data pipelines or non-visual architectural diagrams.',
  },
  'fable-artifact': {
    useWhen: 'Select ONLY when authoring structured technical proposals, Mermaid architecture diagrams, and interactive UI components.',
    notWhen: 'NOT for raw data plotting charts (fable-dataviz) or backend service implementation.',
  },
  'fable-simplify': {
    useWhen: 'Select ONLY when refactoring settled code to flatten nesting, remove dead branches, and reduce complexity while preserving behavior.',
    notWhen: 'NOT for fixing bugs, adding new features, or altering observable runtime semantics.',
  },
  'fable-loop': {
    useWhen: 'Select ONLY when executing bounded recurring polling loops, CI build babysitting, or interval-based monitors with explicit budgets and backoff.',
    notWhen: 'NOT for one-shot synchronous command execution or unbounded infinite loops.',
  },
  'fable-run': {
    useWhen: 'Select ONLY when launching live application binaries, web servers, or daemons with readiness probes and clean teardown.',
    notWhen: 'NOT for static unit test suites or offline typechecking.',
  },
  'fable-memory': {
    useWhen: 'Select ONLY when recording, indexing, or recalling persistent cross-session user preferences and constraints in MEMORY.md stores.',
    notWhen: 'NOT for extracting failure postmortems (fable-learning) or ephemeral in-session variables.',
  },
  'fable-config': {
    useWhen: 'Select ONLY when configuring or auditing AI agent harness settings, permissions allowlists, keybindings, and lifecycle hooks.',
    notWhen: 'NOT for application business logic configuration or database schema migrations.',
  },
  'fable-simulator': {
    useWhen: 'Select ONLY when verifying complex code against independent mathematical oracles, derived contracts, or headless browser sandboxes.',
    notWhen: 'NOT for standard unit test assertions or confusing simulation with production deployment proof.',
  },
  'fable-cowork': {
    useWhen: 'Select ONLY when executing long autonomous multi-step cowork sessions with silent tool chaining and strict safety boundaries.',
    notWhen: 'NOT for interactive step-by-step confirmation loops or single-command tasks.',
  },
  'fable-spark': {
    useWhen: 'Select ONLY when predicting the smallest atomic next engineering move from workspace state, mutation delta, and evidence gates.',
    notWhen: 'NOT for generating multi-step macro plans or narrating obvious in-flight actions.',
  },
  'fable-skill-creator': {
    useWhen: 'Select ONLY when authoring, packaging, or optimizing autonomous AI agent skills to the Deep Playbook V2 standard with BinEval.',
    notWhen: 'NOT for generating sector domain adapters (fable-domain) or ordinary application modules.',
  },
  'fable-architecture': {
    useWhen: 'Select ONLY when evaluating project specifications at inception across Scale, Domain Decoupling, and Resource Intensity vectors to enforce microservices and gRPC boundaries.',
    notWhen: 'NOT for routine task breakdown within an already-established module (fable-plan).',
  },
  'fable-eco': {
    useWhen: 'Select ONLY when provisioning curated capabilities, managing reproducible capability locks, or compiling host capability execution contracts.',
    notWhen: 'NOT for editing individual harness settings files (fable-config) or authoring new skills.',
  },
  'fable-context-thrift': {
    useWhen: 'Select ONLY when conserving token budget by eliminating redundant file reads, batching queries, and targeting symbol lookups.',
    notWhen: 'NOT for broad exploratory repository sweeps when codebase structure is completely unknown.',
  },
  'fable-finish-your-turn': {
    useWhen: 'Select ONLY when enforcing autonomous full-turn completion to prevent premature stops, upward delegation, and unexecuted TODOs.',
    notWhen: 'NOT for irreversible destructive actions that genuinely require explicit human confirmation.',
  },
  'fable-native-code': {
    useWhen: 'Select ONLY when enforcing codebase idiom matching, stripping defensive bloat, and ensuring diffs read like native repository code.',
    notWhen: 'NOT for introducing foreign framework abstractions or verbose explanatory comments.',
  },
  'fable-outcome-first': {
    useWhen: 'Select ONLY when enforcing response styling that leads with a direct first-sentence outcome answer and zero sycophancy.',
    notWhen: 'NOT for burying conclusions at the end of a chronological tool narration.',
  },
  'fable-prove-it': {
    useWhen: 'Select ONLY when enforcing three-rung verification precedence (Written -> Runs -> Verified) to prevent unverified completion claims.',
    notWhen: 'NOT for accepting "should work" speculation as completion proof.',
  },
  'fable-scope-discipline': {
    useWhen: 'Select ONLY when enforcing anti-scope-creep and surgical atomic diffs strictly bounded to the authorized user request.',
    notWhen: 'NOT for opportunistic drive-by refactors in adjacent untouched files.',
  },
  'fable-domain': {
    useWhen: 'Select ONLY when generating research-grounded sector domain adapters, domain noun translations, and trap fixtures.',
    notWhen: 'NOT for generic lifecycle skill authoring (fable-skill-creator) without sector-specific domain grounding.',
  },
  'fable-judge': {
    useWhen: 'Select ONLY when performing adversarial verification of finished deliverables to detect weakened tests, deleted assertions, or false completion claims.',
    notWhen: 'NOT for collaborative style review (fable-review) or initial test execution (fable-verify).',
  },
  'fable-method': {
    useWhen: 'Select ONLY when executing the canonical Think-Act-Prove problem-solving loop (classify ask, define done, act surgically, verify by observation).',
    notWhen: 'NOT for unstructured ad-hoc code edits without defining done criteria.',
  },
  'fable-council': {
    useWhen: 'Select ONLY when convening a multi-agent deliberation council across installed CLI agents to pressure-test architectural plans before execution.',
    notWhen: 'NOT for parallel task execution (fable-delegate) or trivial single-file edits.',
  },
  'fable-tend': {
    useWhen: 'Select ONLY when operating as an autonomous repository maintainer for CI failure repair, PR merge conflict resolution, and issue triage.',
    notWhen: 'NOT for greenfield feature architecture or final production release tagging (fable-release).',
  },
  'fable-wise': {
    useWhen: 'Select ONLY when applying low-level cognitive reflexes (Depth, Breadth, Coil, Mesh, Paperthin, Re0, SSOTize) to purify drifted artifacts and strip slop.',
    notWhen: 'NOT for superficial formatting changes that leave structural duplication intact.',
  },
};

/**
 * Builds the canonical Choice criteria for selected_skill from the skill registry.
 */
export function buildSkillSelectionCriteria(
  registry: SkillRegistry = loadSkillRegistry()
): Record<string, string> {
  const criteria: Record<string, string> = {};

  for (const skillId of canonicalSkillIds()) {
    if (skillId === 'get-fable') continue; // Meta-router is not a routing target

    const entry = getSkillEntry(skillId, registry);
    const contrast = SKILL_BOUNDARY_CONTRASTS[skillId];

    let desc = entry.description;
    if (contrast) {
      desc += ` Use when: ${contrast.useWhen} Not when: ${contrast.notWhen}`;
    }
    criteria[skillId] = desc;
  }

  return criteria;
}

/**
 * Builds the canonical Choice criteria for task_shape.
 */
export function buildTaskShapeCriteria(): Record<FableTaskShape, string> {
  return {
    research: 'Investigating external docs, APIs, or existing repository behavior',
    architecture: 'High-level system design, multi-step planning, or capability composition',
    'bug-fix': 'Repairing a bug, error, defect, or broken test',
    feature: 'Implementing new functionality or extending existing features',
    delegation: 'Splitting work across multiple independent parallel workers',
    review: 'Reviewing diffs, code quality, or verifying behavior',
    security: 'Security analysis, penetration testing, or vulnerability remediation',
    release: 'Packaging, publishing, tagging, or release preparation',
    handoff: 'Context transfer or session continuation packaging',
    eval: 'Benchmarking or evaluating agents, prompts, or skills',
    'bounded-change': 'Small atomic edits, simplification, or maintenance without feature expansion',
    unknown: 'Unclear or underspecified task shape',
  };
}

/**
 * Builds the complete question payload for first-pass Jev evaluation.
 */
export function buildFirstPassQuestions(
  registry: SkillRegistry = loadSkillRegistry()
): Record<string, JevQuestion> {
  return {
    selected_skill: {
      type: 'choice',
      instructions:
        'Which specialist Fable skill is the single best fit to own the primary user intent described in the state?',
      criteria: buildSkillSelectionCriteria(registry),
    },
    task_shape: {
      type: 'choice',
      instructions: 'What is the primary architectural shape or category of this task?',
      criteria: buildTaskShapeCriteria(),
    },
    needs_recovery: {
      type: 'noul',
      instructions:
        'Does the task describe a repeated failed attempt, stale execution path, wrong build/cache, or diagnostic failure that requires recovery before further code edits?',
      criteria: {
        true: 'Explicit or repeated failures needing diagnosis/recovery',
        false: 'Normal forward task execution or first attempt',
      },
    },
    security_relevant: {
      type: 'noul',
      instructions:
        "Is the primary requested work an explicit security audit, penetration test, vulnerability remediation, or trust-boundary modification?",
      criteria: {
        true: 'Explicit security work or trust boundary',
        false: 'General software engineering, even if it touches endpoints',
      },
    },
    needs_current_external_research: {
      type: 'noul',
      instructions:
        'Does fulfilling this task responsibly require consulting external official documentation, API specifications, or release notes?',
      criteria: {
        true: 'Requires external documentation lookup or web research',
        false: 'Can be resolved entirely from local repository knowledge',
      },
    },
    needs_planning: {
      type: 'noul',
      instructions:
        'Does the requested work have enough cross-file, architectural, or multi-step complexity that a bounded plan should precede code mutation?',
      criteria: {
        true: 'Requires a formal multi-step implementation plan',
        false: 'Direct atomic execution or single-card fix is appropriate',
      },
    },
    needs_behavior_verification: {
      type: 'noul',
      instructions:
        'Is the primary request to prove, validate, or falsify current behavior rather than to write new code?',
      criteria: {
        true: 'Primary goal is behavior verification or test evidence',
        false: 'Primary goal is code mutation or implementation',
      },
    },
    is_behavior_change: {
      type: 'noul',
      instructions:
        'Does the request alter observable runtime or product behavior in a way that warrants test-driven regression coverage?',
      criteria: {
        true: 'Modifies observable product or runtime behavior',
        false: 'Refactoring, cleanup, docs, or non-functional edits',
      },
    },
    benefits_from_delegation: {
      type: 'noul',
      instructions:
        'Does the request comprise multiple independent subtasks with disjoint write and verification boundaries that can be parallelized?',
      criteria: {
        true: 'Multiple independent parallelizable work streams',
        false: 'Single coherent task or sequentially dependent steps',
      },
    },
  };
}

export const POLICY_OVERLAY_SKILLS: readonly FableSkillId[] = [
  'fable-native-code',
  'fable-scope-discipline',
  'fable-context-thrift',
  'fable-prove-it',
  'fable-finish-your-turn',
  'fable-outcome-first',
  'fable-wise',
  'fable-method',
];

export interface SubagentSkillArmingPrompt {
  subtaskSummary: string;
  primarySkill: string;
  candidateOverlaySkills: string[];
  questions: Record<string, JevQuestion>;
}

/**
 * Builds a TypeSafe Jev score/choice prompt to evaluate which policy overlay skills
 * (`fable-native-code`, `fable-scope-discipline`, `fable-context-thrift`, `fable-prove-it`,
 * `fable-finish-your-turn`, `fable-outcome-first`, `fable-wise`, `fable-method`)
 * should be co-armed onto a subagent for a given subtask.
 */
export function buildSubagentSkillArmingPrompt(
  subtask: string | { id?: string; title?: string; description?: string; writeScope?: string[] },
  primarySkill: FableSkillId | string,
  candidateOverlaySkills: readonly (FableSkillId | string)[] = POLICY_OVERLAY_SKILLS,
  registry: SkillRegistry = loadSkillRegistry()
): SubagentSkillArmingPrompt {
  const subtaskSummary =
    typeof subtask === 'string'
      ? subtask
      : [subtask.title, subtask.description, subtask.writeScope?.join(', ')]
          .filter(Boolean)
          .join(' — ');

  const candidates = candidateOverlaySkills.filter((skill) => skill !== primarySkill);
  const choiceCriteria: Record<string, string> = {};
  const questions: Record<string, JevQuestion> = {};

  for (const skillId of candidates) {
    const contrast = SKILL_BOUNDARY_CONTRASTS[skillId];
    let description = '';
    try {
      description = getSkillEntry(skillId as FableSkillId, registry).description;
    } catch {
      description = `Policy overlay skill ${skillId}`;
    }
    const boundaryText = contrast
      ? ` Use when: ${contrast.useWhen} Not when: ${contrast.notWhen}`
      : '';
    choiceCriteria[skillId] = `${description}${boundaryText}`;

    questions[`score_${skillId}`] = {
      type: 'score',
      instructions: `How strongly should policy overlay skill "${skillId}" be co-armed alongside primary skill "${primarySkill}" for subtask: "${subtaskSummary}"?`,
      criteria: [
        `Irrelevant or redundant for this subtask (${contrast?.notWhen ?? 'not applicable'})`,
        'Weakly helpful background discipline',
        'Moderately helpful guardrail for this subtask',
        `Essential execution guardrail (${contrast?.useWhen ?? 'directly enforces subtask invariants'})`,
      ],
    };
  }

  questions.primary_overlay_choice = {
    type: 'choice',
    instructions: `Which policy overlay skill is the single highest-leverage co-armed guardrail for primary skill "${primarySkill}" on subtask: "${subtaskSummary}"?`,
    criteria: choiceCriteria,
  };

  return {
    subtaskSummary,
    primarySkill,
    candidateOverlaySkills: [...candidates],
    questions,
  };
}

