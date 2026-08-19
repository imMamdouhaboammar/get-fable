import fs from 'node:fs';
import path from 'node:path';
import { getCoreRepoRoot } from './skill-registry.js';
import type { FableSkillId } from './types.js';

export interface NeuralNode {
  id: string;
  pack: string;
  phase: string;
  label: string;
}

export interface NeuralEdge {
  source: string;
  target: string;
  relation: 'precursor' | 'continuation' | 'peer' | 'recovery' | 'fallback' | 'delegates_to';
  weight: number;
}

export interface NeuralGraph {
  version: string;
  nodes: NeuralNode[];
  edges: NeuralEdge[];
}

export interface SkillConnections {
  skillId: string;
  precursors: string[];
  continuations: string[];
  peers: string[];
  recovery: string | null;
}

export function loadNeuralGraph(repoRoot: string = getCoreRepoRoot()): NeuralGraph {
  const graphPath = path.join(repoRoot, 'registry', 'neural-graph.json');
  if (!fs.existsSync(graphPath)) {
    throw new Error(`Neural graph not found at ${graphPath}`);
  }
  return JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
}

export function getNeuralConnections(skillId: string, graph: NeuralGraph = loadNeuralGraph()): SkillConnections {
  const precursors = graph.edges
    .filter((e) => e.target === skillId && (e.relation === 'continuation' || e.relation === 'precursor'))
    .map((e) => e.source);

  const continuations = graph.edges
    .filter((e) => e.source === skillId && e.relation === 'continuation')
    .map((e) => e.target);

  const peers = graph.edges
    .filter((e) => (e.source === skillId || e.target === skillId) && e.relation === 'peer')
    .map((e) => (e.source === skillId ? e.target : e.source));

  const recoveryEdge = graph.edges.find((e) => e.source === skillId && e.relation === 'recovery');
  const recovery = recoveryEdge ? recoveryEdge.target : null;

  return {
    skillId,
    precursors: [...new Set(precursors)],
    continuations: [...new Set(continuations)],
    peers: [...new Set(peers)],
    recovery,
  };
}

export function validateNeuralGraph(graph: NeuralGraph = loadNeuralGraph()): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge source '${edge.source}' does not exist in graph nodes`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge target '${edge.target}' does not exist in graph nodes`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function renderNeuralGraphAscii(skillId?: string, graph: NeuralGraph = loadNeuralGraph()): string {
  if (skillId) {
    const conn = getNeuralConnections(skillId, graph);
    const lines: string[] = [
      `=== Neural Knowledge Graph: ${skillId} ===`,
      '',
      `  [Precursors]`,
      conn.precursors.length ? conn.precursors.map((p) => `    ↑-- ${p}`).join('\n') : '    (none)',
      '',
      `  [Active Node: ${skillId}]`,
      '',
      `  [Continuations]`,
      conn.continuations.length ? conn.continuations.map((c) => `    ↓--> ${c}`).join('\n') : '    (none)',
      '',
      `  [Lateral Peers]`,
      conn.peers.length ? conn.peers.map((p) => `    ↔-- ${p}`).join('\n') : '    (none)',
      '',
      `  [Recovery Handler]`,
      conn.recovery ? `    ⟲-- ${conn.recovery}` : '    (none)',
    ];
    return lines.join('\n');
  }

  const lines: string[] = [
    `=== Fable Full Neural Graph (${graph.nodes.length} nodes, ${graph.edges.length} connections) ===`,
    '',
  ];

  for (const node of graph.nodes) {
    const conn = getNeuralConnections(node.id, graph);
    const nextList = conn.continuations.join(', ') || 'none';
    lines.push(`• ${node.id.padEnd(18)} [${node.pack.padEnd(12)}] --> next: [${nextList}]`);
  }

  return lines.join('\n');
}
