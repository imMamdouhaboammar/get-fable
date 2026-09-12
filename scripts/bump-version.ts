import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');

type JsonObject = Record<string, unknown>;

const pluginFiles = [
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.chatgpt-plugin/ai-plugin.json',
  '.gemini-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  '.opencode-plugin/plugin.json',
  '.deepseek-plugin/plugin.json',
  '.kimi-plugin/plugin.json',
  '.kiro-plugin/plugin.json',
  '.pi-plugin/plugin.json',
  '.grok-plugin/plugin.json',
  'assets/antigravity/plugin.json',
] as const;

const marketplaceFiles = [
  '.claude-plugin/marketplace.json',
  '.chatgpt-plugin/marketplace.json',
  '.codex-plugin/marketplace.json',
  '.gemini-plugin/marketplace.json',
  '.cursor-plugin/marketplace.json',
  '.opencode-plugin/marketplace.json',
  '.deepseek-plugin/marketplace.json',
  '.kimi-plugin/marketplace.json',
  '.kiro-plugin/marketplace.json',
  '.pi-plugin/marketplace.json',
  '.grok-plugin/marketplace.json',
] as const;

const packFiles = [
  'packs/core.json',
  'packs/intelligence.json',
  'packs/build.json',
  'packs/proof.json',
  'packs/delivery.json',
  'packs/evolution.json',
  'packs/system.json',
  'packs/creator.json',
] as const;

const plannedWrites = new Map<string, string>();

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequired(filePath: string): string {
  const fullPath = path.join(root, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required version metadata file is missing: ${filePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

function readPlanned(filePath: string): string {
  return plannedWrites.get(filePath) ?? readRequired(filePath);
}

function parseObject(filePath: string): JsonObject {
  const parsed: unknown = JSON.parse(readPlanned(filePath));
  if (!isObject(parsed)) {
    throw new Error(`Expected a JSON object in ${filePath}`);
  }
  return parsed;
}

function planJson(filePath: string, json: JsonObject): void {
  plannedWrites.set(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

function expectVersion(value: unknown, expectedVersion: string, location: string): void {
  if (value !== expectedVersion) {
    throw new Error(
      `Expected ${location} to be version ${expectedVersion}, found ${String(value)}`
    );
  }
}

function planRootVersion(filePath: string, oldVersion: string, newVersion: string): void {
  const json = parseObject(filePath);
  expectVersion(json.version, oldVersion, `${filePath}#version`);
  json.version = newVersion;
  planJson(filePath, json);
}

function planMarketplaceVersion(filePath: string, oldVersion: string, newVersion: string): void {
  const json = parseObject(filePath);
  if (!isObject(json.metadata)) {
    throw new Error(`Expected ${filePath}#metadata to be an object`);
  }
  expectVersion(json.metadata.version, oldVersion, `${filePath}#metadata.version`);
  json.metadata.version = newVersion;

  if ('version' in json) {
    expectVersion(json.version, oldVersion, `${filePath}#version`);
    json.version = newVersion;
  }

  if (!Array.isArray(json.plugins) || json.plugins.length === 0) {
    throw new Error(`Expected ${filePath}#plugins to contain at least one plugin`);
  }

  json.plugins.forEach((plugin, index) => {
    if (!isObject(plugin)) {
      throw new Error(`Expected ${filePath}#plugins[${index}] to be an object`);
    }
    expectVersion(plugin.version, oldVersion, `${filePath}#plugins[${index}].version`);
    plugin.version = newVersion;
  });

  planJson(filePath, json);
}

function planRequiredReplacement(
  filePath: string,
  search: string,
  replacement: string,
  label: string
): void {
  const content = readPlanned(filePath);
  const firstMatch = content.indexOf(search);
  if (firstMatch === -1) {
    throw new Error(`Required ${label} replacement was not found in ${filePath}`);
  }
  if (content.indexOf(search, firstMatch + search.length) !== -1) {
    throw new Error(`Required ${label} replacement is ambiguous in ${filePath}`);
  }

  plannedWrites.set(
    filePath,
    `${content.slice(0, firstMatch)}${replacement}${content.slice(firstMatch + search.length)}`
  );
}

function releaseAssetUrl(version: string): string {
  return `https://github.com/imMamdouhaboammar/get-fable/releases/download/v${version}/get-fable-v${version}.tar.gz`;
}

function buildPlan(newVersion: string, expectedOldVersion?: string): string {
  if (!newVersion) {
    throw new Error('Usage: bun scripts/bump-version.ts <new-version> [expected-old-version]');
  }

  const packageJson = parseObject('package.json');
  if (typeof packageJson.version !== 'string') {
    throw new Error('package.json version is missing');
  }

  const oldVersion = expectedOldVersion ?? packageJson.version;
  expectVersion(packageJson.version, oldVersion, 'package.json#version');
  if (newVersion === oldVersion) {
    throw new Error(`New version must differ from current version ${oldVersion}`);
  }

  packageJson.version = newVersion;
  planJson('package.json', packageJson);
  planRootVersion('skills.sh.json', oldVersion, newVersion);

  for (const filePath of pluginFiles) {
    planRootVersion(filePath, oldVersion, newVersion);
  }
  for (const filePath of marketplaceFiles) {
    planMarketplaceVersion(filePath, oldVersion, newVersion);
  }
  for (const filePath of packFiles) {
    planRootVersion(filePath, oldVersion, newVersion);
  }
  planRootVersion('tools/adapters/generic/index.json', oldVersion, newVersion);

  planRequiredReplacement(
    'Formula/get-fable.rb',
    `version "${oldVersion}"`,
    `version "${newVersion}"`,
    'Homebrew version'
  );
  planRequiredReplacement(
    'Formula/get-fable.rb',
    releaseAssetUrl(oldVersion),
    releaseAssetUrl(newVersion),
    'Homebrew release URL'
  );

  planRequiredReplacement(
    'docs/PLUGIN.md',
    `\`get-fable\` ${oldVersion}`,
    `\`get-fable\` ${newVersion}`,
    'plugin documentation version'
  );
  planRequiredReplacement(
    'public/llms.txt',
    `\`get-fable\` ${oldVersion}`,
    `\`get-fable\` ${newVersion}`,
    'llms.txt version'
  );

  return oldVersion;
}

function applyPlan(): void {
  for (const [filePath, content] of plannedWrites) {
    fs.writeFileSync(path.join(root, filePath), content, 'utf-8');
    console.log(`✔ Updated ${filePath}`);
  }
}

function main(): void {
  const newVersion = process.argv[2];
  const expectedOldVersion = process.argv[3];
  const oldVersion = buildPlan(newVersion, expectedOldVersion);
  applyPlan();
  console.log(`\n✔ Bumped release metadata from ${oldVersion} to ${newVersion}`);
  console.log('Next: package the release tarball, refresh Formula/get-fable.rb sha256, then run the release consistency gate.');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Version bump failed: ${message}`);
  process.exitCode = 1;
}
