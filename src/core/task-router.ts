import { getSkillEntry, loadSkillRegistry } from './skill-registry.js';
import type { FableSkillId, FableState, RoutingDecision, SkillRegistry } from './types.js';

const SKILLS: FableSkillId[] = [
  'get-fable',
  'fable-discover',
  'fable-plan',
  'fable-execute',
  'fable-verify',
  'fable-recover',
];

function emptyScores(): Record<FableSkillId, number> {
  return {
    'get-fable': 0,
    'fable-discover': 0,
    'fable-plan': 0,
    'fable-execute': 1,
    'fable-verify': 0,
    'fable-recover': 0,
  };
}

function addSignal(
  scores: Record<FableSkillId, number>,
  reasons: Map<FableSkillId, string[]>,
  skill: FableSkillId,
  weight: number,
  reason: string
) {
  scores[skill] += weight;
  const list = reasons.get(skill) || [];
  list.push(reason);
  reasons.set(skill, list);
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export function routeTask(
  task: string,
  state?: FableState | null,
  registry: SkillRegistry = loadSkillRegistry()
): RoutingDecision {
  const text = task.trim().toLowerCase();
  if (!text) throw new Error('Task text must not be empty');

  const scores = emptyScores();
  const reasons = new Map<FableSkillId, string[]>();

  if ((state?.failureStreak || 0) >= 2) {
    addSignal(scores, reasons, 'fable-recover', 8, 'project state records repeated failure');
  }
  if (state?.phase === 'recovering') {
    addSignal(scores, reasons, 'fable-recover', 6, 'project state is already recovering');
  }
  if (state?.phase === 'verifying') {
    addSignal(scores, reasons, 'fable-verify', 4, 'project state is already verifying');
  }

  if (
    has(
      text,
      /failed twice|fails twice|same (?:test|command|fix|failure)|retry(?:ing|ied)?|still fail|keeps? failing|doesn['’]?t work|didn['’]?t work|stale|cache|wrong branch|wrong build|no effect/
    )
  ) {
    addSignal(scores, reasons, 'fable-recover', 9, 'task describes repeated or stale failure');
  }

  if (has(text, /\bverify\b|\bvalidate\b|\breview\b|\baudit\b|\bprove\b|before merge|ready to ship|is this correct|check the diff|regression check/)) {
    addSignal(scores, reasons, 'fable-verify', 7, 'task explicitly asks for adversarial verification');
  }

  if (has(text, /\binspect\b|\bexplore\b|\bresearch\b|\btrace\b|find where|understand the repo|unknown|documentation|official docs|current behavior|latest behavior/)) {
    addSignal(scores, reasons, 'fable-discover', 6, 'task depends on discovery or current evidence');
  }

  if (has(text, /\bplan\b|\bdesign\b|\barchitecture\b|\bmigration\b|\brefactor\b|multi[- ]file|end to end|modular|restructure|redesign/)) {
    addSignal(scores, reasons, 'fable-plan', 6, 'task has broad design or decomposition scope');
  }

  if (has(text, /\bimplement\b|\bfix\b|\badd\b|\bupdate\b|\bchange\b|\bbuild\b|\bremove\b|\brename\b/)) {
    addSignal(scores, reasons, 'fable-execute', 3, 'task requests a concrete code change');
  }

  const ranked = SKILLS.filter((skill) => skill !== 'get-fable')
    .map((skill) => ({ skill, score: scores[skill] }))
    .sort((a, b) => b.score - a.score);

  let selectedSkill = ranked[0].skill;
  if (scores['fable-recover'] >= 7) selectedSkill = 'fable-recover';
  else if (scores['fable-verify'] >= 7) selectedSkill = 'fable-verify';
  else if (scores['fable-discover'] >= 6 && scores['fable-plan'] < 6) selectedSkill = 'fable-discover';
  else if (scores['fable-plan'] >= 6) selectedSkill = 'fable-plan';

  const selectedScore = scores[selectedSkill];
  const secondScore = ranked.find((entry) => entry.skill !== selectedSkill)?.score || 0;
  const confidence = Math.max(
    0.51,
    Math.min(0.99, 0.56 + selectedScore * 0.025 + Math.max(0, selectedScore - secondScore) * 0.035)
  );

  const selectedReasons = reasons.get(selectedSkill) || ['bounded execution is the default when no stronger routing signal is present'];
  const entry = getSkillEntry(selectedSkill, registry);

  return {
    selectedSkill,
    confidence: Number(confidence.toFixed(2)),
    reasons: selectedReasons,
    requiresPlan:
      selectedSkill === 'fable-plan' ||
      selectedSkill === 'fable-discover' ||
      scores['fable-plan'] >= 4,
    nextSkills: entry.next,
    scores,
  };
}
