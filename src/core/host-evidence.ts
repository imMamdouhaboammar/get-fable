import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  installAntigravityGlobal,
  installClaudeGlobal,
  installCodexGlobal,
  installCursorGlobal,
  installDeepSeekGlobal,
  installKimiGlobal,
  installKiroGlobal,
  installOpenCodeGlobal,
  installPiCodeGlobal,
} from '../installer.js';
import { canonicalSkillIds } from './skill-registry.js';
import { HOST_CONTRACTS } from './host-contract.js';

export interface HostParityResult {
  id: string;
  passed: boolean;
  failures: string[];
}

export interface HostParityEvidence {
  total: number;
  passed: number;
  results: HostParityResult[];
}
const installers: Record<string, (dir: string) => unknown> = {
  claude: installClaudeGlobal,
  antigravity: installAntigravityGlobal,
  codex: installCodexGlobal,
  cursor: installCursorGlobal,
  opencode: installOpenCodeGlobal,
  kimi: installKimiGlobal,
  deepseek: installDeepSeekGlobal,
  kiro: installKiroGlobal,
  pi: installPiCodeGlobal,
};

function recursiveFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  };
  walk(root);
  return files;
}
function installedText(root: string, files: string[]): string {
  return files
    .filter((file) => /\.(json|md|mdc|py|js)$/i.test(file))
    .map((file) => {
      try { return fs.readFileSync(path.join(root, file), 'utf-8'); }
      catch { return ''; }
    })
    .join('\n');
}

export function evaluateHostInstallerParity(): HostParityEvidence {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-host-evidence-'));
  const results: HostParityResult[] = [];
  const originalLog = console.log;
  console.log = () => undefined;
  try {
    for (const contract of HOST_CONTRACTS) {
      const failures: string[] = [];
      const hostRoot = path.join(root, contract.id);
      const installer = installers[contract.id];
      if (!installer) {
        results.push({ id: contract.id, passed: false, failures: ['missing installer'] });
        continue;
      }
      installer(hostRoot);
      const files = recursiveFiles(hostRoot);
      const text = installedText(hostRoot, files);
      if (files.length === 0) failures.push('installer produced no files');
      const packageSkillCount = canonicalSkillIds().filter((id) =>
        files.some((file) => file.endsWith(`skills/${id}/skill.package.json`) || file === `skills/${id}/skill.package.json`)
      ).length;
      if (contract.packages && packageSkillCount !== canonicalSkillIds().length) {
        failures.push(`expected ${canonicalSkillIds().length} package manifests, found ${packageSkillCount}`);
      }
      if (!contract.packages && packageSkillCount !== 0) {
        failures.push(`unexpected package manifests: ${packageSkillCount}`);
      }
      const hasInstalledRules = files.some((file) => /(^|\/)rules\//.test(file)) ||
        (files.includes('CLAUDE.md') && /Fable/i.test(text));
      if (contract.rules && !hasInstalledRules) {
        failures.push('declared rules support but no host-native rule artifact was installed');
      }
      if (contract.hooksRegistered && !/fable_(mutation|close_guard)\.py/.test(text)) {
        failures.push('declared hook registration without mutation/completion hook evidence');
      }
      if (contract.mutationDetection && !text.includes('fable_mutation.py')) {
        failures.push('declared mutation detection without mutation hook');
      }
      if (contract.completionGuard && !text.includes('fable_close_guard.py')) {
        failures.push('declared completion guard without close guard hook');
      }
      results.push({ id: contract.id, passed: failures.length === 0, failures });
    }
  } finally {
    console.log = originalLog;
    fs.rmSync(root, { recursive: true, force: true });
  }
  return {
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    results,
  };
}
