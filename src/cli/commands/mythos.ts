/**
 * CLI Command Handler for `get-fable mythos` and `get-fable open-mythos`.
 * Clean-room TypeScript implementation inspired by:
 *   https://github.com/kyegomez/OpenMythos (commit: 155430a88d2a98322fc4c79b2a067792c3c9579a)
 */

import {
  MYTHOS_ARCHITECTURE_VARIANTS,
  OPEN_MYTHOS_REA_EVIDENCE_LEDGER,
  buildOpenMythosStudyReport,
  compressLatentContext,
  computeModaAttention,
  encodeTaskToLatent,
  evaluateMlaCompression,
  routeMythosExperts,
  runMythosRecurrentPipeline,
  type ModaDepthLayerEntry,
  type MythosVariantId,
} from '../../core/mythos/index.js';
import { addEvidence, readFableState, withFableStateTransaction } from '../../core/state.js';
import { colors, logError, logHeader, logInfo, logSuccess } from '../../utils.js';

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function hasJsonFlag(args: string[]): boolean {
  return hasFlag(args, '--json') || hasFlag(args, '--json-v1');
}

function isJsonV1(args: string[]): boolean {
  return hasFlag(args, '--json-v1');
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    const val = args[idx + 1];
    if (val && !val.startsWith('--')) return val;
  }
  return undefined;
}

function printOutput(
  args: string[],
  command: string,
  payload: unknown,
  renderHuman: () => void
): number {
  if (hasJsonFlag(args)) {
    const out = isJsonV1(args) ? { schemaVersion: 1, command, data: payload } : payload;
    console.log(JSON.stringify(out, null, 2));
  } else {
    renderHuman();
  }
  return 0;
}

export function runMythosCommand(args: string[]): number {
  const flagsWithValues = [
    '--loops',
    '--max-loops',
    '--act-threshold',
    '--top-k',
    '--scoring',
    '--variant',
    '--seq-len',
  ];

  const positionals: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (flagsWithValues.includes(arg)) {
      i++;
      continue;
    }
    if (arg.startsWith('--')) continue;
    positionals.push(arg);
  }

  const subcommand = positionals[0] ?? 'study';

  if (subcommand === 'provenance' || subcommand === 'rea-ledger') {
    return printOutput(args, 'mythos.provenance', OPEN_MYTHOS_REA_EVIDENCE_LEDGER, () => {
      logHeader('Fable Mythos Engine — REA Provenance Ledger');
      console.log(`Source Repo:  ${colors.cyan}${OPEN_MYTHOS_REA_EVIDENCE_LEDGER.sourceRepo}${colors.reset}`);
      console.log(`Commit SHA:   ${OPEN_MYTHOS_REA_EVIDENCE_LEDGER.commitSha}`);
      console.log(`Git Tree SHA: ${OPEN_MYTHOS_REA_EVIDENCE_LEDGER.gitTreeSha}`);
      console.log(`Clean-Room:   ${OPEN_MYTHOS_REA_EVIDENCE_LEDGER.cleanRoomAdaptation}\n`);
      for (const art of OPEN_MYTHOS_REA_EVIDENCE_LEDGER.verifiedArtifacts) {
        console.log(`- ${colors.bright}${art.path}${colors.reset} (${art.lines} lines, ${art.bytes} bytes)`);
        console.log(`  git-blob: ${art.gitBlobSha1}`);
        console.log(`  sha256:   ${art.sha256}`);
        console.log(`  role:     ${art.role}`);
      }
    });
  }

  if (subcommand === 'loop' || subcommand === 'recurrent' || subcommand === 'act') {
    const task =
      positionals.slice(1).join(' ').trim() ||
      'Architect and verify distributed recurrent-depth MoE reasoning loop';
    const nLoops = Number(getFlagValue(args, '--loops') ?? 8);
    const maxLoopIters = Number(getFlagValue(args, '--max-loops') ?? 32);
    const actThreshold = Number(getFlagValue(args, '--act-threshold') ?? 0.99);
    const useKvCache = hasFlag(args, '--kv-cache');
    const recordEv = hasFlag(args, '--record-evidence');

    const result = runMythosRecurrentPipeline(task, {
      nLoops,
      maxLoopIters,
      actThreshold,
      useKvCache,
    });

    if (recordEv && readFableState(process.cwd())) {
      withFableStateTransaction(process.cwd(), (state) =>
        addEvidence(state, {
          result: result.ltiSummary.strictlyStable && !result.overthinkingDetected ? 'pass' : 'fail',
          kind: 'observation',
          source: 'get-fable mythos loop',
          detail: `Mythos Recurrent-Depth loop completed in ${result.loopsExecuted}/${result.config.nLoops} loops (spectralRadius=${result.ltiSummary.spectralRadius}, totalWeight=${result.totalEffectiveWeight}, anchorCosine=${result.ltiSummary.finalAnchorCosineSimilarity})`,
        })
      );
    }

    return printOutput(args, 'mythos.loop', result, () => {
      logHeader('Fable Mythos Recurrent-Depth Pipeline (Prelude -> Loop -> Coda)');
      console.log(`Task:                 ${colors.cyan}${result.task}${colors.reset}`);
      console.log(`Loops Executed:       ${result.loopsExecuted} / ${result.config.nLoops} (earlyStop=${result.earlyStoppedByAct})`);
      console.log(`LTI Spectral Radius:  ${result.ltiSummary.spectralRadius} (strictlyStable=${result.ltiSummary.strictlyStable})`);
      console.log(`Anchor Cosine Sim:    ${result.ltiSummary.finalAnchorCosineSimilarity}`);
      console.log(`ACT Total Weight:     ${result.totalEffectiveWeight} (ponderCost=${result.ponderCost})`);
      console.log(
        `Overthinking Guard:   ${result.overthinkingDetected ? `${colors.red}TRIGGERED (${result.overthinkingReason})${colors.reset}` : `${colors.green}CLEAR${colors.reset}`}\n`
      );
      for (const s of result.steps) {
        console.log(
          `  [Loop ${s.loopIndex}] p_t=${s.rawHaltingProb.toFixed(4)} | weight=${s.effectiveWeight.toFixed(4)} | cum_p=${s.cumulativeProbAfter.toFixed(4)} | anchorCos=${s.anchorCosineSimilarity.toFixed(4)} | halted=${s.haltedAfterStep}`
        );
      }
    });
  }

  if (subcommand === 'moe' || subcommand === 'route') {
    const task =
      positionals.slice(1).join(' ').trim() ||
      'Reverse engineer OpenMythos architecture and implement recurrent MoE router with TDD tests';
    const topK = Number(getFlagValue(args, '--top-k') ?? 4);
    const scoringRaw = getFlagValue(args, '--scoring');
    const scoringFunc = scoringRaw === 'softmax' ? 'softmax' : 'sigmoid';

    const decision = routeMythosExperts({
      task,
      topK,
      scoringFunc,
    });

    return printOutput(args, 'mythos.moe', decision, () => {
      logHeader('Fable Mythos DeepSeekMoE Specialist Router');
      console.log(`Task:               ${colors.cyan}${decision.task}${colors.reset}`);
      console.log(`Shared Experts:     ${colors.green}${decision.sharedExperts.join(', ')}${colors.reset} (always active)`);
      console.log(`Selected Groups:    [${decision.selectedGroups.join(', ')}]`);
      console.log(`Balance Loss:       ${decision.balanceLoss} (auxLossFreeBalanced=${decision.auxLossFreeBalanced})\n`);
      console.log(`${colors.bright}Top-${decision.routedExperts.length} Routed Specialists:${colors.reset}`);
      for (const exp of decision.routedExperts) {
        console.log(
          `  - ${colors.bright}${exp.expertId}${colors.reset} (pack=${exp.pack}, group=${exp.groupIndex}) | gateWeight=${exp.normalizedGateWeight.toFixed(4)} | unbiased=${exp.unbiasedAffinity.toFixed(4)}`
        );
      }
    });
  }

  if (subcommand === 'mla' || subcommand === 'kv-compress') {
    const variantRaw = (getFlagValue(args, '--variant') ?? 'mythos_3b') as MythosVariantId;
    const seqLenRaw = getFlagValue(args, '--seq-len');
    const allVariants = hasFlag(args, '--all');

    if (allVariants) {
      const reports = (Object.keys(MYTHOS_ARCHITECTURE_VARIANTS) as MythosVariantId[]).map((vid) =>
        evaluateMlaCompression({
          variantId: vid,
          seqLen: seqLenRaw ? Number(seqLenRaw) : undefined,
        })
      );
      return printOutput(args, 'mythos.mla', { variants: reports }, () => {
        logHeader('Fable Mythos Multi-Latent Attention (MLA) KV Compression Matrix');
        for (const r of reports) {
          console.log(
            `- ${colors.bright}${r.variantId.padEnd(10)}${colors.reset} | seqLen=${String(r.seqLen).padEnd(6)} | vs MHA: ${colors.green}${r.compressionRatioVsMha}x${colors.reset} (${r.memorySavedPercentVsMha}% saved) | vs GQA-8: ${colors.cyan}${r.compressionRatioVsGqa8}x${colors.reset} (${r.memorySavedPercentVsGqa8}% saved)`
          );
        }
      });
    }

    if (!(variantRaw in MYTHOS_ARCHITECTURE_VARIANTS)) {
      logError(
        `Unknown Mythos variant "${variantRaw}". Valid variants: ${Object.keys(MYTHOS_ARCHITECTURE_VARIANTS).join(', ')}`
      );
      return 1;
    }

    const report = evaluateMlaCompression({
      variantId: variantRaw,
      seqLen: seqLenRaw ? Number(seqLenRaw) : undefined,
    });
    const latentDemo = compressLatentContext(encodeTaskToLatent('fable-mla-context-demo', 32), 8, 4);

    return printOutput(args, 'mythos.mla', { report, latentDemo }, () => {
      logHeader(`Fable Mythos MLA KV-Cache Compression (${report.variantId})`);
      console.log(`Effective Depth Layers:  ${report.effectiveDepthLayers}`);
      console.log(`Standard MHA KV/tok/lyr: ${report.standardMhaKvElementsPerTokenPerLayer} elements`);
      console.log(`GQA-8 KV/tok/lyr:        ${report.gqa8HeadsKvElementsPerTokenPerLayer} elements`);
      console.log(`MLA Latent/tok/lyr:      ${report.mlaLatentElementsPerTokenPerLayer} elements (c_KV + k_rope)`);
      console.log(
        `Compression vs MHA:      ${colors.green}${report.compressionRatioVsMha}x${colors.reset} (${report.memorySavedPercentVsMha}% memory saved)`
      );
      console.log(
        `Compression vs GQA-8:    ${colors.cyan}${report.compressionRatioVsGqa8}x${colors.reset} (${report.memorySavedPercentVsGqa8}% memory saved)`
      );
    });
  }

  if (subcommand === 'moda' || subcommand === 'depth-attention') {
    const task =
      positionals.slice(1).join(' ').trim() ||
      'Synthesize recurrent depth states with causal sequence context via MoDA unified softmax';
    const nLoops = Number(getFlagValue(args, '--loops') ?? 6);
    const pipeline = runMythosRecurrentPipeline(task, { nLoops, dim: 16 });

    const depthEntries: ModaDepthLayerEntry[] = [
      {
        depthIndex: 0,
        stage: 'prelude',
        loopIteration: null,
        keyVector: pipeline.preludeEncoding,
        valueVector: pipeline.preludeEncoding,
        summary: 'Prelude frozen context anchor e',
      },
      ...pipeline.steps.map((s, idx) => ({
        depthIndex: idx + 1,
        stage: 'recurrent_loop' as const,
        loopIteration: s.loopIndex,
        keyVector: encodeTaskToLatent(`${task}-loop-${s.loopIndex}`, 16),
        valueVector: encodeTaskToLatent(`${task}-val-${s.loopIndex}`, 16),
        summary: `Recurrent loop ${s.loopIndex} (weight=${s.effectiveWeight})`,
      })),
      {
        depthIndex: pipeline.steps.length + 1,
        stage: 'coda',
        loopIteration: null,
        keyVector: pipeline.codaOutput,
        valueVector: pipeline.codaOutput,
        summary: 'Coda decoded output representation',
      },
    ];

    const modaResult = computeModaAttention({
      querySummary: task,
      sequenceKeys: [
        { label: 'seq_token_0', vector: encodeTaskToLatent('user_request_context', 16) },
        { label: 'seq_token_1', vector: encodeTaskToLatent('fable_ledger_contract', 16) },
      ],
      depthEntries,
    });

    return printOutput(args, 'mythos.moda', modaResult, () => {
      logHeader('Fable Mythos Mixture-of-Depths Attention (MoDA)');
      console.log(`Query:                   ${colors.cyan}${modaResult.querySummary}${colors.reset}`);
      console.log(`Sequence Attention Mass: ${modaResult.sequenceAttentionMass}`);
      console.log(`Depth Attention Mass:    ${modaResult.depthAttentionMass}`);
      console.log(`Depth Signal Preserved:  ${modaResult.depthSignalPreserved}\n`);
      for (const dw of modaResult.unifiedSoftmaxWeights.depthWeights) {
        console.log(
          `  [Depth ${dw.depthIndex} | ${dw.stage}${dw.loopIteration !== null ? `#${dw.loopIteration}` : ''}] weight=${dw.weight.toFixed(4)} — ${dw.summary}`
        );
      }
    });
  }

  if (subcommand === 'study' || subcommand === 'audit' || subcommand === 'constitution') {
    const study = buildOpenMythosStudyReport();
    return printOutput(args, 'mythos.study', study, () => {
      logHeader('Fable Mythos Multi-Skill Repository Intelligence Study');
      logInfo(
        'Executed /rea + /fable-architecture + /repo-scan + /agentic-repo-discovery + /repo-to-skill + /code-review on kyegomez/OpenMythos'
      );
      console.log(`\n${colors.bright}1. REA Cryptographic Provenance:${colors.reset}`);
      console.log(`   Repo: ${study.reaLedger.sourceRepo} @ ${study.reaLedger.commitSha}`);
      console.log(`   Tree: ${study.reaLedger.gitTreeSha}`);
      console.log(`   Verified Artifacts: ${study.reaLedger.verifiedArtifacts.length} files`);

      console.log(`\n${colors.bright}2. Fable Architecture Evaluation:${colors.reset}`);
      console.log(
        `   Vectors: Scale=${study.fableArchitectureEvaluation.scaleVector}, Domain=${study.fableArchitectureEvaluation.domainDecouplingVector}, Resource=${study.fableArchitectureEvaluation.resourceIntensityVector} -> Composite=${study.fableArchitectureEvaluation.compositeScore} (allowMonolith=${study.fableArchitectureEvaluation.allowMonolith})`
      );
      console.log(`   Topology: ${study.fableArchitectureEvaluation.recommendedTopology}`);

      console.log(`\n${colors.bright}3. Repo-Scan Component Verdicts:${colors.reset}`);
      for (const comp of study.repoScan.components) {
        console.log(
          `   - [${comp.verdict}] ${comp.path} (score=${comp.CompositeScore}): ${comp.component}`
        );
      }

      console.log(`\n${colors.bright}4. Codebase Constitution Invariants (/repo-to-skill):${colors.reset}`);
      for (const inv of study.repoToSkillConstitution.invariantsMustAlways) {
        console.log(`   + ${inv}`);
      }

      console.log(`\n${colors.bright}5. Code Review Findings (/code-review):${colors.reset}`);
      for (const cr of study.codeReviewFindings) {
        console.log(`   * [${cr.severity}] ${cr.id} (${cr.location}): ${cr.finding}`);
      }
      logSuccess('OpenMythos study and Fable Engine recurrent-depth integration verified.');
    });
  }

  logError(
    `Unknown mythos subcommand: ${subcommand}. Use: study | loop | moe | mla | moda | provenance`
  );
  return 1;
}
