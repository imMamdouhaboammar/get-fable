import type {
  ActHaltingStep,
  LtiDiscreteOperator,
  LtiStepResult,
  MythosRecurrentConfig,
  MythosRecurrentPipelineResult,
} from './types.js';

export const DEFAULT_MYTHOS_RECURRENT_CONFIG: MythosRecurrentConfig = {
  dim: 32,
  nLoops: 8,
  maxLoopIters: 32,
  actThreshold: 0.99,
  loraRank: 8,
  ltiLogAInit: -0.5,
  ltiLogDtInit: -2.0,
  useKvCache: false,
  preludeLayers: 2,
  codaLayers: 2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

export function vectorNorm(vec: readonly number[]): number {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i]! * vec[i]!;
  }
  return Math.sqrt(sumSq);
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    const va = a[i]!;
    const vb = b[i]!;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 1e-12) return 0;
  return clamp(dot / denom, -1, 1);
}

export function rmsNorm(vec: readonly number[], eps: number = 1e-6): number[] {
  if (vec.length === 0) return [];
  let meanSq = 0;
  for (let i = 0; i < vec.length; i++) {
    meanSq += vec[i]! * vec[i]!;
  }
  meanSq /= vec.length;
  const invRms = 1 / Math.sqrt(meanSq + eps);
  return vec.map((v) => v * invRms);
}

/**
 * Deterministic task-to-vector encoder for Fable agent reasoning states.
 * Produces a stable d-dimensional representation from a task description.
 */
export function encodeTaskToLatent(task: string, dim: number): number[] {
  const safeDim = Math.max(8, Math.floor(dim));
  const raw = new Array<number>(safeDim).fill(0);
  const normalized = task.trim() || 'default-fable-task';

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const slot = i % safeDim;
    const harmonic = Math.sin((i + 1) * 0.37 + code * 0.11);
    const phase = Math.cos((i + 1) * 0.19 - code * 0.07);
    raw[slot] = raw[slot]! + 0.6 * harmonic + 0.4 * phase;
  }

  for (let d = 0; d < safeDim; d++) {
    if (Math.abs(raw[d]!) < 1e-6) {
      raw[d] = Math.sin((d + 1) * 0.73) * 0.25;
    }
  }

  return rmsNorm(raw);
}

/**
 * Computes the Zero-Order Hold (ZOH) discretized state-transition operator A_discrete.
 *
 * Verified from open_mythos/main.py L703-L735 (LTIInjection):
 *   log_a = clamp(self.log_A, -10.0, 10.0)
 *   log_dt = clamp(self.log_dt, -10.0, 2.0)
 *   a_discrete = exp(-exp(clamp(log_dt + log_a, -20.0, 20.0)))
 *
 * Because exp(u) > 0 for all finite u, -exp(u) < 0, and exp(-exp(u)) is strictly in (0, 1).
 * Therefore spectral radius rho(A) = max_i |A_discrete[i]| < 1 is guaranteed by construction.
 */
export function computeLtiDiscreteOperator(
  logA: readonly number[],
  logDt: readonly number[]
): LtiDiscreteOperator {
  const dim = Math.min(logA.length, logDt.length);
  if (dim === 0) {
    throw new Error('LTI operator requires non-empty logA and logDt vectors');
  }

  const logAClamped: number[] = [];
  const logDtClamped: number[] = [];
  const aDiscrete: number[] = [];

  let maxEig = 0;
  let minEig = 1;

  for (let i = 0; i < dim; i++) {
    const la = clamp(logA[i]!, -10.0, 10.0);
    const ldt = clamp(logDt[i]!, -10.0, 2.0);
    const exponent = clamp(la + ldt, -20.0, 20.0);
    // Double exponential ZOH discretization: exp(-exp(exponent)) in (0, 1)
    const rawDiscrete = Math.exp(-Math.exp(exponent));
    // Guard IEEE-754 underflow to 1.0 when exponent is near -20 by bounding at 1 - 1e-9
    const boundedDiscrete = Math.min(1 - 1e-9, Math.max(1e-12, rawDiscrete));

    logAClamped.push(la);
    logDtClamped.push(ldt);
    aDiscrete.push(boundedDiscrete);

    if (boundedDiscrete > maxEig) maxEig = boundedDiscrete;
    if (boundedDiscrete < minEig) minEig = boundedDiscrete;
  }

  return {
    logAClamped,
    logDtClamped,
    aDiscrete,
    spectralRadius: maxEig,
    strictlyStable: maxEig < 1.0 && minEig > 0.0,
    minEigenvalue: minEig,
    maxEigenvalue: maxEig,
  };
}

/**
 * Executes a single LTI-Stable Input Injection step:
 *   h_{t+1} = A_discrete * h_t + B(e) + recurrentDelta
 *
 * Verified from open_mythos/main.py L726-L743:
 * Continual anchor injection B(e) prevents recurrent state drift from the Prelude encoding e.
 */
export function stepLtiStateUpdate(params: {
  currentState: readonly number[];
  preludeAnchor: readonly number[];
  recurrentDelta?: readonly number[];
  logA: readonly number[];
  logDt: readonly number[];
  bProjectionScale?: number;
}): LtiStepResult {
  const { currentState, preludeAnchor, logA, logDt, bProjectionScale = 0.35 } = params;
  const dim = currentState.length;
  if (preludeAnchor.length !== dim || logA.length !== dim || logDt.length !== dim) {
    throw new Error(`Dimension mismatch in stepLtiStateUpdate (expected dim=${dim})`);
  }

  const ltiOperator = computeLtiDiscreteOperator(logA, logDt);
  const nextState = new Array<number>(dim);
  const anchorVec = new Array<number>(dim);
  const recurrentVec = new Array<number>(dim);

  for (let i = 0; i < dim; i++) {
    const a = ltiOperator.aDiscrete[i]!;
    const rTerm = a * currentState[i]! + (params.recurrentDelta ? params.recurrentDelta[i]! : 0);
    // B_proj(e) with deterministic cross-channel coupling
    const prevAnchor = preludeAnchor[(i + dim - 1) % dim]!;
    const bTerm = bProjectionScale * (0.85 * preludeAnchor[i]! + 0.15 * prevAnchor);

    recurrentVec[i] = rTerm;
    anchorVec[i] = bTerm;
    nextState[i] = rTerm + bTerm;
  }

  return {
    nextState,
    ltiOperator,
    anchorContributionNorm: vectorNorm(anchorVec),
    recurrentContributionNorm: vectorNorm(recurrentVec),
    anchorDriftCosine: cosineSimilarity(nextState, preludeAnchor),
  };
}

/**
 * Sinusoidal Loop-Index Phase Embedding.
 *
 * Verified from open_mythos/main.py L541-L570 (loop_index_embedding):
 * Encodes loop iteration `t` into `loopDim = max(2, floor(dim / 8))` channels
 * using sinusoidal frequencies so shared recurrent weights distinguish early
 * structural passes from late refinement passes.
 */
export function computeLoopIndexEmbedding(loopIndex: number, dim: number): number[] {
  const loopDim = Math.max(2, Math.floor(dim / 8));
  const half = Math.max(1, Math.floor(loopDim / 2));
  const emb = new Array<number>(loopDim).fill(0);

  for (let k = 0; k < half; k++) {
    const freq = Math.exp((-2 * k * Math.log(10000.0)) / loopDim);
    const angle = loopIndex * freq;
    emb[k] = Math.sin(angle);
    if (k + half < loopDim) {
      emb[k + half] = Math.cos(angle);
    }
  }

  return emb;
}

/**
 * Clamped Depth-Wise LoRA Scale.
 *
 * Verified from open_mythos/main.py L578-L620 (LoRAAdapter):
 *   idx = min(loop_idx, self.max_loops - 1)
 * Clamping `loopIndex` at `maxLoopIters - 1` guarantees safe inference-time
 * depth extrapolation beyond the maximum loop depth seen during training.
 */
export function computeDepthLoraScale(
  loopIndex: number,
  maxLoopIters: number,
  loraRank: number
): { clampedLoopIndex: number; scaleVector: number[] } {
  const safeMaxLoops = Math.max(1, Math.floor(maxLoopIters));
  const safeRank = Math.max(1, Math.floor(loraRank));
  const clampedLoopIndex = clamp(Math.floor(loopIndex), 0, safeMaxLoops - 1);

  const progress = safeMaxLoops > 1 ? clampedLoopIndex / (safeMaxLoops - 1) : 0;
  const scaleVector: number[] = [];

  for (let r = 0; r < safeRank; r++) {
    // Smooth depth modulation around 1.0
    const harmonic = Math.cos(((r + 1) * Math.PI * progress) / safeRank);
    scaleVector.push(Number((1.0 + 0.15 * harmonic).toFixed(6)));
  }

  return { clampedLoopIndex, scaleVector };
}

/**
 * Single-step Adaptive Computation Time (ACT) Halting Controller with Remainder Trick.
 *
 * Verified from open_mythos/main.py L865-L890 (RecurrentBlock.forward):
 * - At step t, raw halting probability p_t in (0, 1).
 * - If already halted, effectiveWeight = 0.
 * - If cumulativeProb + p_t >= actThreshold (or isFinalStep),
 *   assigns remainder r = max(0, 1.0 - cumulativeProb) and marks halted = true.
 * - Guarantees sum_t effectiveWeight_t == 1.0 with zero post-halt leakage.
 */
export function stepActHaltingController(params: {
  rawHaltingProb: number;
  cumulativeProb: number;
  alreadyHalted: boolean;
  actThreshold: number;
  isFinalStep: boolean;
}): {
  effectiveWeight: number;
  nextCumulativeProb: number;
  crossedThresholdThisStep: boolean;
  haltedAfterStep: boolean;
} {
  const { rawHaltingProb, cumulativeProb, alreadyHalted, actThreshold, isFinalStep } = params;
  const p = clamp(rawHaltingProb, 1e-6, 1 - 1e-6);

  if (alreadyHalted) {
    return {
      effectiveWeight: 0,
      nextCumulativeProb: cumulativeProb,
      crossedThresholdThisStep: false,
      haltedAfterStep: true,
    };
  }

  const candidateCumulative = cumulativeProb + p;
  if (candidateCumulative >= actThreshold || isFinalStep) {
    const remainder = Math.max(0, Number((1.0 - cumulativeProb).toFixed(12)));
    return {
      effectiveWeight: remainder,
      nextCumulativeProb: 1.0,
      crossedThresholdThisStep: true,
      haltedAfterStep: true,
    };
  }

  return {
    effectiveWeight: p,
    nextCumulativeProb: Number(candidateCumulative.toFixed(12)),
    crossedThresholdThisStep: false,
    haltedAfterStep: false,
  };
}

/**
 * Estimates task complexity in [0, 1] to calibrate halting trajectory.
 * Simple tasks converge in 2-3 loops; complex multi-domain tasks ponder deeper.
 */
export function estimateTaskComplexity(task: string): number {
  const lower = task.toLowerCase();
  let score = 0.25;

  const deepSignals = [
    'architecture',
    'recurrent',
    'mythos',
    'security',
    'redteam',
    'distributed',
    'microservice',
    'grpc',
    'moe',
    'moda',
    'mla',
    'refactor',
    'reverse engineer',
    'rea',
    'decompile',
  ];
  for (const sig of deepSignals) {
    if (lower.includes(sig)) score += 0.1;
  }
  if (task.length > 120) score += 0.15;
  return clamp(score, 0.15, 0.92);
}

/**
 * Runs the complete 3-Stage OpenMythos Recurrent-Depth Pipeline:
 *   Stage 1: Prelude (encodes input once into frozen context anchor e)
 *   Stage 2: Looped Recurrent Block (LTI injection + sinusoidal loop index + depth LoRA + ACT halting)
 *   Stage 3: Coda (projects ACT-weighted recurrent output into final representation)
 */
export function runMythosRecurrentPipeline(
  task: string,
  partialConfig: Partial<MythosRecurrentConfig> = {}
): MythosRecurrentPipelineResult {
  const config: MythosRecurrentConfig = {
    ...DEFAULT_MYTHOS_RECURRENT_CONFIG,
    ...partialConfig,
  };

  const dim = Math.max(8, Math.floor(config.dim));
  const nLoops = Math.max(1, Math.floor(config.nLoops));
  const maxLoopIters = Math.max(1, Math.floor(config.maxLoopIters));
  const actThreshold = clamp(config.actThreshold, 0.5, 0.9999);

  // Stage 1: Prelude encoding (frozen anchor `e` across all recurrent loops)
  let preludeState = encodeTaskToLatent(task, dim);
  for (let l = 0; l < config.preludeLayers; l++) {
    preludeState = rmsNorm(
      preludeState.map((v, idx) => {
        const neighbor = preludeState[(idx + 1) % dim]!;
        const gate = sigmoid(v * 1.2 + neighbor * 0.3);
        return v + 0.25 * (v * gate);
      })
    );
  }
  const preludeEncoding = preludeState;

  // Initialize LTI log_A and log_dt parameters
  const logA = Array.from({ length: dim }, (_, i) => config.ltiLogAInit - 0.02 * (i % 7));
  const logDt = Array.from({ length: dim }, (_, i) => config.ltiLogDtInit + 0.01 * (i % 5));
  const ltiOp = computeLtiDiscreteOperator(logA, logDt);

  const complexity = estimateTaskComplexity(task);
  let h = [...preludeEncoding];
  const weightedOutput = new Array<number>(dim).fill(0);

  let cumulativeProb = 0;
  let halted = false;
  let earlyStoppedByAct = false;
  let kvCacheForcedAllLoops = false;
  let totalEffectiveWeight = 0;
  let ponderCost = 0;

  const steps: ActHaltingStep[] = [];
  const loopEmb = (t: number) => computeLoopIndexEmbedding(t, dim);

  for (let t = 0; t < nLoops; t++) {
    const prevH = [...h];

    // 1. LTI-Stable Input Injection: h = A_discrete * h + B * e
    const ltiStep = stepLtiStateUpdate({
      currentState: h,
      preludeAnchor: preludeEncoding,
      logA,
      logDt,
    });
    h = ltiStep.nextState;

    // 2. Inject Sinusoidal Loop-Index Embedding into first loopDim channels
    const phaseEmb = loopEmb(t);
    for (let k = 0; k < phaseEmb.length && k < dim; k++) {
      h[k] = h[k]! + 0.1 * phaseEmb[k]!;
    }

    // 3. Apply Clamped Depth-Wise LoRA Transformation
    const { clampedLoopIndex, scaleVector } = computeDepthLoraScale(
      t,
      maxLoopIters,
      config.loraRank
    );
    const meanLoraScale =
      scaleVector.reduce((acc, v) => acc + v, 0) / Math.max(1, scaleVector.length);

    h = rmsNorm(
      h.map((v, idx) => {
        const anchorVal = preludeEncoding[idx]!;
        const swiglu = v * sigmoid(1.4 * v) + 0.15 * anchorVal;
        return v + 0.2 * meanLoraScale * swiglu;
      })
    );

    // 4. Compute convergence delta & halting probability p_t
    const deltaNorm = vectorNorm(h.map((v, idx) => v - prevH[idx]!));
    const convergenceSignal = Math.max(0, 1.0 - deltaNorm / Math.sqrt(dim));
    // Higher complexity tasks require more loops before halting probability spikes
    const stepGain = 0.85 - 0.45 * complexity;
    const baseOffset = -2.1 - 1.2 * complexity;
    const rawLogit = (t + 1) * stepGain + 0.65 * convergenceSignal + baseOffset;
    const rawHaltingProb = sigmoid(rawLogit);

    const cumulativeBefore = cumulativeProb;
    const actStep = stepActHaltingController({
      rawHaltingProb,
      cumulativeProb,
      alreadyHalted: halted,
      actThreshold,
      isFinalStep: t === nLoops - 1,
    });

    cumulativeProb = actStep.nextCumulativeProb;
    halted = actStep.haltedAfterStep;
    totalEffectiveWeight += actStep.effectiveWeight;
    if (!alreadyHaltedBefore(actStep, cumulativeBefore)) {
      ponderCost += 1;
    }

    // 5. Accumulate ACT-weighted state into recurrentOutput
    for (let i = 0; i < dim; i++) {
      weightedOutput[i] = weightedOutput[i]! + actStep.effectiveWeight * h[i]!;
    }

    steps.push({
      loopIndex: t,
      rawHaltingProb: Number(rawHaltingProb.toFixed(6)),
      effectiveWeight: Number(actStep.effectiveWeight.toFixed(6)),
      cumulativeProbBefore: Number(cumulativeBefore.toFixed(6)),
      cumulativeProbAfter: Number(cumulativeProb.toFixed(6)),
      crossedThresholdThisStep: actStep.crossedThresholdThisStep,
      haltedAfterStep: halted,
      loopIndexEmbedding: phaseEmb.map((v) => Number(v.toFixed(6))),
      loraDepthScale: scaleVector,
      clampedLoraLoopIndex: clampedLoopIndex,
      stateNorm: Number(vectorNorm(h).toFixed(6)),
      anchorCosineSimilarity: Number(cosineSimilarity(h, preludeEncoding).toFixed(6)),
      convergenceDelta: Number(deltaNorm.toFixed(6)),
    });

    // Verified from open_mythos/main.py L888:
    // Early exit when halted and kv_cache is None. When kv_cache is active, run all loops.
    if (halted && t < nLoops - 1) {
      if (!config.useKvCache) {
        earlyStoppedByAct = true;
        break;
      } else {
        kvCacheForcedAllLoops = true;
      }
    }
  }

  // Stage 3: Coda layers (runs once on ACT-weighted recurrent output)
  let codaState = rmsNorm(weightedOutput);
  for (let l = 0; l < config.codaLayers; l++) {
    codaState = rmsNorm(
      codaState.map((v, idx) => {
        const anchorVal = preludeEncoding[idx]!;
        return v + 0.2 * (v * sigmoid(v) + 0.1 * anchorVal);
      })
    );
  }

  // Overthinking check: detect if convergence delta increased across the last 2 active steps
  let overthinkingDetected = false;
  let overthinkingReason: string | null = null;
  if (steps.length >= 3) {
    const sLast = steps[steps.length - 1]!;
    const sPrev = steps[steps.length - 2]!;
    if (sLast.convergenceDelta > sPrev.convergenceDelta * 1.35 && sLast.effectiveWeight > 0) {
      overthinkingDetected = true;
      overthinkingReason = `Late-loop divergence detected at loop ${sLast.loopIndex}: delta increased from ${sPrev.convergenceDelta} to ${sLast.convergenceDelta}`;
    }
  }

  const finalStep = steps[steps.length - 1]!;

  return {
    task,
    config,
    preludeEncoding: preludeEncoding.map((v) => Number(v.toFixed(6))),
    recurrentOutput: weightedOutput.map((v) => Number(v.toFixed(6))),
    codaOutput: codaState.map((v) => Number(v.toFixed(6))),
    loopsExecuted: steps.length,
    earlyStoppedByAct,
    kvCacheForcedAllLoops,
    totalEffectiveWeight: Number(totalEffectiveWeight.toFixed(6)),
    ponderCost,
    overthinkingDetected,
    overthinkingReason,
    ltiSummary: {
      spectralRadius: Number(ltiOp.spectralRadius.toFixed(6)),
      strictlyStable: ltiOp.strictlyStable,
      finalAnchorCosineSimilarity: finalStep.anchorCosineSimilarity,
    },
    steps,
  };
}

function alreadyHaltedBefore(
  actStep: { effectiveWeight: number; crossedThresholdThisStep: boolean },
  cumulativeBefore: number
): boolean {
  return actStep.effectiveWeight === 0 && !actStep.crossedThresholdThisStep && cumulativeBefore >= 1.0;
}
