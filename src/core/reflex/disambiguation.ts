import { getSkillEntry, loadSkillRegistry } from '../skill-registry.js';
import type { FableSkillId, SkillRegistry } from '../types.js';
import { SKILL_BOUNDARY_CONTRASTS } from './question-builder.js';
import type { JevChoiceQuestion, JevNoulQuestion, JevQuestion } from './question-builder.js';
import type { ReflexAdvice, ReflexConfig, ReflexStateEnvelopeV1 } from './types.js';

export interface ProbabilityMarginResult {
  topSkill: FableSkillId | null;
  topProb: number;
  secondSkill: FableSkillId | null;
  secondProb: number;
  margin: number;
}

/**
 * Calculates the top-1 and top-2 candidates and their probability margin.
 */
export function calculateProbabilityMargin(
  probabilities: Partial<Record<FableSkillId, number>>
): ProbabilityMarginResult {
  const sorted = (Object.entries(probabilities) as Array<[FableSkillId, number]>)
    .filter(([_, prob]) => typeof prob === 'number' && !isNaN(prob))
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return { topSkill: null, topProb: 0, secondSkill: null, secondProb: 0, margin: 0 };
  }

  const [topSkill, topProb] = sorted[0];
  const [secondSkill, secondProb] = sorted.length > 1 ? sorted[1] : [null, 0];
  const margin = topProb - secondProb;

  return {
    topSkill,
    topProb,
    secondSkill,
    secondProb,
    margin: Math.max(0, margin),
  };
}

/**
 * Determines whether first-stage advice is ambiguous and warrants a second-stage verification call.
 */
export function isAmbiguous(
  advice: ReflexAdvice,
  envelope: ReflexStateEnvelopeV1,
  config: ReflexConfig,
  registry: SkillRegistry = loadSkillRegistry()
): boolean {
  if (!advice.selectedSkill || advice.confidence === null) return true;

  const { topSkill, secondSkill, margin } = calculateProbabilityMargin(advice.probabilities);

  // Margin is too narrow
  if (margin < config.minMargin) return true;

  // Confidence is marginally low (< 0.75)
  if (advice.confidence < 0.75) return true;

  // Disagreement between deterministic and Jev on a substantial card
  if (envelope.lifecycle.substantial && advice.selectedSkill !== envelope.deterministic.selectedSkill) {
    return true;
  }

  // Top two candidates share the same pack
  if (topSkill && secondSkill) {
    try {
      const topPack = getSkillEntry(topSkill, registry).pack;
      const secondPack = getSkillEntry(secondSkill, registry).pack;
      if (topPack === secondPack) return true;
    } catch {
      // Ignored if skill lookup fails
    }
  }

  return false;
}

/**
 * Builds the focused second-stage questions map for the top candidate skills.
 */
export function buildSecondStageQuestions(
  candidates: FableSkillId[],
  registry: SkillRegistry = loadSkillRegistry()
): Record<string, JevQuestion> {
  const topCandidates = candidates.slice(0, 3);
  const choiceCriteria: Record<string, string> = {};

  for (const skill of topCandidates) {
    try {
      const entry = getSkillEntry(skill, registry);
      const contrast = SKILL_BOUNDARY_CONTRASTS[skill];
      let desc = `${entry.description} (Pack: ${entry.pack}, Phase: ${entry.phase}). Intents: ${entry.intents.slice(0, 3).join(', ')}.`;
      if (contrast) {
        desc += ` Use when: ${contrast.useWhen} Not when: ${contrast.notWhen}`;
      }
      choiceCriteria[skill] = desc;
    } catch {
      choiceCriteria[skill] = 'Candidate skill';
    }
  }

  choiceCriteria['none_of_these'] =
    'None of the candidate skills are an appropriate fit; default fallback should be used.';

  const bestCandidateQuestion: JevChoiceQuestion = {
    type: 'choice',
    instructions:
      'Given the ambiguous or close classification between these candidate skills, which one definitively fits the primary user intent?',
    criteria: choiceCriteria,
  };

  const candidateFitsQuestion: JevNoulQuestion = {
    type: 'noul',
    instructions:
      'Does the selected candidate skill directly and safely address the user request without violating lifecycle or safety gates?',
    criteria: {
      true: 'Candidate skill is a direct and safe fit',
      false: 'Candidate skill is poorly matched, incomplete, or unsafe',
    },
  };

  return {
    best_candidate: bestCandidateQuestion,
    candidate_fits: candidateFitsQuestion,
  };
}
