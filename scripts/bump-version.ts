import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const NEW_VERSION = process.argv[2] || '1.5.0';
const OLD_VERSION = process.argv[3] || '1.4.0';

function updateJson(filePath: string, updater: (data: any) => void) {
  const fullPath = path.join(root, filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const json = JSON.parse(raw);
  updater(json);
  fs.writeFileSync(fullPath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  console.log(`✔ Updated ${filePath} to version ${NEW_VERSION}`);
}

function replaceInFile(filePath: string, search: string | RegExp, replace: string) {
  const fullPath = path.join(root, filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const updated = content.replace(search, replace);
  fs.writeFileSync(fullPath, updated, 'utf-8');
  console.log(`✔ Replaced in ${filePath}`);
}

// 1. package.json & skills.sh.json
updateJson('package.json', (j) => { j.version = NEW_VERSION; });
updateJson('skills.sh.json', (j) => { j.version = NEW_VERSION; });

// 2. Plugins
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
];

for (const pf of pluginFiles) {
  updateJson(pf, (j) => { j.version = NEW_VERSION; });
}

// Marketplaces
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
];

for (const mf of marketplaceFiles) {
  updateJson(mf, (j) => {
    if (j.metadata && typeof j.metadata === 'object') {
      j.metadata.version = NEW_VERSION;
    }
    if (j.version) j.version = NEW_VERSION;
    if (j.plugins && Array.isArray(j.plugins)) {
      for (const p of j.plugins) {
        if (p.version) p.version = NEW_VERSION;
      }
    }
  });
}

// 3. Packs
const packs = [
  'packs/core.json',
  'packs/intelligence.json',
  'packs/build.json',
  'packs/proof.json',
  'packs/delivery.json',
  'packs/evolution.json',
  'packs/system.json',
  'packs/creator.json',
];

for (const p of packs) {
  updateJson(p, (j) => { j.version = NEW_VERSION; });
}

// 4. Tools adapter
updateJson('tools/adapters/generic/index.json', (j) => { j.version = NEW_VERSION; });

// 5. Formula
replaceInFile('Formula/get-fable.rb', `version "${OLD_VERSION}"`, `version "${NEW_VERSION}"`);
replaceInFile('Formula/get-fable.rb', `v${OLD_VERSION}.tar.gz`, `v${NEW_VERSION}.tar.gz`);

// 6. Tests & docs
replaceInFile('test/cli.test.ts', `expect(getPackageVersion()).toBe('${OLD_VERSION}');`, `expect(getPackageVersion()).toBe('${NEW_VERSION}');`);
replaceInFile('test/updater.test.ts', `expect(result.currentVersion).toBe('${OLD_VERSION}');`, `expect(result.currentVersion).toBe('${NEW_VERSION}');`);
replaceInFile('test/updater.test.ts', `fetchLatestVersion('${OLD_VERSION}', 2000);`, `fetchLatestVersion('${NEW_VERSION}', 2000);`);
replaceInFile('docs/PLUGIN.md', `\`get-fable\` ${OLD_VERSION}`, `\`get-fable\` ${NEW_VERSION}`);
replaceInFile('public/llms.txt', `\`get-fable\` ${OLD_VERSION}`, `\`get-fable\` ${NEW_VERSION}`);

console.log(`\n🎉 Successfully bumped version from ${OLD_VERSION} to ${NEW_VERSION}!`);
