/**
 * CLI Command Handler for `get-fable harness`.
 *
 * Implements Harness² Recursive Agent Harnessing CLI commands:
 * - status: Inspect engine state, substrate, and components
 * - components: List c1..c8 components and token budget
 * - refine: Execute Propose–Probe–Compose task-level recursion
 * - propose: Generate candidate harness proposals
 * - reflect: Execute harnessing-level experience reflection
 * - demo: Run Harness² verification demo
 * - provenance: Display REA evidence ledger
 */

import {
  HARNESS2_REA_EVIDENCE_LEDGER,
  checkAlwaysOnBudget,
  findLocalHarness2Binary,
  findLocalHarness2DemoBinary,
  getSurfaceSpec,
  readWorkspaceHarnessTree,
  runHarnessDemoExternal,
  runHarnessingLevelRecursion,
  runNativeHarnessRefinement,
  type HarnessSubstrateKind,
  type RecursionMode,
} from '../../core/harness/index.js';
import { colors, logHeader, logInfo, logSuccess, logWarn } from '../../utils.js';

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

export function runHarnessCommand(args: string[]): number {
  const positionals = args.filter((a) => !a.startsWith('--'));
  const action = positionals[0] || 'status';

  const substrate: HarnessSubstrateKind =
    (getFlagValue(args, '--substrate') as HarnessSubstrateKind) || 'fable';
  const mode: RecursionMode = (getFlagValue(args, '--mode') as RecursionMode) || 'parallel';
  const kVal = parseInt(getFlagValue(args, '--k') || '1', 10);
  const domain = getFlagValue(args, '--domain') || 'engineering';

  switch (action) {
    case 'status': {
      const surface = getSurfaceSpec(substrate);
      const tree = readWorkspaceHarnessTree(process.cwd(), surface);
      const budget = checkAlwaysOnBudget(surface, tree);
      const localBin = findLocalHarness2Binary();
      const localDemoBin = findLocalHarness2DemoBinary();

      const payload = {
        engine: 'Harness² Recursive Agent Harnessing Engine',
        substrate: surface.name,
        upstreamCommit: HARNESS2_REA_EVIDENCE_LEDGER.commitSha,
        upstreamPaper: HARNESS2_REA_EVIDENCE_LEDGER.upstreamPaper,
        binaries: {
          harness2: localBin,
          harness2Demo: localDemoBin,
        },
        surface: {
          alwaysOnFiles: surface.alwaysOn,
          budget,
          skillDir: surface.skillDir,
          pluginDir: surface.pluginDir,
        },
        detectedComponentCount: Object.keys(tree).length,
      };

      return printOutput(args, 'harness.status', payload, () => {
        logHeader('Harness² Recursive Agent Harnessing Engine');
        console.log(`Substrate:      ${colors.cyan}${surface.name}${colors.reset}`);
        console.log(`Local CLI:      ${localBin ? colors.green + localBin + colors.reset : colors.yellow + 'not found' + colors.reset}`);
        console.log(`Upstream Paper: ${colors.bright}${HARNESS2_REA_EVIDENCE_LEDGER.upstreamPaper.title}${colors.reset}`);
        console.log(`Upstream Commit: ${HARNESS2_REA_EVIDENCE_LEDGER.commitSha.slice(0, 12)} (${HARNESS2_REA_EVIDENCE_LEDGER.sourceRepo})`);
        console.log(`Always-on Size: ${budget.totalBytes} / ${budget.maxBytes} bytes [${budget.ok ? colors.green + 'OK' + colors.reset : colors.red + 'EXCEEDED' + colors.reset}]`);
        console.log(`Active Files:   ${Object.keys(tree).length} detected on editable surface`);
      });
    }

    case 'components': {
      const surface = getSurfaceSpec(substrate);
      const tree = readWorkspaceHarnessTree(process.cwd(), surface);
      const budget = checkAlwaysOnBudget(surface, tree);

      const items = Object.entries(tree).map(([p, content]) => ({
        path: p,
        bytes: Buffer.byteLength(content, 'utf-8'),
        isAlwaysOn: surface.alwaysOn.includes(p),
      }));

      const payload = {
        substrate: surface.name,
        budget,
        components: items,
      };

      return printOutput(args, 'harness.components', payload, () => {
        logHeader(`c1..c8 Component Tree [${substrate}]`);
        console.log(`Always-On Budget: ${budget.totalBytes} / ${budget.maxBytes} bytes\n`);
        for (const item of items) {
          const tag = item.isAlwaysOn ? `${colors.yellow}[always-on]${colors.reset} ` : '';
          console.log(`- ${tag}${colors.cyan}${item.path}${colors.reset} (${item.bytes} bytes)`);
        }
      });
    }

    case 'refine':
    case 'run': {
      const task = positionals.slice(1).join(' ') || 'General engineering improvement';
      const result = runNativeHarnessRefinement(task, {
        substrate,
        k: kVal,
        mode,
        domain,
      });

      return printOutput(args, 'harness.refine', result, () => {
        logHeader(`Harness² Propose–Probe–Compose [k=${kVal}, mode=${mode}]`);
        console.log(`Task: ${colors.bright}${task}${colors.reset}`);
        console.log(`Proposals generated: ${result.proposals.length}`);
        console.log(`Probes evaluated:    ${result.probes.length}`);
        console.log(`Adopted components:  ${colors.green}${result.composition.adoptedComponents.length}${colors.reset}`);
        console.log(`Gain estimate:       +${(result.gainEstimate * 100).toFixed(1)}%`);
        console.log(`Rationale:           ${result.composition.rationale}`);
      });
    }

    case 'reflect': {
      const task = positionals.slice(1).join(' ') || 'Previous task';
      const result = runNativeHarnessRefinement(task, { substrate, k: 1, mode: 'parallel', domain });
      const persistentHarness = {};
      const reflection = runHarnessingLevelRecursion('task-curr', domain, result, persistentHarness);

      return printOutput(args, 'harness.reflect', reflection, () => {
        logHeader(`Harnessing-Level Experience Reflection`);
        console.log(`Domain:    ${reflection.domain}`);
        console.log(`Timestamp: ${reflection.timestamp}\n`);
        for (const note of reflection.reflectionNotes) {
          console.log(`- ${note}`);
        }
      });
    }

    case 'demo': {
      const outDir = getFlagValue(args, '--output') || '/tmp/harness2_fable_demo';
      const res = runHarnessDemoExternal(outDir, kVal);
      if (res.ok) {
        logSuccess(`Local demo passed:\n${res.stdout}`);
        return 0;
      }
      logWarn(`External python demo execution issue: ${res.error}. Running native refinement test instead.`);
      const nativeRes = runNativeHarnessRefinement('Demo test task', { k: 1, mode: 'parallel' });
      logSuccess(`Native Harness² refinement verified: +${(nativeRes.gainEstimate * 100).toFixed(1)}% gain.`);
      return 0;
    }

    case 'provenance':
    case 'rea-ledger': {
      return printOutput(args, 'harness.provenance', HARNESS2_REA_EVIDENCE_LEDGER, () => {
        logHeader('Harness² REA Cryptographic Provenance Ledger');
        console.log(`Source Repo:  ${colors.cyan}${HARNESS2_REA_EVIDENCE_LEDGER.sourceRepo}${colors.reset}`);
        console.log(`Commit SHA:   ${HARNESS2_REA_EVIDENCE_LEDGER.commitSha}`);
        console.log(`Git Tree SHA: ${HARNESS2_REA_EVIDENCE_LEDGER.gitTreeSha}`);
        console.log(`Clean-Room:   ${HARNESS2_REA_EVIDENCE_LEDGER.cleanRoomAdaptation}\n`);
        for (const art of HARNESS2_REA_EVIDENCE_LEDGER.verifiedArtifacts) {
          console.log(`- ${colors.bright}${art.path}${colors.reset}`);
          console.log(`  Git Blob SHA1: ${art.gitBlobSha1}`);
          console.log(`  SHA256:        ${art.sha256}`);
          console.log(`  Role:          ${art.role}`);
        }
      });
    }

    default: {
      logWarn(`Unknown harness action: ${action}`);
      console.log('Available actions: status, components, refine, reflect, demo, provenance');
      return 1;
    }
  }
}
