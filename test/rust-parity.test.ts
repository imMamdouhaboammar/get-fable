import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { routeTask } from '../src/core/task-router.ts';
import { readFableState } from '../src/core/state.ts';

const NATIVE_BIN = path.resolve(__dirname, '..', 'target', 'release', 'get-fable-native');
const hasNativeBin = fs.existsSync(NATIVE_BIN);

describe.skipIf(!hasNativeBin)('Rust Core Engine Parity (get-fable-native)', () => {
  test('Native release binary exists and is executable', () => {
    expect(hasNativeBin).toBe(true);
    const stat = fs.statSync(NATIVE_BIN);
    expect(stat.isFile()).toBe(true);
  });

  test('Status command outputs valid JSON matching TypeScript state reader', () => {
    const output = execFileSync(NATIVE_BIN, ['status', '--json'], { encoding: 'utf-8' });
    const nativeState = JSON.parse(output);

    const tsState = readFableState(process.cwd());
    expect(tsState).not.toBeNull();

    expect(nativeState.schemaVersion).toBe(tsState!.schemaVersion);
    expect(nativeState.workspaceId).toBe(tsState!.workspaceId);
    expect(nativeState.phase).toBe(tsState!.phase);
    expect(nativeState.mutationGeneration).toBe(tsState!.mutationGeneration);
    expect(nativeState.substantial).toBe(tsState!.substantial);
  });

  const TEST_SCENARIOS = [
    {
      task: 'audit the authentication endpoints and oauth for injection vulnerability',
      expectedSkill: 'fable-security',
      expectedPack: 'proof',
      expectedShape: 'security',
    },
    {
      task: 'conduct an ethical redteam penetration test and attack graph probe',
      expectedSkill: 'fable-redteam',
      expectedPack: 'proof',
      expectedShape: 'security',
    },
    {
      task: 'prepare release tag and create pr for merge',
      expectedSkill: 'fable-release',
      expectedPack: 'delivery',
      expectedShape: 'release',
    },
    {
      task: 'create durable context handoff to continue next session',
      expectedSkill: 'fable-handoff',
      expectedPack: 'delivery',
      expectedShape: 'handoff',
    },
    {
      task: 'verify that all unit tests pass with fresh completion evidence',
      expectedSkill: 'fable-verify',
      expectedPack: 'core',
      expectedShape: 'review',
    },
    {
      task: 'inspect repository architecture and find where router handles requests',
      expectedSkill: 'fable-discover',
      expectedPack: 'core',
      expectedShape: 'unknown',
    },
    {
      task: 'plan the multi-file refactoring and migration of core modules',
      expectedSkill: 'fable-plan',
      expectedPack: 'core',
      expectedShape: 'architecture',
    },
    {
      task: 'fix the bug where router crashes on empty input with failing test first',
      expectedSkill: 'fable-tdd',
      expectedPack: 'build',
      expectedShape: 'bug-fix',
    },
    {
      task: 'clean up dead code and simplify duplicate helper functions',
      expectedSkill: 'fable-simplify',
      expectedPack: 'system',
      expectedShape: 'bounded-change',
    },
    {
      task: 'evaluate microservices architecture vectors and decouple domain services',
      expectedSkill: 'fable-architecture',
      expectedPack: 'system',
      expectedShape: 'architecture',
    },
  ];

  for (const scenario of TEST_SCENARIOS) {
    test(`Routing Parity for: "${scenario.task.slice(0, 40)}..."`, () => {
      // 1. Run TypeScript router
      const tsDecision = routeTask(scenario.task);

      // 2. Run Rust native router
      const nativeOutput = execFileSync(NATIVE_BIN, ['route', scenario.task, '--json'], {
        encoding: 'utf-8',
      });
      const nativeDecision = JSON.parse(nativeOutput);

      // 3. Compare parity
      expect(nativeDecision.selectedSkill).toBe(tsDecision.selectedSkill);
      expect(nativeDecision.selectedPack).toBe(tsDecision.selectedPack);
      expect(nativeDecision.taskShape).toBe(tsDecision.taskShape);
      expect(nativeDecision.requiresPlan).toBe(tsDecision.requiresPlan);
      expect(nativeDecision.fallbackSkill).toBe(tsDecision.fallbackSkill);
      expect(nativeDecision.requiredGates).toEqual(tsDecision.requiredGates);
      expect(nativeDecision.nextSkills).toEqual(tsDecision.nextSkills);

      // Assert matches expected target
      expect(nativeDecision.selectedSkill).toBe(scenario.expectedSkill);
      expect(nativeDecision.selectedPack).toBe(scenario.expectedPack);
      expect(nativeDecision.taskShape).toBe(scenario.expectedShape);
    });
  }
});
