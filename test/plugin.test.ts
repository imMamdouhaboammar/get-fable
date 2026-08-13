import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf-8'));
}

describe('OpenAI plugin package', () => {
  test('declares a valid skill-only plugin manifest', () => {
    const manifest = readJson('.codex-plugin/plugin.json');

    expect(manifest.name).toBe('get-fable');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.author?.name).toBeTruthy();
    expect(manifest.skills).toBe('./skills/');
    expect(manifest.mcpServers).toBeUndefined();
    expect(manifest.apps).toBeUndefined();
    expect(manifest.hooks).toBeUndefined();
    expect(manifest.interface?.displayName).toBeTruthy();
    expect(manifest.interface?.shortDescription).toBeTruthy();
    expect(manifest.interface?.longDescription).toBeTruthy();
    expect(manifest.interface?.developerName).toBeTruthy();
    expect(manifest.interface?.category).toBeTruthy();
  });

  test('all declared routing targets exist as skills', () => {
    const skills = ['get-fable', 'fable-plan', 'fable-execute', 'fable-verify', 'fable-recover'];

    for (const skill of skills) {
      const skillPath = path.join(root, 'skills', skill, 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toContain(`name: ${skill}`);
    }
  });

  test('router skill references no missing fable skill', () => {
    const router = fs.readFileSync(path.join(root, 'skills', 'get-fable', 'SKILL.md'), 'utf-8');
    const refs = [...router.matchAll(/\$([a-z0-9-]+)/g)].map((match) => match[1]);
    const uniqueRefs = [...new Set(refs)];

    for (const ref of uniqueRefs) {
      expect(fs.existsSync(path.join(root, 'skills', ref, 'SKILL.md'))).toBe(true);
    }
  });
});
