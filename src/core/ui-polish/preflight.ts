/**
 * Design Contract & Preflight Validator.
 * Integrates unslop-preflight principles and validates PRODUCT.md / DESIGN.md.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PreflightResult } from './types.js';
import { isCommandAvailable } from './provision.js';
import { execSync } from 'child_process';

export async function runPreflight(
  projectDir: string = process.cwd(),
  options?: { dryRun?: boolean }
): Promise<PreflightResult> {
  const issues: string[] = [];

  const productMdPath = path.join(projectDir, 'PRODUCT.md');
  const designMdPath = path.join(projectDir, 'DESIGN.md');

  const hasProductMd = fs.existsSync(productMdPath);
  const hasDesignMd = fs.existsSync(designMdPath);

  if (!hasProductMd) {
    issues.push('Missing PRODUCT.md: No durable product and user persona document found.');
  }

  if (!hasDesignMd) {
    issues.push('Missing DESIGN.md: No design contract, token definition, or spacing rules found.');
  }

  // If DESIGN.md exists, verify token definitions (color palette, font-family, spacing)
  if (hasDesignMd) {
    const designContent = fs.readFileSync(designMdPath, 'utf-8');
    if (!designContent.includes('font') && !designContent.includes('typography')) {
      issues.push('DESIGN.md lacks typography / font scale definitions.');
    }
    if (!designContent.includes('color') && !designContent.includes('palette')) {
      issues.push('DESIGN.md lacks color palette / token definitions.');
    }
  }

  // Static scan with unslop-preflight if available (skip in dryRun)
  let reportPath: string | undefined;
  if (!options?.dryRun && isCommandAvailable('unslop-preflight')) {
    try {
      const srcDir = path.join(projectDir, 'src');
      if (fs.existsSync(srcDir)) {
        execSync('unslop-preflight scan src --strict --feel', {
          cwd: projectDir,
          stdio: 'pipe',
          timeout: 15000,
        });
      }
      const unslopDir = path.join(projectDir, '.unslop');
      if (fs.existsSync(unslopDir)) {
        reportPath = path.join(unslopDir, 'preflight.json');
      }
    } catch {
      // Non-fatal if scan surfaces warnings
    }
  }

  return {
    ok: issues.length === 0,
    hasProductMd,
    hasDesignMd,
    issues,
    reportPath,
  };
}
