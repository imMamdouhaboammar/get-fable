import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  installAntigravityGlobal,
  installClaudeGlobal,
  installCodexGlobal,
  installCursorGlobal,
  installCopilotGlobal,
  installDevinGlobal,
  installWindsurfGlobal,
  installReplitGlobal,
  installAmazonQGlobal,
  installTraeGlobal,
  installWarpGlobal,
  installGrokGlobal,
  installKimiGlobal,
  installAtlarixGlobal,
  installVellumGlobal,
  installCodegenGlobal,
  installMuseGlobal,
  installJunieGlobal,
  installQodoGlobal,
  installRooCodeGlobal,
  installAiderGlobal,
  installClineGlobal,
  installOpenHandsGlobal,
  installOpenCodeGlobal,
  installContinueGlobal,
  installKiloGlobal,
  installPlandexGlobal,
  installAutoGPTGlobal,
  installHermesGlobal,
  installDeepSeekGlobal,
  installKiroGlobal,
  installPiCodeGlobal,
} from '../../src/installer.ts';
import { HOST_CONTRACTS } from '../../src/core/host-contract.ts';
import { canonicalSkillIds } from '../../src/core/skill-registry.ts';

const installers: Record<string, (dir: string) => unknown> = {
  claude: installClaudeGlobal,
  antigravity: installAntigravityGlobal,
  codex: installCodexGlobal,
  cursor: installCursorGlobal,
  copilot: installCopilotGlobal,
  devin: installDevinGlobal,
  windsurf: installWindsurfGlobal,
  replit: installReplitGlobal,
  amazonq: installAmazonQGlobal,
  trae: installTraeGlobal,
  warp: installWarpGlobal,
  grok: installGrokGlobal,
  kimi: installKimiGlobal,
  atlarix: installAtlarixGlobal,
  vellum: installVellumGlobal,
  codegen: installCodegenGlobal,
  muse: installMuseGlobal,
  junie: installJunieGlobal,
  qodo: installQodoGlobal,
  roocode: installRooCodeGlobal,
  aider: installAiderGlobal,
  cline: installClineGlobal,
  openhands: installOpenHandsGlobal,
  opencode: installOpenCodeGlobal,
  continue: installContinueGlobal,
  kilo: installKiloGlobal,
  plandex: installPlandexGlobal,
  autogpt: installAutoGPTGlobal,
  hermes: installHermesGlobal,
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
  walk(root); return files;
}

describe('isolated host installer matrix', () => {
  test('every declared host installer matches its package and hook capability claims', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-host-matrix-'));
    try {
      for (const contract of HOST_CONTRACTS) {
        const hostRoot = path.join(root, contract.id);
        installers[contract.id](hostRoot);
        const files = recursiveFiles(hostRoot);
        expect(files.length).toBeGreaterThan(0);
        const packageSkillCount = canonicalSkillIds().filter((id) =>
          files.some((file) => file.endsWith(`skills/${id}/skill.package.json`) || file === `skills/${id}/skill.package.json`)
        ).length;
        if (contract.packages) expect(packageSkillCount).toBe(canonicalSkillIds().length);
        else expect(packageSkillCount).toBe(0);

        const hookFiles = files.filter((file) => /hooks?.*\.(py|js|json)$/i.test(file));
        if (contract.hooksRegistered) {
          expect(hookFiles.length).toBeGreaterThan(0);
          expect(files.some((file) => /settings\.json$|hooks\.json$/.test(file))).toBe(true);
        }
      }
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
