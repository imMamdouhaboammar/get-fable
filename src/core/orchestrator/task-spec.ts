/**
 * Declarative Task Specification Parser for Fable Orchestrator.
 *
 * Grounded in:
 * - Google AX: Declarative Task/Workspace CRDs
 * - DeepCode: Plan Validation & Minimal Plan Coercion
 */

import type {
  AcceptancePredicate,
  OrchestratedTaskSpec,
  TaskRoleAssignment,
  WorkspaceStrategy,
} from './types.js';

export function parseYamlSimple(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  const stack: Array<{ obj: Record<string, unknown>; indent: number; key?: string }> = [
    { obj: result, indent: -1 },
  ];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = rawLine.search(/\S/);

    // Unwind stack if indent decreased
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const top = stack[stack.length - 1];
    let current = top.obj;

    // Handle list item
    if (trimmed.startsWith('- ')) {
      const listContent = trimmed.slice(2).trim();

      // If top object in stack was created as an empty dict for a key, convert it to an array on parent
      if (stack.length > 1 && top.key && Object.keys(current).length === 0) {
        const parent = stack[stack.length - 2].obj;
        if (!Array.isArray(parent[top.key])) {
          parent[top.key] = [];
        }
        current = parent[top.key] as unknown as Record<string, unknown>;
        top.obj = current;
      }

      if (listContent.includes(':')) {
        const colonIdx = listContent.indexOf(':');
        const k = listContent.slice(0, colonIdx).trim();
        const v = parseValue(listContent.slice(colonIdx + 1).trim());
        const itemObj: Record<string, unknown> = { [k]: v };
        if (Array.isArray(current)) {
          current.push(itemObj);
        }
        stack.push({ obj: itemObj, indent, key: k });
      } else {
        if (Array.isArray(current)) {
          current.push(parseValue(listContent));
        }
      }
      continue;
    }

    // Key-value pair
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim();
      const valStr = trimmed.slice(colonIdx + 1).trim();

      if (valStr === '' || valStr.startsWith('#')) {
        // Nested object
        const nested: Record<string, unknown> = {};
        current[key] = nested;
        stack.push({ obj: nested, indent, key });
      } else {
        current[key] = parseValue(valStr);
      }
    }
  }

  return result;
}

function parseValue(val: string): unknown {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
  if (val.startsWith('[') && val.endsWith(']')) {
    const inner = val.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((s) => parseValue(s.trim()));
  }
  return val;
}

export function validateTaskSpec(spec: unknown): string[] {
  const errors: string[] = [];
  if (!spec || typeof spec !== 'object') {
    return ['Specification must be a non-null object'];
  }

  const s = spec as Record<string, unknown>;
  if (s.apiVersion !== 'fable.io/v1alpha1') {
    errors.push('apiVersion must be fable.io/v1alpha1');
  }
  if (s.kind !== 'OrchestratedTask') {
    errors.push('kind must be OrchestratedTask');
  }

  const metadata = s.metadata as Record<string, unknown> | undefined;
  if (!metadata || typeof metadata.name !== 'string' || !metadata.name.trim()) {
    errors.push('metadata.name must be a non-empty string');
  }

  const taskSpec = s.spec as Record<string, unknown> | undefined;
  if (!taskSpec || typeof taskSpec.goal !== 'string' || !taskSpec.goal.trim()) {
    errors.push('spec.goal must be a non-empty string');
  }

  if (taskSpec?.budget) {
    const budget = taskSpec.budget as Record<string, unknown>;
    if (budget.maxTurns !== undefined && (typeof budget.maxTurns !== 'number' || budget.maxTurns <= 0)) {
      errors.push('spec.budget.maxTurns must be a positive number');
    }
    if (budget.maxCostUsd !== undefined && (typeof budget.maxCostUsd !== 'number' || budget.maxCostUsd < 0)) {
      errors.push('spec.budget.maxCostUsd must be non-negative');
    }
  }

  return errors;
}

export function parseTaskSpec(content: string): OrchestratedTaskSpec {
  let raw: Record<string, unknown>;
  const trimmed = content.trim();

  if (trimmed.startsWith('{')) {
    try {
      raw = JSON.parse(trimmed);
    } catch (e: unknown) {
      throw new Error(`Invalid JSON task specification: ${(e as Error).message}`);
    }
  } else {
    raw = parseYamlSimple(trimmed);
  }

  const errors = validateTaskSpec(raw);
  if (errors.length > 0) {
    throw new Error(`Invalid task specification:\n- ${errors.join('\n- ')}`);
  }

  const specObj = raw.spec as Record<string, unknown>;
  const metaObj = raw.metadata as Record<string, unknown>;

  const acceptanceObj = (specObj.acceptance || {}) as Record<string, unknown>;
  const rawPredicates = (acceptanceObj.predicates || []) as Array<Record<string, unknown>>;
  const predicates: AcceptancePredicate[] = rawPredicates.map((p) => ({
    command: String(p.command || ''),
    mustPass: p.mustPass !== false,
    timeoutMs: p.timeoutMs ? Number(p.timeoutMs) : undefined,
    expectedStdoutPattern: p.expectedStdoutPattern ? String(p.expectedStdoutPattern) : undefined,
  }));

  const rolesObj = (specObj.roles || {}) as Record<string, unknown>;
  const roles: OrchestratedTaskSpec['spec']['roles'] = {};

  for (const roleName of ['architect', 'implementer', 'reviewer'] as const) {
    if (rolesObj[roleName]) {
      const r = rolesObj[roleName] as Record<string, unknown>;
      roles[roleName] = {
        tier: (r.tier as TaskRoleAssignment['tier']) || 'standard',
        skills: Array.isArray(r.skills) ? (r.skills as string[]).map((s) => s as TaskRoleAssignment['skills'][number]) : [],
        model: r.model ? String(r.model) : undefined,
        reasoningEffort: r.reasoningEffort as TaskRoleAssignment['reasoningEffort'],
      };
    }
  }

  const workspaceObj = (specObj.workspace || {}) as Record<string, unknown>;
  const workspace: OrchestratedTaskSpec['spec']['workspace'] = {
    strategy: (workspaceObj.strategy as WorkspaceStrategy) || 'inplace',
    baseRef: workspaceObj.baseRef ? String(workspaceObj.baseRef) : undefined,
    worktreeDir: workspaceObj.worktreeDir ? String(workspaceObj.worktreeDir) : undefined,
  };

  const budgetObj = (specObj.budget || {}) as Record<string, unknown>;

  return {
    apiVersion: 'fable.io/v1alpha1',
    kind: 'OrchestratedTask',
    metadata: {
      name: String(metaObj.name),
      createdAt: metaObj.createdAt ? String(metaObj.createdAt) : new Date().toISOString(),
      labels: (metaObj.labels as Record<string, string>) || {},
    },
    spec: {
      goal: String(specObj.goal),
      workspace,
      budget: {
        maxTurns: budgetObj.maxTurns ? Number(budgetObj.maxTurns) : 30,
        maxCostUsd: budgetObj.maxCostUsd ? Number(budgetObj.maxCostUsd) : 5.0,
        timeoutSeconds: budgetObj.timeoutSeconds ? Number(budgetObj.timeoutSeconds) : 1800,
      },
      roles,
      acceptance: {
        predicates,
      },
    },
  };
}

export function coerceGoalToTaskSpec(goalText: string): OrchestratedTaskSpec {
  const goal = goalText.trim();
  if (!goal) throw new Error('Task goal cannot be empty');

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const taskName = `task-${randomSuffix}`;

  return {
    apiVersion: 'fable.io/v1alpha1',
    kind: 'OrchestratedTask',
    metadata: {
      name: taskName,
      createdAt: new Date().toISOString(),
      labels: { origin: 'conversational-ingress' },
    },
    spec: {
      goal,
      workspace: {
        strategy: 'inplace',
        baseRef: 'HEAD',
      },
      budget: {
        maxTurns: 20,
        maxCostUsd: 2.0,
        timeoutSeconds: 900,
      },
      roles: {
        architect: {
          tier: 'pro',
          skills: ['fable-plan', 'fable-architecture'],
          reasoningEffort: 'high',
        },
        implementer: {
          tier: 'standard',
          skills: ['fable-execute', 'fable-tdd'],
          reasoningEffort: 'medium',
        },
        reviewer: {
          tier: 'standard',
          skills: ['fable-review', 'fable-anti-slop-engineering'],
          reasoningEffort: 'low',
        },
      },
      acceptance: {
        predicates: [
          {
            command: 'bun test',
            mustPass: true,
          },
        ],
      },
    },
  };
}
