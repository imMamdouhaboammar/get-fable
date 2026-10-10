import { describe, expect, test } from 'bun:test';
import {
  FABLE_MYTHOS_EXPERT_CATALOG,
  MYTHOS_ARCHITECTURE_VARIANTS,
  OPEN_MYTHOS_REA_EVIDENCE_LEDGER,
  buildOpenMythosStudyReport,
  compressLatentContext,
  computeDepthLoraScale,
  computeLoopIndexEmbedding,
  computeLtiDiscreteOperator,
  computeModaAttention,
  computeMoeBalanceLoss,
  encodeTaskToLatent,
  evaluateMlaCompression,
  routeMythosExperts,
  runMythosRecurrentPipeline,
  stepActHaltingController,
  stepLtiStateUpdate,
  type MythosVariantId,
} from '../src/core/mythos/index.js';
import { runMythosCommand } from '../src/cli/commands/mythos.js';
import { runDoctor } from '../src/core/doctor.js';

describe('Fable Mythos Recurrent-Depth Engine (kyegomez/OpenMythos Clean-Room Upgrade)', () => {
  describe('1. REA Cryptographic Provenance Ledger', () => {
    test('attests upstream commit SHA, git-tree SHA, and all 7 verified artifacts', () => {
      expect(OPEN_MYTHOS_REA_EVIDENCE_LEDGER.sourceRepo).toBe(
        'https://github.com/kyegomez/OpenMythos'
      );
      expect(OPEN_MYTHOS_REA_EVIDENCE_LEDGER.commitSha).toBe(
        '155430a88d2a98322fc4c79b2a067792c3c9579a'
      );
      expect(OPEN_MYTHOS_REA_EVIDENCE_LEDGER.gitTreeSha).toBe(
        'e360623b4d887000dc11230efe6fd4e9b26ff8b6'
      );
      expect(OPEN_MYTHOS_REA_EVIDENCE_LEDGER.cleanRoomAdaptation).toBe(true);
      expect(OPEN_MYTHOS_REA_EVIDENCE_LEDGER.verifiedArtifacts.length).toBe(7);

      for (const art of OPEN_MYTHOS_REA_EVIDENCE_LEDGER.verifiedArtifacts) {
        expect(art.gitBlobSha1).toMatch(/^[0-9a-f]{40}$/);
        expect(art.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(art.bytes).toBeGreaterThan(0);
        expect(art.lines).toBeGreaterThan(0);
        expect(art.verifiedSymbols.length).toBeGreaterThan(0);
      }

      const mainPy = OPEN_MYTHOS_REA_EVIDENCE_LEDGER.verifiedArtifacts.find(
        (a) => a.path === 'open_mythos/main.py'
      );
      expect(mainPy?.gitBlobSha1).toBe('65b0fa829f5371d633d2c397bde5175aa73851b4');
      expect(mainPy?.sha256).toBe(
        '5c03daebcc0bafaf8cdb10d74ec1e31d999392affbc8ca067fc76e99a5d012c9'
      );

      const modaPy = OPEN_MYTHOS_REA_EVIDENCE_LEDGER.verifiedArtifacts.find(
        (a) => a.path === 'open_mythos/moda.py'
      );
      expect(modaPy?.gitBlobSha1).toBe('94f6af593f86410dd20c81510428f5055bd97931');
      expect(modaPy?.sha256).toBe(
        '335c76d353550cbd3bc409ecfae92141b1ab70265429e0f8e33ccdcb5cd06492'
      );
    });
  });

  describe('2. LTI-Stable ZOH Input Injection & Anchor Preservation', () => {
    test('guarantees spectral radius rho(A) < 1 and min(A) > 0 under normal and extreme parameters (CR-MYTHOS-02)', () => {
      const normalOp = computeLtiDiscreteOperator([-0.5, 0.0, 0.5, 1.2], [-2.0, -1.5, -1.0, -0.5]);
      expect(normalOp.strictlyStable).toBe(true);
      expect(normalOp.spectralRadius).toBeLessThan(1.0);
      expect(normalOp.minEigenvalue).toBeGreaterThan(0.0);

      // Extreme negative and positive values that would cause float32 exp(-exp(-20)) -> 1.0 without bounding
      const extremeOp = computeLtiDiscreteOperator(
        [-1000, -20, 0, 20, 1000],
        [-1000, -20, 0, 20, 1000]
      );
      expect(extremeOp.strictlyStable).toBe(true);
      expect(extremeOp.spectralRadius).toBeLessThan(1.0);
      expect(extremeOp.minEigenvalue).toBeGreaterThan(0.0);
      for (const a of extremeOp.aDiscrete) {
        expect(a).toBeGreaterThan(0);
        expect(a).toBeLessThan(1);
      }
    });

    test('continual Prelude anchor injection B(e) prevents latent drift over 64 recurrent steps', () => {
      const dim = 16;
      const anchor = encodeTaskToLatent('fable-lti-anchor-invariance-test', dim);
      let state = [...anchor];
      const logA = new Array<number>(dim).fill(-0.5);
      const logDt = new Array<number>(dim).fill(-2.0);

      let lastResult = stepLtiStateUpdate({
        currentState: state,
        preludeAnchor: anchor,
        logA,
        logDt,
      });

      for (let t = 0; t < 64; t++) {
        lastResult = stepLtiStateUpdate({
          currentState: state,
          preludeAnchor: anchor,
          logA,
          logDt,
        });
        state = lastResult.nextState;
      }

      expect(lastResult.ltiOperator.strictlyStable).toBe(true);
      expect(lastResult.anchorDriftCosine).toBeGreaterThan(0.9);
      expect(lastResult.anchorContributionNorm).toBeGreaterThan(0);
    });

    test('rejects empty vectors and mismatched dimensions', () => {
      expect(() => computeLtiDiscreteOperator([], [])).toThrow();
      expect(() =>
        stepLtiStateUpdate({
          currentState: [1, 2, 3],
          preludeAnchor: [1, 2],
          logA: [0, 0, 0],
          logDt: [0, 0, 0],
        })
      ).toThrow(/Dimension mismatch/);
    });
  });

  describe('3. Sinusoidal Loop-Index Embedding & Clamped Depth-Wise LoRA', () => {
    test('produces distinct phase encodings per loop iteration and clamps LoRA index on depth extrapolation', () => {
      const emb0 = computeLoopIndexEmbedding(0, 32);
      const emb1 = computeLoopIndexEmbedding(1, 32);
      const emb7 = computeLoopIndexEmbedding(7, 32);

      expect(emb0.length).toBe(4); // 32 / 8 = 4
      expect(emb0).not.toEqual(emb1);
      expect(emb1).not.toEqual(emb7);

      // Depth extrapolation: loopIndex = 50 when maxLoopIters = 16 must clamp to 15
      const loraWithin = computeDepthLoraScale(15, 16, 8);
      const loraExtrapolated = computeDepthLoraScale(50, 16, 8);
      expect(loraExtrapolated.clampedLoopIndex).toBe(15);
      expect(loraExtrapolated.scaleVector).toEqual(loraWithin.scaleVector);
    });
  });

  describe('4. Adaptive Computation Time (ACT) Halting & Remainder Trick', () => {
    test('enforces exact remainder trick (weights sum to 1.0) and zero post-halt weight leakage', () => {
      let cum = 0;
      let halted = false;
      const weights: number[] = [];

      const probs = [0.35, 0.42, 0.38, 0.5, 0.6];
      for (let t = 0; t < probs.length; t++) {
        const step = stepActHaltingController({
          rawHaltingProb: probs[t]!,
          cumulativeProb: cum,
          alreadyHalted: halted,
          actThreshold: 0.99,
          isFinalStep: t === probs.length - 1,
        });
        weights.push(step.effectiveWeight);
        cum = step.nextCumulativeProb;
        halted = step.haltedAfterStep;
      }

      // Step 0: 0.35, Step 1: 0.42 (cum=0.77), Step 2: 0.77+0.38 >= 0.99 -> remainder = 0.23, Step 3 & 4: 0
      expect(weights[0]).toBeCloseTo(0.35, 6);
      expect(weights[1]).toBeCloseTo(0.42, 6);
      expect(weights[2]).toBeCloseTo(0.23, 6);
      expect(weights[3]).toBe(0);
      expect(weights[4]).toBe(0);

      const sumWeights = weights.reduce((a, b) => a + b, 0);
      expect(sumWeights).toBeCloseTo(1.0, 9);
    });

    test('adapts recurrent loop count to task complexity and enforces KV-cache full-loop invariant (CR-MYTHOS-03)', () => {
      const simpleResult = runMythosRecurrentPipeline('fix typo', {
        nLoops: 12,
        useKvCache: false,
      });
      const complexResult = runMythosRecurrentPipeline(
        'reverse engineer distributed microservice architecture with redteam security and grpc moe moda mla refactor',
        {
          nLoops: 12,
          useKvCache: false,
        }
      );

      expect(simpleResult.totalEffectiveWeight).toBeCloseTo(1.0, 5);
      expect(complexResult.totalEffectiveWeight).toBeCloseTo(1.0, 5);
      expect(complexResult.loopsExecuted).toBeGreaterThanOrEqual(simpleResult.loopsExecuted);
      expect(simpleResult.earlyStoppedByAct).toBe(true);
      expect(simpleResult.loopsExecuted).toBeLessThan(12);

      // When useKvCache is true, RecurrentBlock must execute all nLoops to populate recurrent_loop_{t} cache slots
      const kvCachedResult = runMythosRecurrentPipeline('fix typo', {
        nLoops: 8,
        useKvCache: true,
      });
      expect(kvCachedResult.loopsExecuted).toBe(8);
      expect(kvCachedResult.earlyStoppedByAct).toBe(false);
      expect(kvCachedResult.kvCacheForcedAllLoops).toBe(true);
      expect(kvCachedResult.totalEffectiveWeight).toBeCloseTo(1.0, 5);

      // Post-halt steps in kvCachedResult must have effectiveWeight === 0
      const haltedIdx = kvCachedResult.steps.findIndex((s) => s.crossedThresholdThisStep);
      expect(haltedIdx).toBeGreaterThanOrEqual(0);
      for (let i = haltedIdx + 1; i < kvCachedResult.steps.length; i++) {
        expect(kvCachedResult.steps[i]!.effectiveWeight).toBe(0);
      }
    });
  });

  describe('5. DeepSeekMoE Shared + Aux-Loss-Free Routed Specialist Router', () => {
    test('always activates Shared Experts and routes domain tasks to matching specialists', () => {
      const decision = routeMythosExperts({
        task: 'Perform redteam security pentest and verify trust boundary injection',
        topK: 3,
      });

      expect(decision.sharedExperts).toEqual([
        'get-fable',
        'fable-scope-discipline',
        'fable-prove-it',
      ]);
      expect(decision.routedExperts.length).toBe(3);
      const routedIds = decision.routedExperts.map((r) => r.expertId);
      expect(routedIds).toContain('fable-security');
      expect(routedIds).toContain('fable-redteam');

      const gateSum = decision.routedExperts.reduce((acc, r) => acc + r.normalizedGateWeight, 0);
      expect(gateSum).toBeCloseTo(1.0, 4);
    });

    test('decouples router_bias selection from unbiased gating weights (ADR-MYTHOS-03)', () => {
      const task = 'implement feature with unit test';
      const baseRoute = routeMythosExperts({
        task,
        topK: 4,
        nGroups: 4,
        topkGroups: 4,
      });

      // Boost fable-recover via routerBias so it enters top-K without changing unbiased affinities
      const biasedRoute = routeMythosExperts({
        task,
        topK: 4,
        nGroups: 4,
        topkGroups: 4,
        routerBias: { 'fable-recover': 5.0 },
      });

      expect(biasedRoute.routedExperts.map((e) => e.expertId)).toContain('fable-recover');

      const tddBase = baseRoute.routedExperts.find((e) => e.expertId === 'fable-tdd');
      const tddBiased = biasedRoute.routedExperts.find((e) => e.expertId === 'fable-tdd');
      expect(tddBase).toBeDefined();
      expect(tddBiased).toBeDefined();
      // Unbiased affinity of fable-tdd must be identical despite routerBias on fable-recover
      expect(tddBiased!.unbiasedAffinity).toBe(tddBase!.unbiasedAffinity);

      // Verify balance loss computation
      const loss = computeMoeBalanceLoss([0.25, 0.25, 0.25, 0.25], [0.25, 0.25, 0.25, 0.25]);
      expect(loss).toBeCloseTo(1.0, 5);
    });
  });

  describe('6. Multi-Latent Attention (MLA) KV-Cache Compression & Latent Context', () => {
    test('achieves significant KV memory savings across all 7 Mythos scale variants (1B to 1T)', () => {
      const variantIds = Object.keys(MYTHOS_ARCHITECTURE_VARIANTS) as MythosVariantId[];
      expect(variantIds.length).toBe(7);

      for (const vid of variantIds) {
        const report = evaluateMlaCompression({ variantId: vid });
        expect(report.compressionRatioVsMha).toBeGreaterThan(7.0);
        expect(report.compressionRatioVsGqa8).toBeGreaterThan(1.5);
        expect(report.memorySavedPercentVsMha).toBeGreaterThan(85.0);
        expect(report.memorySavedPercentVsGqa8).toBeGreaterThan(35.0);
      }
    });

    test('compresses high-dimensional context vectors into low-rank c_KV + decoupled RoPE key', () => {
      const vec = encodeTaskToLatent('fable-context-latent-compression', 64);
      const summary = compressLatentContext(vec, 12, 4);

      expect(summary.originalDimensions).toBe(64);
      expect(summary.compressedLatentCkV.length).toBe(12);
      expect(summary.decoupledRopeKey.length).toBe(4);
      expect(summary.reconstructedKeyNorm).toBeGreaterThan(0);
      expect(summary.reconstructedValueNorm).toBeGreaterThan(0);
      expect(summary.compressionRatio).toBe(8); // (2 * 64) / (12 + 4) = 8.0
    });
  });

  describe('7. Mixture-of-Depths Attention (MoDA) Unified Sequence + Depth Softmax', () => {
    test('jointly normalizes sequence keys and cross-loop depth KV entries under one unified softmax', () => {
      const moda = computeModaAttention({
        querySummary: 'verify recurrent depth attention preservation',
        sequenceKeys: [
          { label: 'tok_0', vector: encodeTaskToLatent('sequence_tok_0', 16) },
          { label: 'tok_1', vector: encodeTaskToLatent('sequence_tok_1', 16) },
        ],
        depthEntries: [
          {
            depthIndex: 0,
            stage: 'prelude',
            loopIteration: null,
            keyVector: encodeTaskToLatent('prelude_anchor', 16),
            valueVector: encodeTaskToLatent('prelude_val', 16),
            summary: 'Prelude anchor',
          },
          {
            depthIndex: 1,
            stage: 'recurrent_loop',
            loopIteration: 0,
            keyVector: encodeTaskToLatent('loop_0_key', 16),
            valueVector: encodeTaskToLatent('loop_0_val', 16),
            summary: 'Loop 0 refinement',
          },
          {
            depthIndex: 2,
            stage: 'coda',
            loopIteration: null,
            keyVector: encodeTaskToLatent('coda_key', 16),
            valueVector: encodeTaskToLatent('coda_val', 16),
            summary: 'Coda projection',
          },
        ],
      });

      expect(moda.sequenceKeysCount).toBe(2);
      expect(moda.depthKeysCount).toBe(3);
      expect(moda.depthSignalPreserved).toBe(true);
      expect(moda.sequenceAttentionMass + moda.depthAttentionMass).toBeCloseTo(1.0, 5);
      expect(moda.combinedOutputVector.length).toBe(16);
    });
  });

  describe('8. Multi-Skill Intelligence Study, CLI Subcommands, and Doctor Health Gate', () => {
    test('builds complete OpenMythos study report across /rea, /fable-architecture, /repo-scan, /agentic-repo-discovery, /repo-to-skill, and /code-review', () => {
      const study = buildOpenMythosStudyReport();
      expect(study.reaLedger.commitSha).toBe('155430a88d2a98322fc4c79b2a067792c3c9579a');
      expect(study.fableArchitectureEvaluation.allowMonolith).toBe(false);
      expect(study.fableArchitectureEvaluation.compositeScore).toBe(9.0);
      expect(study.repoScan.components.length).toBe(6);
      expect(study.agenticDiscovery.candidates.length).toBe(6);
      expect(study.repoToSkillConstitution.invariantsMustAlways.length).toBeGreaterThanOrEqual(5);
      expect(study.repoToSkillConstitution.invariantsMustNever.length).toBeGreaterThanOrEqual(3);
      expect(study.codeReviewFindings.length).toBe(3);
      expect(FABLE_MYTHOS_EXPERT_CATALOG.length).toBeGreaterThanOrEqual(15);
    });

    test(
      'executes CLI subcommands in --json-v1 mode and passes doctor open-mythos-engine gate',
      () => {
        expect(runMythosCommand(['study', '--json-v1'])).toBe(0);
        expect(runMythosCommand(['loop', 'test task', '--loops', '4', '--json-v1'])).toBe(0);
        expect(runMythosCommand(['moe', 'security audit', '--top-k', '3', '--json-v1'])).toBe(0);
        expect(runMythosCommand(['mla', '--variant', 'mythos_10b', '--json-v1'])).toBe(0);
        expect(runMythosCommand(['moda', 'depth attention', '--loops', '4', '--json-v1'])).toBe(0);
        expect(runMythosCommand(['provenance', '--json-v1'])).toBe(0);
        expect(runMythosCommand(['unknown-subcommand'])).toBe(1);

        const doctorReport = runDoctor(process.cwd());
        const mythosCheck = doctorReport.checks.find((c) => c.id === 'open-mythos-engine');
        expect(mythosCheck).toBeDefined();
        expect(mythosCheck!.status).toBe('PASS');
      },
      25000
    );
  });
});
