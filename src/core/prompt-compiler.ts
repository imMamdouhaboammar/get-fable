import { readFableState } from './state.js';
import { getCoreRepoRoot, getSkillEntry, loadSkillRegistry, readSkillBody } from './skill-registry.js';
import { routeTask } from './task-router.js';
import { evaluateFableSpark } from './spark.js';
import { compactFableStateToon } from './toon.js';
import { resolveRoute } from './reflex/service.js';
import { POLICY_OVERLAY_SKILLS, SKILL_BOUNDARY_CONTRASTS } from './reflex/question-builder.js';
import type { ReflexAdvisor, ReflexConfig, RouteResolution } from './reflex/types.js';
import { routeMythosExperts } from './mythos/moe-moda-router.js';
import type { MoeRouteDecision } from './mythos/types.js';
import type { FableSkillId, FableState, RoutingDecision } from './types.js';

const CORE_CONTRACT = `# get-fable runtime contract & harness discipline
- Improve execution discipline; do not claim the underlying model changed.
- Ground load-bearing decisions in code, tools, tests, or primary sources.
- Lead with the outcome: state the direct answer or TLDR first before supporting reasoning.
- Readable over compressed: write in complete sentences with technical terms spelled out.
- Structured communication protocol: all inter-agent exchanges, subagent delegation contracts, worker return packets, and structured state transfers MUST use TOON (Token-Oriented Object Notation).
- Format TOON payloads inside \`\`\`toon ... \`\`\` codeblocks with explicit [N] counts and {fields} headers for strict structural validation.
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
  coArmedOverlaySkills?: FableSkillId[];
  mythosRoute?: MoeRouteDecision;
  routeResolution?: RouteResolution;
}

export interface CompileFableDirectiveWithJevOptions {
  targetDir?: string;
  repoRoot?: string;
  state?: FableState | null;
  reflexConfig?: ReflexConfig;
  advisor?: ReflexAdvisor;
  maxOverlaySkills?: number;
}

function compactState(state: FableState | null, task?: string): string {
  if (!state) return 'Project state: no active .fable/state.json was found.';
  const evidencePasses = state.evidence.filter((item) => item.result === 'pass').length;
  const evidenceFailures = state.evidence.filter((item) => item.result === 'fail').length;
  const spark = evaluateFableSpark({ state, userIntent: task });
  const sparkSnippet = spark.suggestion ? `; sparkNextMove=${spark.suggestion}` : '';
  const summaryLine = [
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

  const toonBlock = compactFableStateToon(state);
  return `${summaryLine}\n\`\`\`toon\n${toonBlock}\n\`\`\``;
}

export function selectCoArmedPolicyOverlays(
  task: string,
  decision: RoutingDecision,
  mythosRoute: MoeRouteDecision,
  maxOverlays: number = 3
): FableSkillId[] {
  const registry = loadSkillRegistry();
  const primaryEntry = getSkillEntry(decision.selectedSkill, registry);
  const routedWeights = new Map<string, number>(
    mythosRoute.routedExperts.map((r) => [r.expertId, r.normalizedGateWeight])
  );
  const sharedSet = new Set(mythosRoute.sharedExperts);
  const lower = task.toLowerCase();

  const scored = POLICY_OVERLAY_SKILLS.filter((skillId) => skillId !== decision.selectedSkill).map(
    (skillId) => {
      let score = 0.5;
      if (sharedSet.has(skillId)) score += 0.25;
      score += (routedWeights.get(skillId) ?? 0) * 0.5;
      score += (decision.scores[skillId] ?? 0) * 0.05;

      if (primaryEntry.mutatesWorkspace) {
        if (skillId === 'fable-scope-discipline') score += 0.35;
        if (skillId === 'fable-native-code') score += 0.32;
        if (skillId === 'fable-finish-your-turn') score += 0.2;
      }
      if (primaryEntry.phase === 'discovering') {
        if (skillId === 'fable-context-thrift') score += 0.4;
      }
      if (primaryEntry.phase === 'verifying' || primaryEntry.pack === 'proof') {
        if (skillId === 'fable-prove-it') score += 0.4;
        if (skillId === 'fable-outcome-first') score += 0.25;
      }
      if (primaryEntry.phase === 'planned') {
        if (skillId === 'fable-wise') score += 0.3;
        if (skillId === 'fable-scope-discipline') score += 0.3;
      }
      if (lower.includes('refactor') || lower.includes('clean') || lower.includes('slop')) {
        if (skillId === 'fable-wise' || skillId === 'fable-native-code') score += 0.3;
      }

      return { skillId, score };
    }
  );

  scored.sort((a, b) => b.score - a.score || a.skillId.localeCompare(b.skillId));
  return scored.slice(0, Math.max(1, maxOverlays)).map((s) => s.skillId);
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

export async function compileFableDirectiveWithJev(
  task: string,
  options?: CompileFableDirectiveWithJevOptions | string
): Promise<CompiledDirective> {
  const opts: CompileFableDirectiveWithJevOptions =
    typeof options === 'string' ? { targetDir: options } : options || {};
  const targetDir = opts.targetDir || process.cwd();
  const repoRoot = opts.repoRoot || getCoreRepoRoot();
  const state = opts.state !== undefined ? opts.state : readFableState(targetDir);

  const routeResolution = await resolveRoute(task, state || undefined, {
    config: opts.reflexConfig,
    advisor: opts.advisor,
  });
  const decision = routeResolution.decision;
  const mythosRoute = routeMythosExperts({ task, topK: 4 });
  const coArmedOverlaySkills = selectCoArmedPolicyOverlays(
    task,
    decision,
    mythosRoute,
    opts.maxOverlaySkills ?? 3
  );

  const skillBody = readSkillBody(decision.selectedSkill, repoRoot);
  const routingSummary = decision.reasons.map((reason) => `- ${reason}`).join('\n');
  const gates = decision.requiredGates.length
    ? decision.requiredGates.map((gate) => `- ${gate}`).join('\n')
    : '- none beyond the selected skill contract';

  const overlayLines = coArmedOverlaySkills
    .map((overlayId) => {
      const contrast = SKILL_BOUNDARY_CONTRASTS[overlayId];
      return `- ${overlayId}: ${contrast ? `${contrast.useWhen} (${contrast.notWhen})` : 'Policy overlay active'}`;
    })
    .join('\n');

  const mythosLines = [
    `- Shared experts: ${mythosRoute.sharedExperts.join(', ')}`,
    ...mythosRoute.routedExperts.map(
      (exp) => `- Routed expert: ${exp.expertId} (${exp.pack}; gateWeight=${exp.normalizedGateWeight})`
    ),
  ].join('\n');

  const systemPrompt = [
    CORE_CONTRACT,
    `\n## Selected workflow\n${decision.selectedSkill} (${decision.selectedPack}; task=${decision.taskShape})`,
    `\n## Co-armed policy overlay skills\n${overlayLines}`,
    `\n## OpenMythos MoE expert routing\n${mythosLines}`,
    `\n## Routing evidence\n${routingSummary}`,
    `\n## Required gates\n${gates}`,
    `\n## Runtime state\n${compactState(state, task)}`,
    `\n## Selected skill contract\n${skillBody}`,
  ]
    .join('\n')
    .trim();

  return {
    decision,
    systemPrompt,
    state,
    coArmedOverlaySkills,
    mythosRoute,
    routeResolution,
  };
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

