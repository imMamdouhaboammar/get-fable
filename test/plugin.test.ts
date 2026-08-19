import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const canonicalSkills = [
  'get-fable',
  'fable-discover',
  'fable-research',
  'fable-plan',
  'fable-tdd',
  'fable-delegate',
  'fable-execute',
  'fable-verify',
  'fable-review',
  'fable-security',
  'fable-release',
  'fable-handoff',
  'fable-eval',
  'fable-recover',
  'fable-dataviz',
  'fable-artifact',
  'fable-simplify',
  'fable-loop',
  'fable-run',
  'fable-memory',
  'fable-config',
  'fable-simulator',
  'fable-cowork',
  'fable-spark',
];

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf-8'));
}

function assertSquareSvg(relativePath: string) {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf-8');
  const viewBox = content.match(/viewBox=["']([^"']+)["']/i);

  if (viewBox) {
    const values = viewBox[1].trim().split(/[\s,]+/).map(Number);
    expect(values).toHaveLength(4);
    expect(values.every(Number.isFinite)).toBe(true);
    expect(values[2]).toBeGreaterThan(0);
    expect(values[2]).toBe(values[3]);
    return;
  }

  const width = content.match(/\bwidth=["']([0-9.]+)(?:px)?["']/i);
  const height = content.match(/\bheight=["']([0-9.]+)(?:px)?["']/i);
  expect(width).not.toBeNull();
  expect(height).not.toBeNull();
  expect(Number(width?.[1])).toBeGreaterThan(0);
  expect(Number(width?.[1])).toBe(Number(height?.[1]));
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
    expect(manifest.interface.shortDescription.length).toBeLessThanOrEqual(30);
    expect(manifest.interface?.longDescription).toBeTruthy();
    expect(manifest.interface?.developerName).toBeTruthy();
    expect(manifest.interface?.category).toBe('Developer Tools');
    expect(Array.isArray(manifest.interface?.capabilities)).toBe(true);
    expect(Array.isArray(manifest.interface?.defaultPrompt)).toBe(true);
    expect(manifest.interface.defaultPrompt.length).toBeGreaterThan(0);

    for (const assetKey of ['composerIcon', 'logo']) {
      const assetPath = manifest.interface?.[assetKey];
      expect(typeof assetPath).toBe('string');
      expect(assetPath.startsWith('./')).toBe(true);
      const relativePath = assetPath.slice(2);
      expect(fs.existsSync(path.join(root, relativePath))).toBe(true);
      assertSquareSvg(relativePath);
    }
  });

  test('skills root contains only importable skill directories', () => {
    const skillsRoot = path.join(root, 'skills');
    const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.isDirectory()).toBe(true);
      expect(fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md'))).toBe(true);
    }
  });

  test('canonical registry and skill files define the ordered lifecycle graph', () => {
    const registry = readJson('skills/get-fable/registry.json');
    expect(registry.schemaVersion).toBe(2);
    expect(registry.entry).toBe('get-fable');
    expect(registry.skills.map((skill: any) => skill.id)).toEqual(canonicalSkills);

    const ids = new Set(canonicalSkills);
    for (const entry of registry.skills) {
      expect(entry.next.every((next: string) => ids.has(next))).toBe(true);
      expect(entry.fallback === null || ids.has(entry.fallback)).toBe(true);
      expect(['core', 'intelligence', 'build', 'proof', 'delivery', 'evolution', 'system']).toContain(entry.pack);
      expect(Array.isArray(entry.intents)).toBe(true);
      expect(Array.isArray(entry.requires)).toBe(true);
      expect(Array.isArray(entry.produces)).toBe(true);
      expect(Array.isArray(entry.gates)).toBe(true);
      expect(typeof entry.mutatesWorkspace).toBe('boolean');
      expect(typeof entry.parallelSafe).toBe('boolean');
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

  test('Claude lifecycle hooks include mutation tracking and completion enforcement', () => {
    const hooks = readJson('hooks/hooks.json').hooks;
    const postToolUse = hooks.PostToolUse || [];
    const commands = JSON.stringify(postToolUse);
    expect(commands).toContain('fable_fail_streak.py');
    expect(commands).toContain('fable_mutation.py');
    expect(commands).toContain('Edit|Write|MultiEdit|NotebookEdit');
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

  test('declares a valid Claude Code marketplace manifest', () => {
    const marketplace = readJson('.claude-plugin/marketplace.json');
    expect(marketplace.name).toBe('get-fable');
    expect(marketplace.owner?.name).toBeTruthy();
    expect(marketplace.owner?.url).toBeTruthy();
    expect(Array.isArray(marketplace.plugins)).toBe(true);
    expect(marketplace.plugins.length).toBeGreaterThanOrEqual(1);

    const fablePlugin = marketplace.plugins.find((p: any) => p.name === 'get-fable');
    expect(fablePlugin).toBeDefined();
    expect(fablePlugin.source).toBe('./');
    expect(fablePlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(fablePlugin.description.length).toBeGreaterThan(0);
  });

  test('declares a valid Claude Code plugin manifest', () => {
    const plugin = readJson('.claude-plugin/plugin.json');
    expect(plugin.name).toBe('get-fable');
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(plugin.description.length).toBeGreaterThan(0);
    expect(plugin.author?.name).toBeTruthy();
    expect(plugin.skills).toBe('./skills/');
    expect(plugin.hooks).toBe('./hooks/hooks.json');
    expect(fs.existsSync(path.join(root, 'hooks', 'hooks.json'))).toBe(true);
  });

  test('registers Claude Bash success and failure lifecycle events', () => {
    const config = readJson('hooks/hooks.json');
    const hasFailureTracker = (event: string) =>
      config.hooks[event]?.some(
        (entry: any) =>
          entry.matcher === 'Bash' &&
          entry.hooks?.some((hook: any) => hook.command.includes('fable_fail_streak.py'))
      );

    expect(hasFailureTracker('PostToolUse')).toBe(true);
    expect(hasFailureTracker('PostToolUseFailure')).toBe(true);
  });

  test('npm package metadata includes the plugin surface and registry', () => {
    const pkg = readJson('package.json');

    for (const requiredPath of [
      '.claude-plugin/',
      '.codex-plugin/',
      '.chatgpt-plugin/',
      '.gemini-plugin/',
      '.cursor-plugin/',
      '.kimi-plugin/',
      '.opencode-plugin/',
      '.deepseek-plugin/',
      '.kiro-plugin/',
      '.pi-plugin/',
      '.codex/',
      'AGENTS.md',
      'SKILL.md',
      'skills.sh.json',
      'skills/',
      'assets/',
    ]) {
      expect(pkg.files).toContain(requiredPath);
    }
    expect(fs.existsSync(path.join(root, 'skills', 'get-fable', 'registry.json'))).toBe(true);
  });

  test('declares valid plugin and marketplace manifests for all 10 AI platforms', () => {
    const pluginTargets = [
      '.claude-plugin',
      '.codex-plugin',
      '.chatgpt-plugin',
      '.gemini-plugin',
      '.cursor-plugin',
      '.kimi-plugin',
      '.opencode-plugin',
      '.deepseek-plugin',
      '.kiro-plugin',
      '.pi-plugin',
    ];

    for (const target of pluginTargets) {
      const marketplacePath = path.join(root, target, 'marketplace.json');
      expect(fs.existsSync(marketplacePath)).toBe(true);
      const marketplace = readJson(`${target}/marketplace.json`);
      expect(marketplace.name).toBe('get-fable');
      expect(Array.isArray(marketplace.plugins)).toBe(true);

      const pluginManifestFile = target === '.chatgpt-plugin' ? 'ai-plugin.json' : 'plugin.json';
      const pluginPath = path.join(root, target, pluginManifestFile);
      expect(fs.existsSync(pluginPath)).toBe(true);
      const plugin = readJson(`${target}/${pluginManifestFile}`);
      expect(plugin).toBeDefined();
    }
  });

  test('declares valid Skills.sh catalog and root SKILL.md', () => {
    const skillMd = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf-8');
    expect(skillMd.startsWith('---\n')).toBe(true);
    expect(skillMd).toContain('name: get-fable');

    const skillsCatalog = readJson('skills.sh.json');
    expect(skillsCatalog.name).toBe('get-fable');
    expect(Array.isArray(skillsCatalog.skills)).toBe(true);
    expect(skillsCatalog.skills.length).toBe(24);
    for (const skill of skillsCatalog.skills) {
      expect(fs.existsSync(path.join(root, skill.path))).toBe(true);
    }
  });
});

