/**
 * Zero-config auto-provisioner for UI/UX Polish dependencies.
 * Detects and installs agent-browser, unslop-preflight, and e2e runners.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ProvisionStatus {
  bun: boolean;
  agentBrowser: boolean;
  unslopPreflight: boolean;
  e2e: boolean;
  e2eWeb: boolean;
}

export function isCommandAvailable(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function checkProjectDependency(projectDir: string, pkgName: string): boolean {
  try {
    const pkgPath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies,
      ...pkgJson.peerDependencies,
    };
    return Boolean(allDeps[pkgName]);
  } catch {
    return false;
  }
}

export function checkProvisionStatus(projectDir: string = process.cwd()): ProvisionStatus {
  return {
    bun: isCommandAvailable('bun'),
    agentBrowser: isCommandAvailable('agent-browser'),
    unslopPreflight: isCommandAvailable('unslop-preflight'),
    e2e: checkProjectDependency(projectDir, 'e2e') || isCommandAvailable('e2e'),
    e2eWeb: checkProjectDependency(projectDir, '@e2e-dev/web'),
  };
}

export interface ProvisionResult {
  ok: boolean;
  installed: string[];
  errors: string[];
  status: ProvisionStatus;
}

export async function ensureDependenciesProvisioned(
  projectDir: string = process.cwd(),
  autoInstall: boolean = true
): Promise<ProvisionResult> {
  const initialStatus = checkProvisionStatus(projectDir);
  const installed: string[] = [];
  const errors: string[] = [];

  if (!initialStatus.bun) {
    errors.push('Bun runtime is required. Please install Bun from https://bun.sh');
    return { ok: false, installed, errors, status: initialStatus };
  }

  if (!autoInstall) {
    const missing: string[] = [];
    if (!initialStatus.agentBrowser) missing.push('agent-browser (global)');
    if (!initialStatus.unslopPreflight) missing.push('unslop-preflight (global)');
    if (!initialStatus.e2e) missing.push('e2e (local devDependency)');
    if (missing.length > 0) {
      errors.push(`Missing dependencies: ${missing.join(', ')}. Pass autoInstall: true to install.`);
      return { ok: false, installed, errors, status: initialStatus };
    }
    return { ok: true, installed, errors, status: initialStatus };
  }

  // Auto-install agent-browser globally if missing
  if (!initialStatus.agentBrowser) {
    try {
      execSync('bun add -g agent-browser', { stdio: 'pipe' });
      execSync('agent-browser install', { stdio: 'pipe' });
      installed.push('agent-browser');
    } catch (err: any) {
      errors.push(`Failed to install agent-browser: ${err.message || String(err)}`);
    }
  }

  // Auto-install unslop-preflight globally if missing
  if (!initialStatus.unslopPreflight) {
    try {
      execSync('bun add -g unslop-preflight', { stdio: 'pipe' });
      installed.push('unslop-preflight');
    } catch (err: any) {
      errors.push(`Failed to install unslop-preflight: ${err.message || String(err)}`);
    }
  }

  // Auto-install e2e & @e2e-dev/web locally in project if package.json exists
  const hasPkg = fs.existsSync(path.join(projectDir, 'package.json'));
  if (hasPkg && (!initialStatus.e2e || !initialStatus.e2eWeb)) {
    try {
      execSync('bun add -d e2e @e2e-dev/web', { cwd: projectDir, stdio: 'pipe' });
      installed.push('e2e, @e2e-dev/web');
    } catch (err: any) {
      // Local package install failure can be non-fatal if mock/exploration works
      errors.push(`Failed to install e2e dependencies locally: ${err.message || String(err)}`);
    }
  }

  const finalStatus = checkProvisionStatus(projectDir);
  const isOk = errors.length === 0 || (finalStatus.bun && (finalStatus.agentBrowser || installed.includes('agent-browser')));

  return {
    ok: isOk,
    installed,
    errors,
    status: finalStatus,
  };
}
