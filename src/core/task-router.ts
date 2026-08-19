import { canonicalSkillIds, getSkillEntry, loadSkillRegistry } from './skill-registry.js';
import type {
  FableSkillId,
  FableState,
  FableTaskShape,
  RoutingDecision,
  SkillRegistry,
} from './types.js';


function emptyScores(): Record<FableSkillId, number> {
  return Object.fromEntries(
    canonicalSkillIds().map((skill) => [skill, skill === 'fable-execute' ? 1 : 0])
  ) as Record<FableSkillId, number>;
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
  if (skill === 'fable-research' || skill === 'fable-memory') return 'research';
  if (skill === 'fable-plan' || skill === 'fable-artifact' || skill === 'fable-config' || skill === 'fable-spark') return 'architecture';
  if (skill === 'fable-delegate') return 'delegation';
  if (skill === 'fable-review' || skill === 'fable-verify' || skill === 'fable-run' || skill === 'fable-simulator') return 'review';
  if (skill === 'fable-security') return 'security';
  if (skill === 'fable-release') return 'release';
  if (skill === 'fable-handoff') return 'handoff';
  if (skill === 'fable-eval' || skill === 'fable-loop') return 'eval';
  if (skill === 'fable-simplify') return 'bounded-change';
  if (skill === 'fable-dataviz' || skill === 'fable-cowork' || skill === 'skill-creator') return 'feature';
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
  const suppressExternalResearch = /(?:external|web) research (?:is )?not needed|do not (?:use|do|perform) (?:external|web) research|no (?:external|web) research/.test(text);
  const suppressRelease = /do not (?:ship|publish|release|tag)|don't (?:ship|publish|release|tag)|not ready to (?:ship|publish|release)|(?:ship|publish|release) (?:is )?out of scope/.test(text);
  const suppressSecurity = /no security (?:behavior|boundary|logic|change)s?|security (?:work|review) (?:is )?not (?:needed|required)|not (?:a )?security (?:change|task|review)/.test(text);
  const suppressTdd = /no [^.]{0,40}behavior changes?|without (?:changing|a change to) behavior|not (?:a )?behavior change/.test(text);

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
    !suppressSecurity &&
    has(
      text,
      /\bsecurity\b|\bvulnerab(?:ility|ilities)\b|threat model|\bauthentication\b|\bauthorization\b|\boauth\b|\bsecrets?\b|untrusted input|\binjection\b|\bxss\b|\bcsrf\b|\bssrf\b/
    )
  ) {
    addSignal(scores, reasons, 'fable-security', 9, 'task crosses an explicit security or trust boundary');
  }

  if (
    !suppressRelease &&
    has(
      text,
      /\brelease\b|\bpublish\b|\bship\b|\btag\b|ready (?:to|for) (?:merge|release|publish)|merge (?:this|now|the pr)|open (?:a )?pr|create (?:a )?pull request|ready for pr|pull request readiness/
    )
  ) {
    addSignal(scores, reasons, 'fable-release', 8, 'task asks for delivery or release readiness');
  }

  if (has(text, /\bhandoff\b|continue later|next session|resume later|context transfer|pass this to another agent/)) {
    addSignal(scores, reasons, 'fable-handoff', 12, 'task asks for durable continuation state');
  }

  if (has(text, /\beval\b|\bevaluate\b|\bbenchmark\b|holdout|self[- ]improv|prompt quality|skill quality|agent control|regression suite for (?:prompt|skill|agent)/)) {
    addSignal(scores, reasons, 'fable-eval', 8, 'task evaluates or changes agent-control behavior');
  }

  if (
    has(
      text,
      /code review|review (?:the |this )?(?:diff|branch|commit|pr)|standards review|spec review|review changed files|independently critique|critique (?:the )?changed files/
    )
  ) {
    addSignal(scores, reasons, 'fable-review', 8, 'task requests an independent code or diff review');
  }

  if (has(text, /\bverify\b|\bvalidate\b|\bprove\b|ready to ship|is this correct|acceptance check|regression check|completion evidence/)) {
    addSignal(scores, reasons, 'fable-verify', 7, 'task explicitly asks for behavior verification');
  }

  if (
    !suppressExternalResearch &&
    has(
      text,
      /official (?:api )?docs|primary source|current api|current version|current official behavior[^.]{0,80}(?:external )?api|official behavior[^.]{0,80}api|latest (?:official )?(?:api )?(?:docs|documentation|release|version|behavior)|external documentation|release notes|web research/
    )
  ) {
    addSignal(scores, reasons, 'fable-research', 8, 'task depends on current external facts');
  }

  if (has(text, /\binspect\b|\bexplore\b|\btrace\b|find where|understand the repo|understand (?:why|how)[^.]{0,100}repository|current repository (?:behavior|behaves)|unknown|without knowing|not knowing|repository behavior|execution path/)) {
    const discoveryWeight = /inspect (?:this |the |a )?(?:local )?repository|trace[^.]{0,80}repository|execution path|understand (?:why|how)[^.]{0,100}repository/.test(text) ? 10 : 6;
    addSignal(scores, reasons, 'fable-discover', discoveryWeight, 'task depends on repository discovery or execution-path evidence');
  }

  if (has(text, /\bdelegate\b|\bsubagents?\b|parallel agents|parallel workers|multi[- ]agent|independent tasks|independent work items|disjoint ownership|proceed in parallel|split across agents/)) {
    addSignal(scores, reasons, 'fable-delegate', 8, 'task explicitly requests bounded parallel work');
  }

  if (has(text, /\bplan\b|\bdesign\b|\barchitecture\b|\bmigration\b|\brefactor\b|multi[- ]file|end to end|modular|restructure|redesign/)) {
    addSignal(scores, reasons, 'fable-plan', 6, 'task has broad design or decomposition scope');
  }

  if (has(text, /\bchart\b|\bgraph\b|\bplot\b|\bdataviz\b|\bvisualization\b|\bdashboard\b|\bmetric tile\b|\bkpi row\b|\bheatmap\b/)) {
    addSignal(scores, reasons, 'fable-dataviz', 10, 'task creates or modifies data visualizations');
  }

  if (has(text, /\bartifact\b|\bdiagram\b|\bmermaid\b|\barchitecture diagram\b|\binteractive component\b/)) {
    addSignal(scores, reasons, 'fable-artifact', 12, 'task designs artifacts or architecture diagrams');
  }

  if (has(text, /\bsimplify\b|\bclean up\b|\bdead code\b|\bdeduplicate\b|\baltitude\b/)) {
    addSignal(scores, reasons, 'fable-simplify', 10, 'task requests code simplification and altitude cleanup');
  }

  if (has(text, /\bloop\b|\brecurring\b|\bbabysit\b|\binterval\b|\bpoll\b/)) {
    addSignal(scores, reasons, 'fable-loop', 10, 'task requests recurring loop execution');
  }

  if (has(text, /\brun app\b|\brun the app\b|\bstart server\b|\blaunch app\b|\blive smoke test\b/)) {
    addSignal(scores, reasons, 'fable-run', 10, 'task requests live application runtime execution');
  }

  if (has(text, /\bmemory\b|\bremember\b|\buser preference\b|memory\.md|\brecall fact/)) {
    addSignal(scores, reasons, 'fable-memory', 10, 'task interacts with persistent project memory');
  }

  if (has(text, /\bsettings\.json\b|\bkeybindings\b|\ballowlist\b|\bconfigure hooks\b|\bharness\b/)) {
    addSignal(scores, reasons, 'fable-config', 12, 'task configures agent harness settings');
  }

  if (has(text, /\bsimulator\b|independent oracle|derive contract|headless browser|causal evidence matrix/)) {
    addSignal(scores, reasons, 'fable-simulator', 10, 'task requests simulator verification and independent oracles');
  }

  if (has(text, /\bcowork\b|autonomous (?:mode|task|execution)|background mode|clean tool/)) {
    addSignal(scores, reasons, 'fable-cowork', 10, 'task requests autonomous cowork execution');
  }

  if (has(text, /\bspark\b|predict (?:the )?next move|situational awareness|smallest action/)) {
    addSignal(scores, reasons, 'fable-spark', 10, 'task invokes situational awareness next-move prediction');
  }

  if (has(text, /\bskill-creator\b|create (?:a )?skill|author skill|benchmark skill|optimize skill description|eval suite/)) {
    addSignal(scores, reasons, 'skill-creator', 12, 'task creates or optimizes an autonomous skill package');
  }

  if (!suppressTdd && has(text, /\btdd\b|test[- ]first|red[- ]green|regression test|failing test[^.]{0,100}(?:before|first)|\bregressed\b|\bbug fix\b|fix the bug|\bfix\b[^.]{0,80}\b(?:error|exception|regression)\b|behavior change|add a feature|implement a feature/)) {
    addSignal(scores, reasons, 'fable-tdd', 10, 'task describes a testable behavior change');
  }

  if (has(text, /\bimplement\b|\bfix\b|\badd\b|\bupdate\b|\bchange\b|\bbuild\b|\bremove\b|\brename\b/)) {
    addSignal(scores, reasons, 'fable-execute', 3, 'task requests a concrete code change');
  }

  const ranked = canonicalSkillIds().filter((skill) => skill !== 'get-fable')
    .map((skill) => ({ skill, score: scores[skill] }))
    .sort((a, b) => b.score - a.score);

  let selectedSkill = ranked[0].score > 0 ? ranked[0].skill : 'fable-execute';
  if (scores['fable-recover'] >= 8) {
    selectedSkill = 'fable-recover';
  }

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
