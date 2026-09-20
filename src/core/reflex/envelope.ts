import type {
  FablePhase,
  FableSkillId,
  FableState,
  RoutingDecision,
} from '../types.js';
import type { ReflexStateEnvelopeV1 } from './types.js';

export const MAX_REFLEX_TASK_LENGTH = 2048;

/**
 * Secret patterns matching typical high-entropy tokens, API keys, passwords, and private keys.
 */
const SECRET_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-_.]+/gi,
  /apikey_[A-Za-z0-9_]{20,}/gi,
  /(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{20,}/gi,
  /gh[pousr]_[A-Za-z0-9_]{36,}/gi,
  /AIzaSy[A-Za-z0-9\-_]{33}/gi,
  /-----BEGIN (?:RSA )?PRIVATE KEY-----[A-Za-z0-9+/=\s]+-----END (?:RSA )?PRIVATE KEY-----/gi,
  /(?:password|secret|token|api[_-]?key)\s*[:=]\s*["']?[^\s"';,]{8,}["']?/gi,
];

/**
 * Redacts secrets from task strings.
 */
export function redactSecrets(text: string): { sanitized: string; redactedCount: number } {
  let sanitized = text;
  let redactedCount = 0;

  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      redactedCount++;
      // If the match was a key=value pair, preserve the key name for semantic context
      const kvMatch = match.match(/^((?:password|secret|token|api[_-]?key)\s*[:=]\s*)(.+)$/i);
      if (kvMatch) {
        return `${kvMatch[1]}[REDACTED_SECRET]`;
      }
      return '[REDACTED_SECRET]';
    });
  }

  return { sanitized, redactedCount };
}

/**
 * Sanitizes task string: strips non-printable control characters, trims, truncates to MAX_REFLEX_TASK_LENGTH.
 */
export function sanitizeTaskText(task: string): { text: string; rawLength: number; truncated: boolean } {
  // Strip control characters except standard whitespace (\n, \t, \r)
  const cleaned = task.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  const rawLength = cleaned.length;
  const truncated = rawLength > MAX_REFLEX_TASK_LENGTH;
  const text = truncated ? cleaned.slice(0, MAX_REFLEX_TASK_LENGTH) : cleaned;

  return { text, rawLength, truncated };
}

/**
 * Derives constraint suppressions from task text.
 */
export function extractTaskConstraints(taskText: string) {
  const text = taskText.toLowerCase();
  return {
    suppressResearch: /(?:external|web) research (?:is )?not needed|do not (?:use|do|perform) (?:external|web) research|no (?:external|web) research/.test(text),
    suppressRelease: /do not (?:ship|publish|release|tag)|don't (?:ship|publish|release|tag)|not ready to (?:ship|publish|release)|(?:ship|publish|release) (?:is )?out of scope/.test(text),
    suppressSecurity: /no security (?:behavior|boundary|logic|change)s?|security (?:work|review) (?:is )?not (?:needed|required)|not (?:a )?security (?:change|task|review)/.test(text),
    suppressTdd: /no [^.]{0,40}behavior changes?|without (?:changing|a change to) behavior|not (?:a )?behavior change/.test(text),
    suppressPlan: /do not plan|don't plan|no planning|planning (?:is )?out of scope|skip (?:the )?plan|without planning/.test(text),
    suppressReview: /do not review|don't review|no (?:code )?review|review (?:is )?out of scope|skip (?:the )?review/.test(text),
    suppressDelegation: /do not delegate|don't delegate|no delegation|without subagents?|single agent|single worker/.test(text),
  };
}

/**
 * Calculates failure state bucket from lifecycle state.
 */
export function calculateFailureState(state?: FableState | null): 'none' | 'single-failure' | 'repeated-failure' {
  const streak = state?.failureStreak || 0;
  if (streak >= 2 || state?.phase === 'recovering') return 'repeated-failure';
  if (streak === 1) return 'single-failure';
  return 'none';
}

/**
 * Calculates verification freshness bucket from state evidence and mutation generations.
 */
export function calculateVerificationFreshness(state?: FableState | null): 'fresh' | 'stale' | 'none' {
  if (!state?.evidence || state.evidence.length === 0) return 'none';
  const verifiedGen = state.verifiedGeneration || 0;
  const mutationGen = state.mutationGeneration || 0;
  return verifiedGen >= mutationGen ? 'fresh' : 'stale';
}

/**
 * Maps deterministic routing scores into discrete candidate buckets.
 */
export function bucketTopCandidates(
  scores: Record<FableSkillId, number>,
  selectedSkill: FableSkillId
): Array<{ skill: FableSkillId; scoreBucket: 'strong' | 'moderate' | 'weak' }> {
  const entries = Object.entries(scores) as Array<[FableSkillId, number]>;
  return entries
    .filter(([skill, score]) => skill !== 'get-fable' && score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, score]) => {
      let scoreBucket: 'strong' | 'moderate' | 'weak' = 'weak';
      if (score >= 6 || skill === selectedSkill) {
        scoreBucket = 'strong';
      } else if (score >= 3) {
        scoreBucket = 'moderate';
      }
      return { skill, scoreBucket };
    });
}

/**
 * Builds the canonical ReflexStateEnvelopeV1 from task, state, and deterministic decision.
 */
export function buildReflexEnvelope(
  rawTask: string,
  state: FableState | null | undefined,
  deterministic: RoutingDecision
): { envelope: ReflexStateEnvelopeV1; failClosed: boolean; reason?: string } {
  const { text: sanitizedTask } = sanitizeTaskText(rawTask);
  const { sanitized: redactedTask, redactedCount } = redactSecrets(sanitizedTask);

  // If the task was purely a secret or became empty after redaction, fail closed
  if (!redactedTask.trim() || (redactedCount > 0 && redactedTask.replace(/\[REDACTED_SECRET\]/g, '').trim().length === 0)) {
    return {
      envelope: {
        schemaVersion: 1,
        task: '[REDACTED]',
        lifecycle: {
          phase: (state?.phase as FablePhase) || 'idle',
          currentSkill: state?.currentSkill || null,
          failureState: calculateFailureState(state),
          substantial: Boolean(state?.substantial),
          hasActiveCard: Boolean(state?.activeCard),
          verificationFreshness: calculateVerificationFreshness(state),
        },
        deterministic: {
          selectedSkill: deterministic.selectedSkill,
          selectedPack: deterministic.selectedPack,
          reasons: deterministic.reasons,
          requiresPlan: deterministic.requiresPlan,
          topCandidates: bucketTopCandidates(deterministic.scores, deterministic.selectedSkill),
        },
        constraints: extractTaskConstraints(rawTask),
      },
      failClosed: true,
      reason: 'Task content was entirely redacted as secret; failing closed to deterministic route',
    };
  }

  const envelope: ReflexStateEnvelopeV1 = {
    schemaVersion: 1,
    task: redactedTask,
    lifecycle: {
      phase: (state?.phase as FablePhase) || 'idle',
      currentSkill: state?.currentSkill || null,
      failureState: calculateFailureState(state),
      substantial: Boolean(state?.substantial),
      hasActiveCard: Boolean(state?.activeCard),
      verificationFreshness: calculateVerificationFreshness(state),
    },
    deterministic: {
      selectedSkill: deterministic.selectedSkill,
      selectedPack: deterministic.selectedPack,
      reasons: deterministic.reasons,
      requiresPlan: deterministic.requiresPlan,
      topCandidates: bucketTopCandidates(deterministic.scores, deterministic.selectedSkill),
    },
    constraints: extractTaskConstraints(rawTask),
  };

  return { envelope, failClosed: false };
}
