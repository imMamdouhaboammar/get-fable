import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { addEvidence, createInitialState, recordMutation, transitionState } from '../src/core/state.ts';
import { routeTask } from '../src/core/task-router.ts';

const root = path.resolve(import.meta.dir, '..');
const suite = JSON.parse(
  fs.readFileSync(path.join(root, 'eval', 'scenarios', 'lifecycle-v2.json'), 'utf-8')
);

describe('lifecycle v2 eval scenarios', () => {
  for (const scenario of suite.scenarios.filter((item: any) => item.task)) {
    test(`routes ${scenario.id}`, () => {
      expect(routeTask(scenario.task).selectedSkill).toBe(scenario.expectedSkill);
    });
  }

  test('receipt and research evidence cannot close substantial work', () => {
    for (const kind of ['receipt', 'research'] as const) {
      const initial = createInitialState('2026-08-19T00:00:00.000Z');
      const executing = transitionState({ ...initial, substantial: true }, 'executing');
      const verifying = transitionState(executing, 'verifying');
      const recorded = addEvidence(verifying, {
        kind,
        source: 'eval',
        result: 'pass',
        detail: `${kind} exists`,
      });
      expect(() => transitionState(recorded, 'complete')).toThrow('current mutation generation');
    }
  });

  test('a newer mutation stales old proof and fresh proof restores completion', () => {
    const initial = createInitialState('2026-08-19T00:00:00.000Z');
    const executing = transitionState({ ...initial, substantial: true }, 'executing');
    const verifying = transitionState(executing, 'verifying');
    const verified = addEvidence(verifying, {
      kind: 'test',
      source: 'eval test',
      result: 'pass',
      detail: 'generation zero passed',
    });
    const mutated = recordMutation(verified, '2026-08-19T00:01:00.000Z');
    expect(() => transitionState(mutated, 'complete')).toThrow('current mutation generation');

    const current = addEvidence(mutated, {
      kind: 'runtime',
      source: 'eval smoke',
      result: 'pass',
      detail: 'current generation passed',
    });
    expect(transitionState(current, 'complete').phase).toBe('complete');
  });
});
