import fs from 'node:fs';
import path from 'node:path';
import { runSecurityProbes } from './probe.js';
import { generateMarkdownReport, summarizeFindings } from './reporter.js';
import { loadScopeConfig, validateScope } from './scope.js';
import type { RedTeamResult, ScanOptions } from './types.js';

export async function runRedTeamScan(
  options: ScanOptions,
  writeArtifacts = true
): Promise<RedTeamResult> {
  const scopeConfig = options.scopeConfig || loadScopeConfig(options.scopeFilePath);
  validateScope(options.target, scopeConfig);

  const startTime = new Date().toISOString();
  const findings = await runSecurityProbes({
    ...options,
    scopeConfig,
  });
  const endTime = new Date().toISOString();

  const summary = summarizeFindings(findings);
  const result: RedTeamResult = {
    target: options.target,
    profile: options.profile || 'passive',
    startTime,
    endTime,
    findings,
    summary,
  };

  if (writeArtifacts) {
    try {
      const docsDir = path.resolve(process.cwd(), 'docs/security');
      fs.mkdirSync(docsDir, { recursive: true });
      const reportPath = path.join(docsDir, 'REDTEAM_REPORT.md');
      fs.writeFileSync(reportPath, generateMarkdownReport(result), 'utf-8');
    } catch {
      // Best-effort artifact persistence
    }
  }

  return result;
}
