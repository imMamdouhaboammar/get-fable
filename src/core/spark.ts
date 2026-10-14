import type { FableState } from './types.ts';
import { RECOVERY_FAILURE_THRESHOLD } from './task-router.js';

export type SparkSource =
  | 'failure-loop'
  | 'mutation-delta'
  | 'missing-gate'
  | 'active-card'
  | 'lifecycle-state'
  | 'continuation'
  | 'none';

export interface SparkSignalContext {
  userIntent?: string;
  state: FableState;
  activeCardText?: string | null;
  openCards?: string[];
  recentMessages?: Array<{ role: string; content: string }>;
  latestError?: string | null;
  latestMutationSource?: string | null;
}

export interface SparkResult {
  suggestion: string | null;
  reasonCode: string;
  confidence: number;
  source: SparkSource;
  silent: boolean;
}

export const SPARK_SPECIALIST_NEXT_MOVES: Record<string, { command: string; rationale: string }> = {
  'get-fable': {
    command: 'route the active task',
    rationale: 'Select the canonical specialist skill before mutating the workspace.',
  },
  'fable-discover': {
    command: 'trace the repository execution path',
    rationale: 'Resolve load-bearing codebase unknowns before planning or editing.',
  },
  'fable-research': {
    command: 'check the current official docs',
    rationale: 'Ground external API facts in primary documentation before coding.',
  },
  'fable-plan': {
    command: 'decompose work into bounded cards',
    rationale: 'Define explicit acceptance criteria and bounded file scope before execution.',
  },
  'fable-tdd': {
    command: 'write the failing test',
    rationale: 'Observe a red regression test before implementing the behavior change.',
  },
  'fable-delegate': {
    command: 'delegate the independent cards',
    rationale: 'Dispatch disjoint work items across parallel subagents with TOON contracts.',
  },
  'fable-execute': {
    command: 'implement the active work card',
    rationale: 'Apply the bounded code change while preserving repository invariants.',
  },
  'fable-verify': {
    command: 'run the verification test suite',
    rationale: 'Record fresh machine-checked completion proof for the current generation.',
  },
  'fable-review': {
    command: 'review the diff',
    rationale: 'Audit changed files against engineering standards and specification compliance.',
  },
  'fable-security': {
    command: 'audit the trust boundary inputs',
    rationale: 'Verify authentication, authorization, and secret hygiene across boundaries.',
  },
  'fable-redteam': {
    command: 'run the scoped redteam probes',
    rationale: 'Execute non-destructive adversarial security probes against authorized targets.',
  },
  'fable-heal': {
    command: 'apply the security remediation patch',
    rationale: 'Synthesize and verify patches neutralizing reported redteam findings.',
  },
  'fable-release': {
    command: 'check release readiness',
    rationale: 'Certify quality gates, build artifacts, and clean working tree before shipping.',
  },
  'fable-handoff': {
    command: 'prepare the handoff',
    rationale: 'Compact current state, generation stamps, and next action for continuation.',
  },
  'fable-eval': {
    command: 'run the evaluation benchmark suite',
    rationale: 'Score routing and behavioral accuracy against frozen holdout baselines.',
  },
  'fable-learning': {
    command: 'extract durable session learnings',
    rationale: 'Codify engineering failure lessons and reusable rules into Failure-lessons.',
  },
  'fable-recover': {
    command: 'diagnose the repeated failure',
    rationale: 'Walk the 4-level recovery hierarchy before attempting another code edit.',
  },
  'fable-dataviz': {
    command: 'render the accessible svg chart',
    rationale: 'Verify viewBox dimensions and theme contrast for data visualization tiles.',
  },
  'fable-artifact': {
    command: 'author the structured technical artifact',
    rationale: 'Generate the architecture diagram or interactive proposal component.',
  },
  'fable-simplify': {
    command: 'simplify the settled code paths',
    rationale: 'Flatten nested branches and remove duplication without altering behavior.',
  },
  'fable-loop': {
    command: 'run the bounded polling loop',
    rationale: 'Monitor status with explicit iteration budget, backoff, and exit conditions.',
  },
  'fable-run': {
    command: 'launch the live runtime check',
    rationale: 'Start the built artifact, probe readiness, and tear down cleanly.',
  },
  'fable-memory': {
    command: 'index the persistent memory fact',
    rationale: 'Record the cross-session constraint and synchronize MEMORY.md.',
  },
  'fable-config': {
    command: 'validate the harness settings diff',
    rationale: 'Verify JSON schema and least-privilege permissions before applying config.',
  },
  'fable-simulator': {
    command: 'verify against the independent oracle',
    rationale: 'Compare runtime outputs against derived mathematical or browser oracles.',
  },
  'fable-cowork': {
    command: 'execute the autonomous cowork chain',
    rationale: 'Complete the multi-step workflow silently and report the outcome first.',
  },
  'fable-spark': {
    command: 'predict the smallest next action',
    rationale: 'Evaluate mutation delta and missing gates to surface one atomic move.',
  },
  'fable-skill-creator': {
    command: 'package and benchmark the skill',
    rationale: 'Validate SKILL.md frontmatter and BinEval trigger discrimination.',
  },
  'fable-architecture': {
    command: 'evaluate the architecture scale vectors',
    rationale: 'Score Scale, Domain, and Resource vectors to enforce microservices boundaries.',
  },
  'fable-eco': {
    command: 'compile the capability execution contract',
    rationale: 'Resolve curated capability locks and verify host integration health.',
  },
  'fable-context-thrift': {
    command: 'batch and target file lookups',
    rationale: 'Eliminate redundant file reads to conserve context token budget.',
  },
  'fable-finish-your-turn': {
    command: 'complete the remaining turn deliverables',
    rationale: 'Execute all promised actions and resolve errors before yielding.',
  },
  'fable-native-code': {
    command: 'align diff with codebase idioms',
    rationale: 'Match local naming and strip defensive bloat from the implementation.',
  },
  'fable-outcome-first': {
    command: 'lead with the direct outcome',
    rationale: 'State the verified result in the first sentence without sycophancy.',
  },
  'fable-prove-it': {
    command: 'verify the claim with evidence',
    rationale: 'Advance verification to the machine-checked rung before claiming done.',
  },
  'fable-scope-discipline': {
    command: 'bound diff to requested scope',
    rationale: 'Remove drive-by edits and keep changes surgical to the active card.',
  },
  'fable-domain': {
    command: 'generate the sector domain adapter',
    rationale: 'Translate Fable workflow primitives into grounded domain nouns and fixtures.',
  },
  'fable-judge': {
    command: 'audit deliverable for weakened tests',
    rationale: 'Falsify completion claims and verify assertions were not diluted.',
  },
  'fable-method': {
    command: 'execute the think act prove loop',
    rationale: 'Classify the ask, define done criteria, act surgically, and observe proof.',
  },
  'fable-council': {
    command: 'convene the multi agent council',
    rationale: 'Gather independent peer critiques before locking the implementation plan.',
  },
  'fable-tend': {
    command: 'triage and repair ci failures',
    rationale: 'Inspect failing checks or merge conflicts and apply a minimal repair.',
  },
  'fable-wise': {
    command: 'apply wise cognitive reflex patterns',
    rationale: 'Use Depth, Breadth, Coil, and Mesh reflexes to strip structural slop.',
  },
};

function cleanSuggestion(text: string | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 12) return null;
  if (/^(I will|Let's|You should|Please|Great|Note|Warning)/i.test(trimmed)) return null;
  return trimmed;
}

export function evaluateFableSpark(context: SparkSignalContext): SparkResult {
  const { state, userIntent, latestError, latestMutationSource, activeCardText, openCards } = context;

  // Completion is terminal for next-move prediction even if a stale specialist remains selected.
  if (state.phase === 'complete' && state.currentSkill !== 'fable-handoff') {
    return {
      suggestion: null,
      reasonCode: 'scope-complete-silent',
      confidence: 0.0,
      source: 'none',
      silent: true,
    };
  }

  // 1. Rule 1 & Rule 9: Failure Loop Detection
  if (state.failureStreak >= RECOVERY_FAILURE_THRESHOLD || state.phase === 'recovering') {
    const errorStr = (latestError || '').toLowerCase();
    let raw = 'diagnose the repeated failure';
    if (errorStr.includes('integration')) {
      raw = 'diagnose the repeated integration failure';
    } else if (errorStr.includes('migration')) {
      raw = 'diagnose the repeated migration failure';
    }
    const suggestion = cleanSuggestion(raw);
    return {
      suggestion,
      reasonCode: 'failure-loop-diagnose-required',
      confidence: 0.95,
      source: 'failure-loop',
      silent: !suggestion,
    };
  }

  // 2. Rule 2 & Rule 5: Mutation vs Verification Delta (Actual code mutated)
  if (
    state.mutationGeneration > 0 &&
    state.mutationGeneration > state.verifiedGeneration &&
    state.phase !== 'idle' &&
    state.phase !== 'discovering'
  ) {
    const mutationSource = (latestMutationSource || '').toLowerCase();
    const isBuildMutation =
      mutationSource.includes('esbuild') ||
      mutationSource.includes('webpack') ||
      mutationSource.includes('tsconfig') ||
      mutationSource.includes('package.json') ||
      mutationSource.includes('vite.config') ||
      mutationSource.includes('rollup') ||
      mutationSource.includes('styles') ||
      mutationSource.includes('css');

    if (isBuildMutation) {
      const suggestion = cleanSuggestion('run the build');
      return {
        suggestion,
        reasonCode: 'build-verification-stale',
        confidence: 0.94,
        source: 'mutation-delta',
        silent: !suggestion,
      };
    }

    const intentLower = (userIntent || '').toLowerCase();
    const activeLower = (activeCardText || state.activeCard || '').toLowerCase();
    const combinedContext = `${intentLower} ${activeLower}`;

    const hasSecurityEvidence = state.evidence?.some(
      (e) => e.kind === 'security' && e.result === 'pass'
    );
    if (
      state.currentSkill === 'fable-security' &&
      hasSecurityEvidence &&
      (combinedContext.includes('bug') ||
        combinedContext.includes('fix') ||
        combinedContext.includes('regression') ||
        combinedContext.includes('repair'))
    ) {
      const suggestion = cleanSuggestion('verify the repaired behavior');
      return {
        suggestion,
        reasonCode: 'security-does-not-prove-functional-repair',
        confidence: 0.92,
        source: 'missing-gate',
        silent: !suggestion,
      };
    }

    if (combinedContext.includes('refresh')) {
      const suggestion = cleanSuggestion('run the affected refresh tests');
      return {
        suggestion,
        reasonCode: 'verification-stale-after-mutation',
        confidence: 0.93,
        source: 'mutation-delta',
        silent: !suggestion,
      };
    }

    const suggestion = cleanSuggestion('run the affected tests');
    return {
      suggestion,
      reasonCode: 'verification-stale-after-mutation',
      confidence: 0.92,
      source: 'mutation-delta',
      silent: !suggestion,
    };
  }

  // 3. Rule 5 & Rule 6: Missing Gates across specialist skills
  if (state.currentSkill === 'fable-tdd') {
    const hasFailingTestEvidence = state.evidence?.some(
      (e) => e.kind === 'test' && e.result === 'fail'
    );
    if (!hasFailingTestEvidence && state.mutationGeneration === 0) {
      const suggestion = cleanSuggestion('write the failing test');
      return {
        suggestion,
        reasonCode: 'tdd-missing-failing-test',
        confidence: 0.91,
        source: 'missing-gate',
        silent: !suggestion,
      };
    }
    return {
      suggestion: null,
      reasonCode: 'silent-no-obvious-move',
      confidence: 0.0,
      source: 'none',
      silent: true,
    };
  }

  if (state.currentSkill === 'fable-review') {
    const activeLower = (activeCardText || state.activeCard || '').toLowerCase();
    if (activeLower.includes('finding')) {
      const suggestion = cleanSuggestion('fix the review finding');
      return {
        suggestion,
        reasonCode: 'review-finding-unaddressed',
        confidence: 0.9,
        source: 'active-card',
        silent: !suggestion,
      };
    }
    const hasReviewEvidence = state.evidence?.some((e) => e.kind === 'review');
    if (!hasReviewEvidence) {
      const suggestion = cleanSuggestion('review the diff');
      return {
        suggestion,
        reasonCode: 'diff-unreviewed',
        confidence: 0.89,
        source: 'missing-gate',
        silent: !suggestion,
      };
    }
    return {
      suggestion: null,
      reasonCode: 'silent-no-obvious-move',
      confidence: 0.0,
      source: 'none',
      silent: true,
    };
  }

  if (state.currentSkill === 'fable-research') {
    const suggestion = cleanSuggestion('check the current official docs');
    return {
      suggestion,
      reasonCode: 'external-research-required',
      confidence: 0.88,
      source: 'missing-gate',
      silent: !suggestion,
    };
  }

  if (state.currentSkill === 'fable-delegate') {
    if (!openCards || openCards.length > 1) {
      const suggestion = cleanSuggestion('delegate the independent cards');
      return {
        suggestion,
        reasonCode: 'independent-cards-delegation',
        confidence: 0.89,
        source: 'missing-gate',
        silent: !suggestion,
      };
    }
    return {
      suggestion: null,
      reasonCode: 'silent-no-obvious-move',
      confidence: 0.0,
      source: 'none',
      silent: true,
    };
  }

  if (state.currentSkill === 'fable-release') {
    const suggestion = cleanSuggestion('check release readiness');
    return {
      suggestion,
      reasonCode: 'release-verification-ready',
      confidence: 0.9,
      source: 'missing-gate',
      silent: !suggestion,
    };
  }

  if (state.currentSkill === 'fable-handoff') {
    const suggestion = cleanSuggestion('prepare the handoff');
    return {
      suggestion,
      reasonCode: 'continuity-handoff-ready',
      confidence: 0.91,
      source: 'missing-gate',
      silent: !suggestion,
    };
  }

  // 3b. Specialist-tailored next moves for all 42 canonical skills during active lifecycle phases
  if (
    state.currentSkill &&
    SPARK_SPECIALIST_NEXT_MOVES[state.currentSkill] &&
    (state.phase === 'discovering' ||
      state.phase === 'planned' ||
      state.phase === 'executing' ||
      state.phase === 'verifying')
  ) {
    const move = SPARK_SPECIALIST_NEXT_MOVES[state.currentSkill]!;
    const suggestion = cleanSuggestion(move.command);
    return {
      suggestion,
      reasonCode: `${state.currentSkill}-next-move`,
      confidence: 0.88,
      source: 'missing-gate',
      silent: !suggestion,
    };
  }

  // 4. Rule 3 & Rule 8: Lifecycle Phase Constraints
  if (state.phase === 'idle') {
    if (userIntent && userIntent.trim()) {
      const intentLower = userIntent.toLowerCase();
      if (
        intentLower.includes('bug') ||
        intentLower.includes('fix') ||
        intentLower.includes('regression')
      ) {
        const suggestion = cleanSuggestion('reproduce the bug');
        return {
          suggestion,
          reasonCode: 'intake-reproduce-bug',
          confidence: 0.88,
          source: 'missing-gate',
          silent: !suggestion,
        };
      }
      if (intentLower.includes('doc') || intentLower.includes('api')) {
        const suggestion = cleanSuggestion('check the official docs');
        return {
          suggestion,
          reasonCode: 'intake-check-docs',
          confidence: 0.88,
          source: 'missing-gate',
          silent: !suggestion,
        };
      }
      const suggestion = cleanSuggestion('route the task');
      return {
        suggestion,
        reasonCode: 'intake-route-task',
        confidence: 0.85,
        source: 'lifecycle-state',
        silent: !suggestion,
      };
    }
    return {
      suggestion: null,
      reasonCode: 'idle-no-intent-silent',
      confidence: 0.0,
      source: 'none',
      silent: true,
    };
  }

  return {
    suggestion: null,
    reasonCode: 'silent-no-obvious-move',
    confidence: 0.0,
    source: 'none',
    silent: true,
  };
}

