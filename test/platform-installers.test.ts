import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  installClaudeGlobal,
  installAntigravityGlobal,
  installGrokGlobal,
  installCodexGlobal,
  installCursorGlobal,
  installCopilotGlobal,
  installDevinGlobal,
  installWindsurfGlobal,
  installReplitGlobal,
  installAmazonQGlobal,
  installTraeGlobal,
  installWarpGlobal,
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
  installKimiGlobal,
  installDeepSeekGlobal,
  installKiroGlobal,
  installPiCodeGlobal,
  installGlobalFable,
  getFableStatus,
} from '../src/installer.ts';

const tempDirs: string[] = [];

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-platform-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Multi-agent platform installers across 30 tools', () => {
  test('installs Grok rules, canonical skills, plugins, and hooks', () => {
    const root = tempRoot();
    const grokDir = path.join(root, 'grok');
    installGrokGlobal(grokDir);

    expect(fs.existsSync(path.join(grokDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(grokDir, 'rules', 'fable5-mode.md'))).toBe(true);
    expect(fs.existsSync(path.join(grokDir, 'rules', 'grok-bot.md'))).toBe(true);
    expect(fs.existsSync(path.join(grokDir, 'skills', 'fable-tdd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(grokDir, 'skills', 'grok-bot', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(grokDir, 'plugins', 'get-fable', 'plugin.json'))).toBe(true);
    expect(fs.existsSync(path.join(grokDir, 'hooks', 'fable_mutation.py'))).toBe(true);
    expect(fs.existsSync(path.join(grokDir, 'hooks', 'fable_close_guard.py'))).toBe(true);
    expect(fs.existsSync(path.join(grokDir, 'hooks.json'))).toBe(true);
  });

  test('installs Codex rules, skills, and plugins', () => {
    const root = tempRoot();
    const codexDir = path.join(root, 'codex');
    installCodexGlobal(codexDir);

    expect(fs.existsSync(path.join(codexDir, 'rules', 'fable5-mode.md'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'skills', 'fable-tdd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'plugins', 'get-fable', '.codex-plugin', 'plugin.json'))).toBe(true);
  });

  test('installs Cursor rules', () => {
    const root = tempRoot();
    const cursorDir = path.join(root, 'cursor');
    installCursorGlobal(cursorDir);

    expect(fs.existsSync(path.join(cursorDir, 'rules', 'fable-lifecycle.mdc'))).toBe(true);
  });

  test('installs Copilot, Devin, Windsurf, and Replit', () => {
    const root = tempRoot();
    const copilotDir = path.join(root, 'copilot');
    const devinDir = path.join(root, 'devin');
    const windsurfDir = path.join(root, 'windsurf');
    const replitDir = path.join(root, 'replit');

    installCopilotGlobal(copilotDir);
    installDevinGlobal(devinDir);
    installWindsurfGlobal(windsurfDir);
    installReplitGlobal(replitDir);

    expect(fs.existsSync(path.join(copilotDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(devinDir, 'instructions.md'))).toBe(true);
    expect(fs.existsSync(path.join(devinDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(windsurfDir, 'rules.md'))).toBe(true);
    expect(fs.existsSync(path.join(replitDir, 'rules', 'fable.md'))).toBe(true);
  });

  test('installs Amazon Q, Trae, Warp, Atlarix, Vellum, Codegen, Muse, Junie, and Qodo', () => {
    const root = tempRoot();
    const amazonqDir = path.join(root, 'amazonq');
    const traeDir = path.join(root, 'trae');
    const warpDir = path.join(root, 'warp');
    const atlarixDir = path.join(root, 'atlarix');
    const vellumDir = path.join(root, 'vellum');
    const codegenDir = path.join(root, 'codegen');
    const museDir = path.join(root, 'muse');
    const junieDir = path.join(root, 'junie');
    const qodoDir = path.join(root, 'qodo');

    installAmazonQGlobal(amazonqDir);
    installTraeGlobal(traeDir);
    installWarpGlobal(warpDir);
    installAtlarixGlobal(atlarixDir);
    installVellumGlobal(vellumDir);
    installCodegenGlobal(codegenDir);
    installMuseGlobal(museDir);
    installJunieGlobal(junieDir);
    installQodoGlobal(qodoDir);

    expect(fs.existsSync(path.join(amazonqDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(traeDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(warpDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(atlarixDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(vellumDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(codegenDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(museDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(junieDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(qodoDir, 'rules', 'fable.md'))).toBe(true);
  });

  test('installs Roo Code, Aider, Cline, OpenHands, OpenCode, Continue, Kilo, Plandex, AutoGPT, and Hermes', () => {
    const root = tempRoot();
    const rooDir = path.join(root, 'roo');
    const aiderDir = path.join(root, 'aider');
    const clineDir = path.join(root, 'cline');
    const openhandsDir = path.join(root, 'openhands');
    const opencodeDir = path.join(root, 'opencode');
    const continueDir = path.join(root, 'continue');
    const kiloDir = path.join(root, 'kilo');
    const plandexDir = path.join(root, 'plandex');
    const autogptDir = path.join(root, 'autogpt');
    const hermesDir = path.join(root, 'hermes');

    installRooCodeGlobal(rooDir);
    installAiderGlobal(aiderDir);
    installClineGlobal(clineDir);
    installOpenHandsGlobal(openhandsDir);
    installOpenCodeGlobal(opencodeDir);
    installContinueGlobal(continueDir);
    installKiloGlobal(kiloDir);
    installPlandexGlobal(plandexDir);
    installAutoGPTGlobal(autogptDir);
    installHermesGlobal(hermesDir);

    expect(fs.existsSync(path.join(rooDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(rooDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(aiderDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(clineDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(clineDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(openhandsDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(openhandsDir, 'microagents', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(openhandsDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(opencodeDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(opencodeDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(continueDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(plandexDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(autogptDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(hermesDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(hermesDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
  });

  test('installs Kimi, DeepSeek, Kiro, and Pi Code rules', () => {
    const root = tempRoot();
    const kimiDir = path.join(root, 'kimi');
    const deepseekDir = path.join(root, 'deepseek');
    const kiroDir = path.join(root, 'kiro');
    const piDir = path.join(root, 'pi');

    installKimiGlobal(kimiDir);
    installDeepSeekGlobal(deepseekDir);
    installKiroGlobal(kiroDir);
    installPiCodeGlobal(piDir);

    expect(fs.existsSync(path.join(kimiDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(deepseekDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiroDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiroDir, 'hooks', 'fable_profile_inject.py'))).toBe(true);
    expect(fs.existsSync(path.join(piDir, 'rules', 'fable.md'))).toBe(true);
  });

  test('reports complete status for all platforms', () => {
    const root = tempRoot();
    const status = getFableStatus(root);

    expect(status.claude).toBeDefined();
    expect(status.antigravity).toBeDefined();
    expect(status.codex).toBeDefined();
    expect(status.cursor).toBeDefined();
    expect(status.copilot).toBeDefined();
    expect(status.devin).toBeDefined();
    expect(status.windsurf).toBeDefined();
    expect(status.replit).toBeDefined();
    expect(status.amazonq).toBeDefined();
    expect(status.trae).toBeDefined();
    expect(status.warp).toBeDefined();
    expect(status.grok).toBeDefined();
    expect(status.kimi).toBeDefined();
    expect(status.atlarix).toBeDefined();
    expect(status.vellum).toBeDefined();
    expect(status.codegen).toBeDefined();
    expect(status.muse).toBeDefined();
    expect(status.junie).toBeDefined();
    expect(status.qodo).toBeDefined();
    expect(status.roocode).toBeDefined();
    expect(status.aider).toBeDefined();
    expect(status.cline).toBeDefined();
    expect(status.openhands).toBeDefined();
    expect(status.opencode).toBeDefined();
    expect(status.continue).toBeDefined();
    expect(status.kilo).toBeDefined();
    expect(status.plandex).toBeDefined();
    expect(status.autogpt).toBeDefined();
    expect(status.hermes).toBeDefined();
    expect(status.deepseek).toBeDefined();
    expect(status.kiro).toBeDefined();
    expect(status.pi).toBeDefined();
    expect(status.agentKernel).toBeDefined();
    expect(status.gitHooks).toBeDefined();
    expect(status.project).toBeDefined();
  });
});
