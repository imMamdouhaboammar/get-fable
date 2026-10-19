/**
 * Component Tree and Surface Manager for Harness² in get-fable.
 *
 * Implements the c1..c8 editable surface:
 *   c1: System Prompt (systemprompt.md / AGENTS.md)
 *   c2: Guardrails (guardrails.md)
 *   c3: Long-Term Memory (LongTermMEMORY.md)
 *   c4: Tool Guidance (tool_descriptions/tool_guidance.md)
 *   c5: Skills (skills/<name>/SKILL.md)
 *   c6: Subagents (sub_agents/<name>/AGENT.md)
 *   c7: Scripts (scripts/<name>.py or scripts/<name>.sh)
 *   c8: Plugins (plugins/<name>.ts or hooks)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  HarnessComponentKind,
  HarnessSubstrateKind,
  HarnessTree,
  SurfaceSpec,
} from './types.js';

export const OPENCODE_SURFACE: SurfaceSpec = {
  name: 'opencode',
  alwaysOn: [
    'systemprompt.md',
    'guardrails.md',
    'LongTermMEMORY.md',
    'tool_descriptions/tool_guidance.md',
  ],
  alwaysOnMax: 24_000,
  alwaysOnCapReason: "every token in always-on competes with the agent's output budget",
  skillDir: 'skills',
  skillNameRule: 'must_match',
  triggerHint:
    'Add a trigger line to systemprompt.md or guardrails.md, e.g. "When <situation>, load the `<name>` skill."',
  autotriggerFile: 'guardrails.md',
  triggerLine: '- When {desc}, load the `{name}` skill.\n',
  subagentRequiresMode: true,
  pluginDir: 'plugins',
  hooksFile: null,
  hookEvents: ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop'],
};

export const CODEX_SURFACE: SurfaceSpec = {
  name: 'codex',
  alwaysOn: ['AGENTS.md'],
  alwaysOnMax: 8_000,
  alwaysOnCapReason: 'AGENTS.md is injected whole into every turn and truncated by host limits',
  skillDir: '.agents/skills',
  skillNameRule: 'overrides_dir',
  triggerHint:
    'Add a trigger line to AGENTS.md, e.g. "When <situation>, read .agents/skills/{name}/SKILL.md and follow it."',
  autotriggerFile: 'AGENTS.md',
  triggerLine: '- When {desc}, read .agents/skills/{name}/SKILL.md and follow it.\n',
  subagentRequiresMode: false,
  pluginDir: null,
  hooksFile: '.codex/hooks.json',
  hookEvents: ['PreToolUse', 'PostToolUse'],
};

export const FABLE_SURFACE: SurfaceSpec = {
  name: 'fable',
  alwaysOn: ['AGENTS.md', '.fable/LEDGER.md'],
  alwaysOnMax: 32_000,
  alwaysOnCapReason: 'Fable lifecycle context is dynamically injected per phase',
  skillDir: 'skills',
  skillNameRule: 'must_match',
  triggerHint: 'Register skill in skills/get-fable/registry.json',
  autotriggerFile: 'AGENTS.md',
  triggerLine: '- When {desc}, route to `{name}`.\n',
  subagentRequiresMode: false,
  pluginDir: 'hooks',
  hooksFile: '.fable/state.json',
  hookEvents: ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop'],
};

export function getSurfaceSpec(substrate: HarnessSubstrateKind): SurfaceSpec {
  switch (substrate) {
    case 'opencode':
      return OPENCODE_SURFACE;
    case 'codex':
      return CODEX_SURFACE;
    case 'fable':
    default:
      return FABLE_SURFACE;
  }
}

export function classifyComponent(filePath: string): HarnessComponentKind {
  const norm = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (norm === 'systemprompt.md' || norm === 'AGENTS.md') return 'c1_systemprompt';
  if (norm === 'guardrails.md') return 'c2_guardrails';
  if (norm === 'LongTermMEMORY.md' || norm.includes('memory') || norm.includes('MEMORY'))
    return 'c3_memory';
  if (norm.startsWith('tool_descriptions/') || norm.includes('tool_guidance'))
    return 'c4_tool_guidance';
  if (norm.startsWith('skills/') || norm.startsWith('.agents/skills/')) return 'c5_skills';
  if (norm.startsWith('sub_agents/') || norm.startsWith('.agents/sub_agents/'))
    return 'c6_subagents';
  if (norm.startsWith('scripts/')) return 'c7_scripts';
  if (norm.startsWith('plugins/') || norm.startsWith('hooks/') || norm.endsWith('.json'))
    return 'c8_plugins';
  return 'c1_systemprompt';
}

export function normalizeRelPath(rel: string): string {
  const normalized = rel.trim().replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new Error(`Path escapes the harness boundaries: ${rel}`);
  }
  return normalized.replace(/^\.\//, '');
}

export function isPathAllowedOnSurface(surface: SurfaceSpec, relPath: string): boolean {
  try {
    const norm = normalizeRelPath(relPath);
    if (surface.alwaysOn.includes(norm)) return true;
    if (surface.hooksFile && norm === surface.hooksFile) return true;
    if (norm.startsWith(`${surface.skillDir}/`)) return true;
    if (norm.startsWith('sub_agents/') || norm.startsWith('.agents/sub_agents/')) return true;
    if (norm.startsWith('scripts/')) return true;
    if (surface.pluginDir && norm.startsWith(`${surface.pluginDir}/`)) return true;
    return false;
  } catch {
    return false;
  }
}

export function checkAlwaysOnBudget(
  surface: SurfaceSpec,
  tree: HarnessTree
): { ok: boolean; totalBytes: number; maxBytes: number; reason: string } {
  let totalBytes = 0;
  for (const file of surface.alwaysOn) {
    if (tree[file]) {
      totalBytes += Buffer.byteLength(tree[file], 'utf-8');
    }
  }
  return {
    ok: totalBytes <= surface.alwaysOnMax,
    totalBytes,
    maxBytes: surface.alwaysOnMax,
    reason: surface.alwaysOnCapReason,
  };
}

export function diffHarnessTrees(
  base: HarnessTree,
  target: HarnessTree
): Record<string, 'added' | 'modified' | 'deleted' | 'retained'> {
  const result: Record<string, 'added' | 'modified' | 'deleted' | 'retained'> = {};
  const allKeys = new Set([...Object.keys(base), ...Object.keys(target)]);

  for (const key of allKeys) {
    if (!(key in base)) {
      result[key] = 'added';
    } else if (!(key in target)) {
      result[key] = 'deleted';
    } else if (base[key] !== target[key]) {
      result[key] = 'modified';
    } else {
      result[key] = 'retained';
    }
  }

  return result;
}

export function applyProposalToTree(
  baseTree: HarnessTree,
  edits: Record<string, string>,
  deletedPaths?: string[]
): HarnessTree {
  const next: HarnessTree = { ...baseTree };
  for (const [p, content] of Object.entries(edits)) {
    next[normalizeRelPath(p)] = content;
  }
  if (deletedPaths) {
    for (const p of deletedPaths) {
      delete next[normalizeRelPath(p)];
    }
  }
  return next;
}

export function readWorkspaceHarnessTree(workspaceDir: string, surface: SurfaceSpec): HarnessTree {
  const tree: HarnessTree = {};

  function scan(dir: string, baseDir: string): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.venv') {
          continue;
        }
        scan(fullPath, baseDir);
      } else if (entry.isFile()) {
        if (isPathAllowedOnSurface(surface, relPath)) {
          tree[relPath] = fs.readFileSync(fullPath, 'utf-8');
        }
      }
    }
  }

  scan(workspaceDir, workspaceDir);
  return tree;
}
