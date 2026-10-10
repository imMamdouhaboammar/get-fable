import { describe, expect, test } from 'bun:test';
import { canonicalSkillIds, getSkillEntry, loadSkillRegistry } from '../src/core/skill-registry.js';
import {
  POLICY_OVERLAY_SKILLS,
  SKILL_BOUNDARY_CONTRASTS,
  buildSkillSelectionCriteria,
  buildSubagentSkillArmingPrompt,
} from '../src/core/reflex/question-builder.js';
import {
  FABLE_MYTHOS_EXPERT_CATALOG,
  routeMythosExperts,
} from '../src/core/mythos/moe-moda-router.js';
import {
  SPARK_SPECIALIST_NEXT_MOVES,
  evaluateFableSpark,
} from '../src/core/spark.js';
import { createInitialState } from '../src/core/state.js';
import {
  compileFableDirective,
  compileFableDirectiveWithJev,
} from '../src/core/prompt-compiler.js';
import {
  decomposeTaskIntoSubtasks,
  evaluateIndependenceProof,
  executeDelegationWavePlanWithGrpc,
  orchestrateSubagentsWithJev,
  scoreAllSkillsForSubtask,
  selectLifecycleEnginesForSkill,
} from '../src/core/orchestrator/index.js';
import { decodeDelegationContract, decodeToon, encodeToon, validateToon } from '../src/core/toon.js';
import { FableWorkerServer } from '../src/rpc/index.js';
import type { FableRpcServerOptions } from '../src/rpc/types.js';

describe('42-Skill Ecosystem, Jev Reflex, OpenMythos MoE, Spark & Lifecycle Orchestrator Suite', () => {
  const registry = loadSkillRegistry();
  const allSkillIds = canonicalSkillIds(registry);

  test('canonical skill registry has exactly 42 skills', () => {
    expect(allSkillIds.length).toBe(42);
  });

  describe('1. Complete 42-Skill SKILL_BOUNDARY_CONTRASTS & Jev Arming Prompt', () => {
    test('every one of the 42 canonical skills has crisp positive/negative boundary contrasts', () => {
      expect(Object.keys(SKILL_BOUNDARY_CONTRASTS).length).toBe(42);

      for (const skillId of allSkillIds) {
        const contrast = SKILL_BOUNDARY_CONTRASTS[skillId];
        expect(contrast).toBeDefined();
        expect(contrast!.useWhen).toContain('Select ONLY when');
        expect(contrast!.notWhen).toContain('NOT for');
        expect(contrast!.useWhen.length).toBeGreaterThan(20);
        expect(contrast!.notWhen.length).toBeGreaterThan(15);
      }

      const criteria = buildSkillSelectionCriteria(registry);
      for (const skillId of allSkillIds) {
        if (skillId === 'get-fable') continue;
        expect(criteria[skillId]).toContain('Use when: Select ONLY when');
        expect(criteria[skillId]).toContain('Not when: NOT for');
      }
    });

    test('buildSubagentSkillArmingPrompt builds TypeSafe Jev choice and score questions for overlay skills', () => {
      const prompt = buildSubagentSkillArmingPrompt(
        {
          id: 'sub-1',
          title: 'Fix authentication token refresh bug with regression test',
          description: 'Write failing test and fix token refresh in src/auth.ts',
          writeScope: ['src/auth.ts', 'test/auth.test.ts'],
        },
        'fable-tdd',
        POLICY_OVERLAY_SKILLS,
        registry
      );

      expect(prompt.primarySkill).toBe('fable-tdd');
      expect(prompt.candidateOverlaySkills).toEqual([...POLICY_OVERLAY_SKILLS]);
      expect(prompt.questions.primary_overlay_choice).toBeDefined();
      expect(prompt.questions.primary_overlay_choice!.type).toBe('choice');

      for (const overlayId of POLICY_OVERLAY_SKILLS) {
        const scoreQ = prompt.questions[`score_${overlayId}`];
        expect(scoreQ).toBeDefined();
        expect(scoreQ!.type).toBe('score');
      }
    });
  });

  describe('2. Complete 42-Skill FABLE_MYTHOS_EXPERT_CATALOG', () => {
    test('represents all 42 canonical skills with paradigms, domainKeywords, attentionHeadWeight, and capacityFactor', () => {
      expect(FABLE_MYTHOS_EXPERT_CATALOG.length).toBe(42);

      const catalogIds = new Set(FABLE_MYTHOS_EXPERT_CATALOG.map((e) => e.skillId));
      for (const skillId of allSkillIds) {
        expect(catalogIds.has(skillId)).toBe(true);
        const expert = FABLE_MYTHOS_EXPERT_CATALOG.find((e) => e.skillId === skillId)!;
        const regEntry = getSkillEntry(skillId, registry);

        expect(expert.id).toBe(skillId);
        expect(expert.pack).toBe(regEntry.pack);
        expect(expert.paradigms.length).toBeGreaterThanOrEqual(1);
        for (const p of expert.paradigms) {
          expect(['Depth', 'Breadth', 'Coil', 'Mesh']).toContain(p);
        }
        expect(expert.domainKeywords.length).toBeGreaterThanOrEqual(3);
        expect(expert.attentionHeadWeight).toBeGreaterThan(0.5);
        expect(expert.attentionHeadWeight).toBeLessThanOrEqual(1.0);
        expect(expert.capacityFactor).toBeGreaterThanOrEqual(1.0);
        expect(expert.domainVector.length).toBe(16);
      }

      const route = routeMythosExperts({
        task: 'apply fable-wise paperthin and strip slop from drifted artifact',
        topK: 4,
      });
      expect(route.routedExperts.map((r) => r.expertId)).toContain('fable-wise');
    });
  });

  describe('3. Complete 42-Skill SPARK_SPECIALIST_NEXT_MOVES', () => {
    test('defines specialist next moves for all 42 skills and predicts moves during active phases', () => {
      expect(Object.keys(SPARK_SPECIALIST_NEXT_MOVES).length).toBe(42);

      const baseState = createInitialState('2026-10-10T00:00:00.000Z', '/workspace/demo');

      for (const skillId of allSkillIds) {
        const entry = SPARK_SPECIALIST_NEXT_MOVES[skillId];
        expect(entry).toBeDefined();
        const words = entry!.command.trim().split(/\s+/);
        expect(words.length).toBeGreaterThanOrEqual(2);
        expect(words.length).toBeLessThanOrEqual(12);
        expect(entry!.rationale.length).toBeGreaterThan(15);

        const activePhase =
          getSkillEntry(skillId, registry).phase === 'idle' ||
          getSkillEntry(skillId, registry).phase === 'recovering'
            ? 'executing'
            : getSkillEntry(skillId, registry).phase;

        const spark = evaluateFableSpark({
          state: {
            ...baseState,
            phase: activePhase,
            currentSkill: skillId,
            mutationGeneration: 0,
            verifiedGeneration: 0,
            evidence: [],
          },
          openCards: ['card-1', 'card-2'],
        });

        expect(spark.silent).toBe(false);
        expect(spark.suggestion).not.toBeNull();
        expect(spark.confidence).toBeGreaterThanOrEqual(0.85);
      }
    });
  });

  describe('4. Async Jev Prompt Compiler with Co-Armed Policy Overlays', () => {
    test('compileFableDirectiveWithJev arms primary skill, co-armed policy overlays, and OpenMythos MoE routing', async () => {
      const syncCompiled = compileFableDirective('write a failing regression test and fix the auth bug');
      expect(syncCompiled.decision.selectedSkill).toBe('fable-tdd');

      const asyncCompiled = await compileFableDirectiveWithJev(
        'write a failing regression test and fix the auth bug',
        { maxOverlaySkills: 3 }
      );

      expect(asyncCompiled.decision.selectedSkill).toBe('fable-tdd');
      expect(asyncCompiled.coArmedOverlaySkills).toBeDefined();
      expect(asyncCompiled.coArmedOverlaySkills!.length).toBe(3);
      expect(asyncCompiled.coArmedOverlaySkills).toContain('fable-scope-discipline');
      expect(asyncCompiled.coArmedOverlaySkills).toContain('fable-native-code');
      expect(asyncCompiled.mythosRoute).toBeDefined();
      expect(asyncCompiled.systemPrompt).toContain('## Co-armed policy overlay skills');
      expect(asyncCompiled.systemPrompt).toContain('## OpenMythos MoE expert routing');
    });
  });

  describe('5. Subagent Orchestrator: Decomposition, 3 Delegation Laws, and Full Bundle Arming', () => {
    test('decomposes multi-part tasks and runs parallel wave when all 3 Delegation Laws hold', async () => {
      const plan = await orchestrateSubagentsWithJev(
        '1. Write a failing regression test and fix bug in src/core/spark.ts\n2. Perform independent code review on diff in src/core/review/ocr-engine.ts\n3. Audit security trust boundary and injection checks in src/core/proxy.ts',
        { preferNative: false }
      );

      expect(plan.totalSubtasks).toBe(3);
      expect(plan.totalWaves).toBe(1);
      expect(plan.waves[0]!.parallel).toBe(true);
      expect(plan.waves[0]!.independenceProof.writeIndependent).toBe(true);
      expect(plan.waves[0]!.independenceProof.semanticIndependent).toBe(true);
      expect(plan.waves[0]!.independenceProof.verificationIndependent).toBe(true);

      const bundles = plan.waves[0]!.bundles;
      expect(bundles.length).toBe(3);

      // Bundle 0: TDD
      expect(bundles[0]!.primarySkill.skillId).toBe('fable-tdd');
      expect(bundles[0]!.subagentId).toBe('executor');
      expect(bundles[0]!.armedEngines).toContain('test-value');
      expect(bundles[0]!.armedTools).toContain('terminal-execution');

      // Bundle 1: Review
      expect(bundles[1]!.primarySkill.skillId).toBe('fable-review');
      expect(bundles[1]!.subagentId).toBe('reviewer');
      expect(bundles[1]!.armedEngines).toContain('review/jev');

      // Bundle 2: Security
      expect(bundles[2]!.primarySkill.skillId).toBe('fable-security');
      expect(bundles[2]!.subagentId).toBe('security-auditor');
      expect(bundles[2]!.armedEngines).toContain('reflex/recipes-bridge');

      for (const bundle of bundles) {
        expect(bundle.coArmedSkills.length).toBeGreaterThanOrEqual(1);
        expect(bundle.coArmedSkills.length).toBeLessThanOrEqual(3);
        expect(bundle.failureLessons.length).toBeGreaterThanOrEqual(1);
        expect(bundle.compiledSkillExcerpt.length).toBeGreaterThan(50);

        const toonCheck = validateToon(bundle.toonContract);
        expect(toonCheck.valid).toBe(true);
        const decodedContract = decodeDelegationContract(bundle.toonContract);
        expect(decodedContract.ownedPaths).toEqual(bundle.subtask.writeScope);
      }

      expect(validateToon(plan.toonSummary).valid).toBe(true);
    });

    test('enforces the 3 Delegation Laws by serializing overlapping write scopes and shared contracts into sequential waves', () => {
      const plan = orchestrateSubagentsWithJev('Modify shared router and types', {
        preferNative: false,
        subtasks: [
          {
            id: 'card-a',
            title: 'Update router logic',
            description: 'Implement new routing rule in src/core/task-router.ts',
            writeScope: ['src/core/task-router.ts'],
            sharedContracts: ['RoutingDecision'],
            verificationCmd: 'bun test test/router.test.ts',
          },
          {
            id: 'card-b',
            title: 'Refactor same router file',
            description: 'Simplify scoring in src/core/task-router.ts',
            writeScope: ['src/core/task-router.ts'],
            sharedContracts: ['RoutingDecision'],
            verificationCmd: 'bun test test/router-policy-v2.test.ts',
          },
          {
            id: 'card-c',
            title: 'Add dataviz chart component',
            description: 'Render accessible dataviz svg chart in src/ui/chart.ts',
            writeScope: ['src/ui/chart.ts'],
            sharedContracts: ['ChartViewportSpec'],
            verificationCmd: 'bun test test/ui-polish.test.ts',
          },
        ],
      });

      // card-a and card-b conflict on writeScope AND sharedContracts, so they must be in separate waves.
      // card-c is disjoint from card-a, so wave 0 gets [card-a, card-c] (parallel: true) and wave 1 gets [card-b] (parallel: false).
      expect(plan.totalSubtasks).toBe(3);
      expect(plan.totalWaves).toBe(2);
      expect(plan.waves[0]!.bundles.map((b) => b.subtask.id)).toEqual(['card-a', 'card-c']);
      expect(plan.waves[0]!.parallel).toBe(true);
      expect(plan.waves[1]!.bundles.map((b) => b.subtask.id)).toEqual(['card-b']);
      expect(plan.waves[1]!.parallel).toBe(false);

      // Direct independence check on conflicting pair must report false
      const directProof = evaluateIndependenceProof(
        decomposeTaskIntoSubtasks('', [
          {
            id: 'card-a',
            description: 'Edit router',
            writeScope: ['src/core/task-router.ts'],
            sharedContracts: ['RoutingDecision'],
          },
          {
            id: 'card-b',
            description: 'Edit router again',
            writeScope: ['src/core/task-router.ts'],
            sharedContracts: ['RoutingDecision'],
          },
        ])
      );
      expect(directProof.writeIndependent).toBe(false);
      expect(directProof.semanticIndependent).toBe(false);
      expect(directProof.conflicts.length).toBeGreaterThanOrEqual(2);
    });

    test('scores all 42 skills using the 6-Factor Hybrid Scoring Engine and maps lifecycle engine hooks', () => {
      const [subtask] = decomposeTaskIntoSubtasks(
        'Run fable-judge adversarial verification to detect weakened tests and hunt frauds'
      );
      const scores = scoreAllSkillsForSubtask(subtask!);
      expect(scores.length).toBe(42);
      expect(scores[0]!.skillId).toBe('fable-judge');
      expect(scores[0]!.totalScore).toBeGreaterThan(0.75);

      expect(selectLifecycleEnginesForSkill('fable-tdd')).toContain('test-value');
      expect(selectLifecycleEnginesForSkill('fable-judge')).toContain('test-value');
      expect(selectLifecycleEnginesForSkill('fable-review')).toContain('review/jev');
      expect(selectLifecycleEnginesForSkill('fable-verify')).toContain('ui-polish');
      expect(selectLifecycleEnginesForSkill('fable-artifact')).toContain('ui-polish');
      expect(selectLifecycleEnginesForSkill('fable-recover')).toContain('reflex/recipes-bridge');
      expect(selectLifecycleEnginesForSkill('fable-security')).toContain('reflex/recipes-bridge');
      expect(selectLifecycleEnginesForSkill('fable-discover')).toContain('reflex/recipes-bridge');
    });
  });

  describe('6. Live gRPC Wave Execution (executeDelegationWavePlanWithGrpc)', () => {
    const explicitTaskRuns: string[] = [];
    // Transport fixture. A real deployment must inject a genuine executor.
    const fixtureTaskHandler: NonNullable<FableRpcServerOptions['taskHandler']> = async (
      request,
      emitEvent
    ) => {
      explicitTaskRuns.push(request.task_id);
      const returnPacketToon = encodeToon({
        returnPacket: {
          workerId: request.parameters?.workerId || 'fixture-worker',
          subtaskId: request.task_id,
          primarySkill: request.parameters?.primarySkill || '',
          coArmedSkills: (request.parameters?.coArmedSkills || '').split(',').filter(Boolean),
          status: 'completed',
          verified: true,
        },
      });
      emitEvent({
        event_id: `fixture-${request.task_id}`,
        task_id: request.task_id,
        run_id: request.run_id,
        timestamp: Date.now(),
        event_type: 'completed',
        message: 'Explicit fixture handler executed (transport test)',
        payload_json: JSON.stringify({ success: true, returnPacketToon }),
        is_terminal: true,
      });
    };
    test('executes a multi-wave DelegationWavePlan over real gRPC with parallel wave concurrency, sequential wave ordering, and verified TOON return packets', async () => {
      const plan = await orchestrateSubagentsWithJev(
        'Execute multi-wave gRPC subagent plan across independent and dependent cards',
        {
          preferNative: false,
          subtasks: [
            {
              id: 'wave0-tdd',
              title: 'Write failing regression test for router',
              description: 'Write failing regression test and fix bug in src/core/task-router.ts',
              writeScope: ['src/core/task-router.ts'],
              sharedContracts: ['RoutingDecision'],
              verificationCmd: 'bun test test/router.test.ts',
            },
            {
              id: 'wave0-security',
              title: 'Audit proxy trust boundary',
              description: 'Audit security trust boundary and injection checks in src/core/proxy.ts',
              writeScope: ['src/core/proxy.ts'],
              sharedContracts: ['ProxyConfig'],
              verificationCmd: 'bun test test/router-security.test.ts',
            },
            {
              id: 'wave1-router-followup',
              title: 'Refine router telemetry after TDD fix',
              description: 'Implement router telemetry refinement in src/core/task-router.ts',
              writeScope: ['src/core/task-router.ts'],
              sharedContracts: ['RoutingDecision'],
              verificationCmd: 'bun test test/router-policy-v2.test.ts',
            },
          ],
        }
      );

      // Wave 0 has 2 independent subtasks (parallel: true), Wave 1 has 1 dependent subtask (parallel: false)
      expect(plan.totalWaves).toBe(2);
      expect(plan.waves[0]!.parallel).toBe(true);
      expect(plan.waves[0]!.bundles.map((b) => b.subtask.id)).toEqual([
        'wave0-tdd',
        'wave0-security',
      ]);
      expect(plan.waves[1]!.parallel).toBe(false);
      expect(plan.waves[1]!.bundles.map((b) => b.subtask.id)).toEqual([
        'wave1-router-followup',
      ]);

      const report = await executeDelegationWavePlanWithGrpc(plan, { taskHandler: fixtureTaskHandler });

      expect(report.task).toBe(plan.task);
      expect(report.ephemeralServerSpawned).toBe(true);
      expect(report.workerAddress).toMatch(/^127\.0\.0\.1:\d+$/);
      expect(report.totalWavesExecuted).toBe(2);
      expect(report.totalSubtasksExecuted).toBe(3);
      expect(report.allSucceeded).toBe(true);
      expect(report.receipts.length).toBe(3);
      expect(explicitTaskRuns).toEqual(expect.arrayContaining(['wave0-tdd', 'wave0-security', 'wave1-router-followup']));

      // Verify wave execution order: wave 0 receipts first, then wave 1 receipt
      expect(report.receipts[0]!.waveIndex).toBe(0);
      expect(report.receipts[1]!.waveIndex).toBe(0);
      expect(report.receipts[2]!.waveIndex).toBe(1);
      expect(report.receipts[2]!.subtaskId).toBe('wave1-router-followup');

      for (const receipt of report.receipts) {
        expect(receipt.status).toBe('completed');
        // Explicit handler emits completed after the transport's started event.
        expect(receipt.eventsCount).toBeGreaterThanOrEqual(2);
        expect(receipt.durationMs).toBeGreaterThanOrEqual(1);
        expect(receipt.coArmedSkills.length).toBeGreaterThanOrEqual(1);

        const packetValidation = validateToon(receipt.returnPacketToon);
        expect(packetValidation.valid).toBe(true);

        const decoded = decodeToon<{
          returnPacket: {
            workerId: string;
            subtaskId: string;
            primarySkill: string;
            coArmedSkills: string[];
            status: string;
            verified: boolean;
          };
        }>(receipt.returnPacketToon);

        expect(decoded.returnPacket).toBeDefined();
        expect(decoded.returnPacket.subtaskId).toBe(receipt.subtaskId);
        expect(decoded.returnPacket.primarySkill).toBe(receipt.primarySkillId);
        expect(decoded.returnPacket.status).toBe('completed');
        expect(decoded.returnPacket.verified).toBe(true);
      }

      const reportToonCheck = validateToon(report.toonReport);
      expect(reportToonCheck.valid).toBe(true);
    });

    test('never reports verified success for a plan without an actual executor', async () => {
      const plan = await orchestrateSubagentsWithJev('Audit the task before any mutation', {
        preferNative: false,
      });
      const report = await executeDelegationWavePlanWithGrpc(plan);
      expect(report.allSucceeded).toBe(false);
      expect(report.receipts.length).toBeGreaterThan(0);
      expect(report.receipts.every((receipt) => receipt.status === 'failed')).toBe(true);
      expect(report.receipts.every((receipt) => decodeToon<{
        returnPacket: { verified: boolean };
      }>(receipt.returnPacketToon).returnPacket.verified === false)).toBe(true);
    });

    test('connects to an explicit external FableWorkerServer when workerAddress is provided', async () => {
      const externalServer = new FableWorkerServer({ host: '127.0.0.1', port: 0, taskHandler: fixtureTaskHandler });
      const port = await externalServer.start();

      try {
        const plan = await orchestrateSubagentsWithJev(
          '1. Write failing test in src/core/spark.ts\n2. Audit security boundary in src/core/proxy.ts',
          { preferNative: false }
        );

        const report = await executeDelegationWavePlanWithGrpc(plan, {
          workerAddress: `127.0.0.1:${port}`,
        });

        expect(report.ephemeralServerSpawned).toBe(false);
        expect(report.workerAddress).toBe(`127.0.0.1:${port}`);
        expect(report.allSucceeded).toBe(true);
        expect(report.receipts.length).toBe(2);
        for (const receipt of report.receipts) {
          expect(receipt.status).toBe('completed');
          expect(validateToon(receipt.returnPacketToon).valid).toBe(true);
        }
      } finally {
        await externalServer.stop();
      }
    });
  });
});
