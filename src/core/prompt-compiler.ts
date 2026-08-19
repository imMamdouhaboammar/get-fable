import { readFableState } from './state.js';
import { getCoreRepoRoot, readSkillBody } from './skill-registry.js';
import { routeTask } from './task-router.js';
import { evaluateFableSpark } from './spark.js';
import type { FableState, RoutingDecision } from './types.js';

const CORE_CONTRACT = `# get-fable runtime contract & harness discipline
- Improve execution discipline; do not claim the underlying model changed.
- Ground load-bearing decisions in code, tools, tests, or primary sources.
- Lead with the outcome: state the direct answer or TLDR first before supporting reasoning.
- Readable over compressed: write in complete sentences with technical terms spelled out.
- Code comments: write comments only to state constraints the code itself cannot show.
- Neutral pronoun default: use they/them unless stated.
- Destructive confirmation: confirm before irreversible or outward-facing actions.
- Autonomous execution: when having enough info, act; do not ask permission mid-task for reversible actions; check the final paragraph to ensure promises are executed via tool calls.
- Keep work bounded and preserve user-owned files and constraints.
- Treat workspace mutations as invalidating older verification.
- Do not call substantial work complete without current-generation verification evidence.
- Keep evidence types narrow: research, receipts, security, and behavior checks prove different things.
- After repeated failure, change the diagnosis before changing more code.
- Keep progress claims factual and distinguish verified facts from assumptions.`;

export interface CompiledDirective {
  decision: RoutingDecision;
  systemPrompt: string;
  state: FableState | null;
}

function compactState(state: FableState | null, task?: string): string {
  if (!state) return 'Project state: no active .fable/state.json was found.';
  const evidencePasses = state.evidence.filter((item) => item.result === 'pass').length;
  const evidenceFailures = state.evidence.filter((item) => item.result === 'fail').length;
  const spark = evaluateFableSpark({ state, userIntent: task });
  const sparkSnippet = spark.suggestion ? `; sparkNextMove=${spark.suggestion}` : '';
  return [
    `Project state: phase=${state.phase}`,
    `skill=${state.currentSkill || 'none'}`,
    `failureStreak=${state.failureStreak}`,
    `substantial=${state.substantial}`,
    `mutationGeneration=${state.mutationGeneration}`,
    `verifiedGeneration=${state.verifiedGeneration}`,
    `activeCard=${state.activeCard || 'none'}`,
    `evidencePasses=${evidencePasses}`,
    `evidenceFailures=${evidenceFailures}`,
  ].join('; ') + sparkSnippet;
}

export function compileFableDirective(
  task: string,
  targetDir: string = process.cwd(),
  repoRoot: string = getCoreRepoRoot()
): CompiledDirective {
  const state = readFableState(targetDir);
  const decision = routeTask(task, state || undefined);
  const skillBody = readSkillBody(decision.selectedSkill, repoRoot);
  const routingSummary = decision.reasons.map((reason) => `- ${reason}`).join('\n');
  const gates = decision.requiredGates.length
    ? decision.requiredGates.map((gate) => `- ${gate}`).join('\n')
    : '- none beyond the selected skill contract';

  const systemPrompt = [
    CORE_CONTRACT,
    `\n## Selected workflow\n${decision.selectedSkill} (${decision.selectedPack}; task=${decision.taskShape})`,
    `\n## Routing evidence\n${routingSummary}`,
    `\n## Required gates\n${gates}`,
    `\n## Runtime state\n${compactState(state, task)}`,
    `\n## Selected skill contract\n${skillBody}`,
  ]
    .join('\n')
    .trim();

  return { decision, systemPrompt, state };
}

export function latestUserIntent(
  messages: Array<{ role: string; content: string }>
): string {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role === 'user' && message.content.trim()) return message.content.trim();
  }
  throw new Error('Request contains no non-empty user message to route');
}
