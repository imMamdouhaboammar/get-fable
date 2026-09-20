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
  'fable-discover': {
    useWhen: 'Investigating unknown local repository code, runtime execution paths, or project layout.',
    notWhen: 'Looking up external official third-party API documentation or when a card is already bounded.',
  },
  'fable-research': {
    useWhen: 'Checking current official external documentation, library APIs, release notes, or web facts.',
    notWhen: 'Exploring the existing local codebase or executing local test suites.',
  },
  'fable-plan': {
    useWhen: 'Designing architecture, multi-step work breakdowns, or preparing implementation cards.',
    notWhen: 'Executing a single already-bounded task or immediate quick fixes.',
  },
  'fable-tdd': {
    useWhen: 'Writing test-first regression tests for bug fixes or testable behavior changes.',
    notWhen: 'Refactoring with unchanged behavior or non-code documentation changes.',
  },
  'fable-execute': {
    useWhen: 'Implementing a single, well-scoped accepted card with zero scope drift.',
    notWhen: 'Broad planning, repeated failures needing diagnosis, or test-first behavior changes.',
  },
  'fable-review': {
    useWhen: 'Critiquing an existing diff, pull request, or changed code for failure scenarios.',
    notWhen: 'Verifying completion evidence with automated tests or running build gates.',
  },
  'fable-verify': {
    useWhen: 'Validating implementations with fresh automated tests, builds, and machine-checked evidence.',
    notWhen: 'Giving qualitative diff feedback or investigating unknown codebase paths.',
  },
  'fable-security': {
    useWhen: 'Auditing authentication, authorization, secrets, trust boundaries, and input validation.',
    notWhen: 'Offensive penetration testing (redteam) or automated vulnerability remediation (heal).',
  },
  'fable-redteam': {
    useWhen: 'Executing offensive penetration testing, CVSS scoring, attack graphs, and automated scanning.',
    notWhen: 'Defensive code review or applying security patches.',
  },
  'fable-heal': {
    useWhen: 'Synthesizing and applying patches/remediations for identified security vulnerabilities.',
    notWhen: 'Discovering new vulnerabilities or general non-security bug fixes.',
  },
  'fable-recover': {
    useWhen: 'Diagnosing repeated failures, broken environments, stale caches, or build failures.',
    notWhen: 'Normal first-attempt task execution.',
  },
  'fable-release': {
    useWhen: 'Packaging, certifying release readiness, publishing npm/binaries, or tagging releases.',
    notWhen: 'Normal feature development or in-progress implementation.',
  },
  'fable-handoff': {
    useWhen: 'Creating durable continuation state across agent sessions or pausing work cleanly.',
    notWhen: 'Completing all work in the current session.',
  },
  'fable-delegate': {
    useWhen: 'Splitting independent work items across subagents with write & verification independence.',
    notWhen: 'Single-agent execution or tightly-coupled sequential tasks.',
  },
  'fable-simplify': {
    useWhen: 'Simplifying settled code to reduce cognitive and cyclomatic complexity without changing behavior.',
    notWhen: 'Fixing bugs, adding new features, or changing runtime semantics.',
  },
  'fable-eval': {
    useWhen: 'Benchmarking agent routing, prompt variations, or skill performance against test suites.',
    notWhen: 'Normal repository coding tasks.',
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
