/**
 * Master Orchestrator for the UI/UX Polish Engine.
 * Coordinates Provisioning -> Preflight -> Harvesting -> Triage -> Repair Loop -> Regression Codification.
 */

import { UIPolishConfig, UIPolishReport, UIDefect, CANONICAL_VIEWPORTS } from './types.js';
import { ensureDependenciesProvisioned } from './provision.js';
import { runPreflight } from './preflight.js';
import { harvestPageDefects } from './harvester.js';
import { triageDefects } from './triage.js';
import { runClosedRepairLoop } from './repair-loop.js';
import { writeRegressionSuite } from './regression.js';

export * from './types.js';
export * from './provision.js';
export * from './preflight.js';
export * from './harvester.js';
export * from './triage.js';
export * from './repair-loop.js';
export * from './regression.js';

export function resolveUIPolishConfig(partial: Partial<UIPolishConfig>): UIPolishConfig {
  return {
    targetUrl: partial.targetUrl || 'http://127.0.0.1:3000',
    viewports: partial.viewports && partial.viewports.length > 0 ? partial.viewports : CANONICAL_VIEWPORTS,
    maxLoops: partial.maxLoops ?? 5,
    headed: partial.headed ?? false,
    autoInstall: partial.autoInstall ?? (!partial.dryRun),
    dryRun: partial.dryRun ?? false,
    timeoutMs: partial.timeoutMs ?? 30000,
    projectDir: partial.projectDir || process.cwd(),
    generateE2E: partial.generateE2E ?? true,
  };
}

export async function runUiPolishLoop(
  rawConfig: Partial<UIPolishConfig>
): Promise<UIPolishReport> {
  const config = resolveUIPolishConfig(rawConfig);
  const startTime = new Date().toISOString();
  const startTs = Date.now();
  const reportId = `ui-polish-${Date.now()}`;

  // Stage 0: Zero-Config Provisioning
  const provisionResult = await ensureDependenciesProvisioned(config.projectDir, config.autoInstall);

  // Stage 0b: Design Preflight
  const preflightResult = await runPreflight(config.projectDir, { dryRun: config.dryRun });

  // Stage 1 & 2: Surface Harvesting across declared viewports
  const harvestedDefects: UIDefect[] = [];
  const inventoriedRoutes = [config.targetUrl];

  for (const viewport of config.viewports) {
    const harvest = await harvestPageDefects(config, config.targetUrl, viewport);
    harvestedDefects.push(...harvest.defects);
  }

  // Stage 3: Defect Triage (P0, P1, P2 sorting)
  const triaged = triageDefects(harvestedDefects);

  // Stage 4: Closed-Loop Surgical Auto-Repair with Circuit Breaker
  const repairOutcome = runClosedRepairLoop(
    triaged.sorted,
    {
      projectDir: config.projectDir,
      dryRun: config.dryRun,
      consecutiveFailures: 0,
    },
    config.maxLoops
  );

  // Stage 5: Durable E2E Regression Codification
  if (config.generateE2E && harvestedDefects.length > 0) {
    writeRegressionSuite(config.projectDir, config.targetUrl, harvestedDefects);
  }

  const endTime = new Date().toISOString();
  const durationMs = Date.now() - startTs;

  return {
    id: reportId,
    targetUrl: config.targetUrl,
    startTime,
    endTime,
    durationMs,
    inventoriedRoutes,
    totalDefects: harvestedDefects.length,
    resolvedDefects: repairOutcome.resolvedCount,
    remainingDefects: harvestedDefects.length - repairOutcome.resolvedCount,
    circuitBreakerTripped: repairOutcome.circuitBreakerTripped,
    defects: harvestedDefects,
    evidenceStamp: {
      kind: 'review',
      source: 'fable-ui-polish',
      detail: `Verified UI polish round: ${harvestedDefects.length} detected, ${repairOutcome.resolvedCount} resolved`,
      generation: 1,
    },
  };
}
