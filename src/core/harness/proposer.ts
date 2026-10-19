/**
 * Harness Editor & Contrastive Proposer for Harness² in get-fable.
 *
 * Implements Propose step in the Propose–Probe–Compose loop:
 * - Invariant proposals: System-wide invariants, tool guidance, recovery patterns.
 * - Domain-specific proposals: Task-specific skills, domain procedures, memory anchors.
 * - Contrast generation: Produces diverse candidate harnesses for contrastive probing.
 */

import { classifyComponent } from './tree.js';
import type {
  HarnessComponentKind,
  HarnessEditProposal,
  HarnessTree,
  SurfaceSpec,
} from './types.js';

export interface ProposalContext {
  taskDescription: string;
  domain?: string;
  observedErrors?: string[];
  candidateCount?: number;
}

export function generateInvariantProposals(
  surface: SurfaceSpec,
  baseTree: HarnessTree,
  context: ProposalContext
): HarnessEditProposal[] {
  const proposals: HarnessEditProposal[] = [];

  // Invariant 1: Defensive Tool Guidance
  const toolFile = surface.alwaysOn.find((f) => f.includes('tool_guidance')) || 'guardrails.md';
  const existingToolContent = baseTree[toolFile] || '';
  const toolEdit = `${existingToolContent}\n\n## Automated Tool Calling Invariants\n- Always inspect target schema and parameters before issuing destructive or state-mutating commands.\n- Catch caller input exceptions and map them to explicit error messages.\n`;

  proposals.push({
    id: `prop-inv-tool-guidance-${Date.now()}`,
    kind: 'invariant',
    description: 'Enforce preflight input validation and error mapping on tool boundaries',
    targetComponent: classifyComponent(toolFile),
    edits: {
      [toolFile]: toolEdit.trim(),
    },
    confidence: 0.92,
  });

  // Invariant 2: Failure streak & Error Recovery Guardrail
  const guardFile = surface.autotriggerFile;
  const existingGuard = baseTree[guardFile] || '';
  const guardEdit = `${existingGuard}\n\n## Resilient Failure Recovery Invariant\n- If an execution path fails twice, halt speculative retries immediately and switch to root-cause diagnosis.\n`;

  proposals.push({
    id: `prop-inv-recovery-${Date.now()}`,
    kind: 'invariant',
    description: 'Circuit-breaker guardrail halting speculative retries upon consecutive failures',
    targetComponent: classifyComponent(guardFile),
    edits: {
      [guardFile]: guardEdit.trim(),
    },
    confidence: 0.88,
  });

  return proposals;
}

export function generateDomainProposals(
  surface: SurfaceSpec,
  baseTree: HarnessTree,
  context: ProposalContext
): HarnessEditProposal[] {
  const proposals: HarnessEditProposal[] = [];
  const domain = context.domain || 'general-engineering';
  const taskSlug = context.taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 32)
    .replace(/^-|-$/g, '');

  // Domain Skill Proposal
  const skillName = `harness-${taskSlug || 'specialist'}`;
  const skillPath = `${surface.skillDir}/${skillName}/SKILL.md`;

  const skillContent = `---
name: ${skillName}
description: Specialized domain procedure for ${context.taskDescription} in domain ${domain}.
---

# Domain Playbook: ${context.taskDescription}

## Objective
Execute the requested domain objective with rigorous verification and zero scope drift.

## Procedure
1. Inspect inputs, interfaces, and preconditions.
2. Apply deterministic domain transformations.
3. Verify outputs against observable criteria.
`;

  const triggerLine = surface.triggerLine
    .replace('{desc}', `encountering tasks related to ${context.taskDescription}`)
    .replace('{name}', skillName);

  const triggerFile = surface.autotriggerFile;
  const updatedTriggerFile = `${baseTree[triggerFile] || ''}\n${triggerLine}`;

  proposals.push({
    id: `prop-dom-skill-${Date.now()}`,
    kind: 'domain_specific',
    description: `Targeted procedural skill for "${context.taskDescription}"`,
    targetComponent: 'c5_skills',
    edits: {
      [skillPath]: skillContent,
      [triggerFile]: updatedTriggerFile.trim(),
    },
    confidence: 0.85,
  });

  // Domain Memory Anchor Proposal
  const memFile = surface.alwaysOn.find((f) => f.includes('MEMORY')) || 'AGENTS.md';
  const existingMem = baseTree[memFile] || '';
  const memEdit = `${existingMem}\n\n### Domain Context [${domain}]\n- Task intent: ${context.taskDescription}\n- Verification standard: machine-checkable evidence required.\n`;

  proposals.push({
    id: `prop-dom-memory-${Date.now()}`,
    kind: 'domain_specific',
    description: `Domain episodic memory anchor for task context in ${domain}`,
    targetComponent: 'c3_memory',
    edits: {
      [memFile]: memEdit.trim(),
    },
    confidence: 0.8,
  });

  return proposals;
}

export function proposeHarnessEdits(
  surface: SurfaceSpec,
  baseTree: HarnessTree,
  context: ProposalContext
): HarnessEditProposal[] {
  const invariants = generateInvariantProposals(surface, baseTree, context);
  const domainEdits = generateDomainProposals(surface, baseTree, context);
  return [...invariants, ...domainEdits];
}
