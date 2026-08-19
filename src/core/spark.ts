import type { FableState } from './types.ts';

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

  // 1. Rule 1 & Rule 9: Failure Loop Detection
  if (state.failureStreak >= 2 || state.phase === 'recovering') {
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
  }

  if (state.currentSkill === 'fable-review') {
    const activeLower = (activeCardText || state.activeCard || '').toLowerCase();
    if (activeLower.includes('finding') || activeLower.includes('fix')) {
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
    if (openCards && openCards.length > 1) {
      const suggestion = cleanSuggestion('delegate the independent cards');
      return {
        suggestion,
        reasonCode: 'independent-cards-delegation',
        confidence: 0.89,
        source: 'missing-gate',
        silent: !suggestion,
      };
    }
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

  // 4. Rule 3 & Rule 8: Lifecycle Phase Constraints
  if (state.phase === 'complete') {
    return {
      suggestion: null,
      reasonCode: 'scope-complete-silent',
      confidence: 0.0,
      source: 'none',
      silent: true,
    };
  }

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
