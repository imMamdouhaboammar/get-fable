import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const canonicalSkills = [
  'get-fable',
  'fable-discover',
  'fable-plan',
  'fable-execute',
  'fable-verify',
  'fable-recover',
];

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf-8'));
}

describe('OpenAI plugin package', () => {
  test('declares a valid skill-only plugin manifest', () => {
    const manifest = readJson('.codex-plugin/plugin.json');
    const allowedKeys = new Set([
      'id',
      'name',
      'version',
      'description',
      'skills',
      'apps',
      'mcpServers',
      'interface',
      'author',
      'homepage',
      'repository',
      'license',
      'keywords',
    ]);

    expect(Object.keys(manifest).every((key) => allowedKeys.has(key))).toBe(true);
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
    expect(Array.isArray(manifest.interface?.capabilities)).toBe(true);
    expect(Array.isArray(manifest.interface?.defaultPrompt)).toBe(true);
    expect(manifest.interface.defaultPrompt.length).toBeGreaterThan(0);
  });

  test('canonical registry and skill files define one ordered workflow graph', () => {
    const registry = readJson('skills/registry.json');
    expect(registry.schemaVersion).toBe(1);
    expect(registry.entry).toBe('get-fable');
    expect(registry.skills.map((skill: any) => skill.id)).toEqual(canonicalSkills);

    const ids = new Set(canonicalSkills);
    for (const entry of registry.skills) {
      expect(entry.next.every((next: string) => ids.has(next))).toBe(true);
      expect(Array.isArray(entry.keywords)).toBe(true);
    }

    for (const skill of canonicalSkills) {
      const skillPath = path.join(root, 'skills', skill, 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.startsWith('---\n')).toBe(true);
      expect(content).toContain(`name: ${skill}`);
      expect(content).toMatch(/\ndescription: .+\n/);
      expect(content.indexOf('\n---', 4)).toBeGreaterThan(4);
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

  test('Codex agent routing points only to existing unpinned profiles', () => {
    const config = fs.readFileSync(path.join(root, '.codex', 'config.toml'), 'utf-8');
    const refs = [...config.matchAll(/config_file\s*=\s*"([^"]+)"/g)].map((match) => match[1]);

    expect(refs.length).toBeGreaterThanOrEqual(7);
    for (const ref of refs) {
      const profilePath = path.join(root, '.codex', ref);
      expect(fs.existsSync(profilePath)).toBe(true);
      const profile = fs.readFileSync(profilePath, 'utf-8');
      expect(profile).not.toMatch(/^model\s*=/m);
      expect(profile).not.toMatch(/^model_reasoning_effort\s*=/m);
    }
  });

  test('npm package metadata includes the plugin surface and registry', () => {
    const pkg = readJson('package.json');

    for (const requiredPath of ['.codex-plugin/', '.codex/', 'AGENTS.md', 'skills/']) {
      expect(pkg.files).toContain(requiredPath);
    }
    expect(fs.existsSync(path.join(root, 'skills', 'registry.json'))).toBe(true);
  });
});
