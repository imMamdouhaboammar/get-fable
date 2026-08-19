import { getSkillEntry, loadSkillRegistry } from './skill-registry.js';
import type {
  FableSkillId,
  FableState,
  FableTaskShape,
  RoutingDecision,
  SkillRegistry,
} from './types.js';

const SKILLS: FableSkillId[] = [
  'get-fable',
  'fable-discover',
  'fable-research',
  'fable-plan',
  'fable-tdd',
  'fable-delegate',
  'fable-execute',
  'fable-verify',
  'fable-review',
  'fable-security',
  'fable-release',
  'fable-handoff',
  'fable-eval',
  'fable-recover',
];

function emptyScores(): Record<FableSkillId, number> {
  return {
    'get-fable': 0,
    'fable-discover': 0,
    'fable-research': 0,
    'fable-plan': 0,
    'fable-tdd': 0,
    'fable-delegate': 0,
    'fable-execute': 1,
    'fable-verify': 0,
    'fable-review': 0,
    'fable-security': 0,
    'fable-release': 0,
    'fable-handoff': 0,
    'fable-eval': 0,
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

function taskShapeFor(skill: FableSkillId, text: string): FableTaskShape {
  if (skill === 'fable-research') return 'research';
  if (skill === 'fable-plan') return 'architecture';
  if (skill === 'fable-delegate') return 'delegation';
  if (skill === 'fable-review' || skill === 'fable-verify') return 'review';
  if (skill === 'fable-security') return 'security';
  if (skill === 'fable-release') return 'release';
  if (skill === 'fable-handoff') return 'handoff';
  if (skill === 'fable-eval') return 'eval';
  if (skill === 'fable-tdd') {
    return has(text, /\bbug\b|\bfix\b|broken|regression|fails?/) ? 'bug-fix' : 'feature';
  }
  if (skill === 'fable-execute') return 'bounded-change';
  return 'unknown';
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
    addSignal(scores, reasons, 'fable-verify', 3, 'project state is already verifying');
  }

  if (
    has(
      text,
      /failed twice|fails twice|same (?:test|command|fix|failure)|retry(?:ing|ied)?|still fail|keeps? failing|doesn['’]?t work|didn['’]?t work|stale|cache|wrong branch|wrong build|no effect/
    )
  ) {
    addSignal(scores, reasons, 'fable-recover', 9, 'task describes repeated or stale failure');
  }

  if (
    has(
      text,
      /\bsecurity\b|\bvulnerab(?:ility|ilities)\b|threat model|auth(?:entication|orization)?|permission|privilege|secret|untrusted input|injection|xss|csrf|ssrf/
    )
  ) {
    addSignal(scores, reasons, 'fable-security', 9, 'task crosses an explicit security or trust boundary');
  }

  if (
    has(
      text,
      /\brelease\b|\bpublish\b|\bship\b|\btag\b|ready (?:to|for) (?:merge|release|publish)|merge (?:this|now|the pr)|open (?:a )?pr|create (?:a )?pull request|ready for pr|pull request readiness/
    )
  ) {
    addSignal(scores, reasons, 'fable-release', 8, 'task asks for delivery or release readiness');
  }

  if (has(text, /\bhandoff\b|continue later|next session|resume later|context transfer|pass this to another agent/)) {
    addSignal(scores, reasons, 'fable-handoff', 8, 'task asks for durable continuation state');
  }

  if (has(text, /\beval\b|\bbenchmark\b|holdout|self[- ]improv|prompt quality|skill quality|agent control|regression suite for (?:prompt|skill|agent)/)) {
    addSignal(scores, reasons, 'fable-eval', 8, 'task evaluates or changes agent-control behavior');
  }

  if (
    has(
      text,
      /code review|review (?:the |this )?(?:diff|branch|commit|pr)|standards review|spec review|review changed files/
    )
  ) {
    addSignal(scores, reasons, 'fable-review', 8, 'task requests an independent code or diff review');
  }

  if (has(text, /\bverify\b|\bvalidate\b|\bprove\b|ready to ship|is this correct|acceptance check|regression check|completion evidence/)) {
    addSignal(scores, reasons, 'fable-verify', 7, 'task explicitly asks for behavior verification');
  }

  if (
    has(
      text,
      /official (?:api )?docs|primary source|current api|current version|latest (?:official )?(?:api )?(?:docs|documentation|release|version|behavior)|external documentation|release notes|web research/
    )
  ) {
    addSignal(scores, reasons, 'fable-research', 8, 'task depends on current external facts');
  }

  if (has(text, /\binspect\b|\bexplore\b|\btrace\b|find where|understand the repo|unknown|repository behavior|execution path/)) {
    addSignal(scores, reasons, 'fable-discover', 6, 'task depends on repository discovery or execution-path evidence');
  }

  if (has(text, /\bdelegate\b|\bsubagents?\b|parallel agents|parallel workers|multi[- ]agent|independent tasks|split across agents/)) {
    addSignal(scores, reasons, 'fable-delegate', 8, 'task explicitly requests bounded parallel work');
  }

  if (has(text, /\bplan\b|\bdesign\b|\barchitecture\b|\bmigration\b|\brefactor\b|multi[- ]file|end to end|modular|restructure|redesign/)) {
    addSignal(scores, reasons, 'fable-plan', 6, 'task has broad design or decomposition scope');
  }

  if (has(text, /\btdd\b|test[- ]first|red[- ]green|regression test|\bbug fix\b|fix the bug|behavior change|add a feature|implement a feature/)) {
    addSignal(scores, reasons, 'fable-tdd', 6, 'task describes a testable behavior change');
  }

  if (has(text, /\bimplement\b|\bfix\b|\badd\b|\bupdate\b|\bchange\b|\bbuild\b|\bremove\b|\brename\b/)) {
    addSignal(scores, reasons, 'fable-execute', 3, 'task requests a concrete code change');
  }

  const ranked = SKILLS.filter((skill) => skill !== 'get-fable')
    .map((skill) => ({ skill, score: scores[skill] }))
    .sort((a, b) => b.score - a.score);

  let selectedSkill = ranked[0].skill;
  if (scores['fable-recover'] >= 7) selectedSkill = 'fable-recover';
  else if (scores['fable-security'] >= 8) selectedSkill = 'fable-security';
  else if (scores['fable-release'] >= 8) selectedSkill = 'fable-release';
  else if (scores['fable-handoff'] >= 8) selectedSkill = 'fable-handoff';
  else if (scores['fable-eval'] >= 8) selectedSkill = 'fable-eval';
  else if (scores['fable-review'] >= 8) selectedSkill = 'fable-review';
  else if (scores['fable-verify'] >= 7) selectedSkill = 'fable-verify';
  else if (scores['fable-research'] >= 8) selectedSkill = 'fable-research';
  else if (scores['fable-discover'] >= 6 && scores['fable-plan'] < 6) selectedSkill = 'fable-discover';
  else if (scores['fable-delegate'] >= 8) selectedSkill = 'fable-delegate';
  else if (scores['fable-plan'] >= 6) selectedSkill = 'fable-plan';
  else if (scores['fable-tdd'] >= 6) selectedSkill = 'fable-tdd';

  const selectedScore = scores[selectedSkill];
  const secondScore = ranked.find((entry) => entry.skill !== selectedSkill)?.score || 0;
  const confidence = Math.max(
    0.51,
    Math.min(0.99, 0.56 + selectedScore * 0.025 + Math.max(0, selectedScore - secondScore) * 0.035)
  );

  const selectedReasons = reasons.get(selectedSkill) || ['bounded execution is the default when no stronger routing signal is present'];
  const entry = getSkillEntry(selectedSkill, registry);
  const parallelCandidates = entry.next.filter((skill) => getSkillEntry(skill, registry).parallelSafe);

  return {
    selectedSkill,
    selectedPack: entry.pack,
    taskShape: taskShapeFor(selectedSkill, text),
    confidence: Number(confidence.toFixed(2)),
    reasons: selectedReasons,
    requiresPlan:
      selectedSkill === 'fable-plan' ||
      selectedSkill === 'fable-discover' ||
      selectedSkill === 'fable-research' ||
      scores['fable-plan'] >= 4,
    requiredGates: [...entry.gates],
    fallbackSkill: entry.fallback,
    parallelCandidates,
    nextSkills: entry.next,
    scores,
  };
}
