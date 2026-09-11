import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dir, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const version = pkg.version;
const distDir = path.join(root, 'dist');
const releaseDir = path.join(distDir, 'release');

fs.mkdirSync(releaseDir, { recursive: true });

// 1. Build Codex / ChatGPT clean plugin zip
const codexStaging = path.join(distDir, `get-fable-codex-plugin-v${version}`);
fs.rmSync(codexStaging, { recursive: true, force: true });
fs.mkdirSync(codexStaging, { recursive: true });

// Copy essential files
const copyRecursive = (src: string, dest: string) => {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
};

copyRecursive(path.join(root, '.codex-plugin'), path.join(codexStaging, '.codex-plugin'));
copyRecursive(path.join(root, '.chatgpt-plugin'), path.join(codexStaging, '.chatgpt-plugin'));
copyRecursive(path.join(root, '.codex'), path.join(codexStaging, '.codex'));
copyRecursive(path.join(root, 'skills'), path.join(codexStaging, 'skills'));
copyRecursive(path.join(root, 'hooks'), path.join(codexStaging, 'hooks'));
copyRecursive(path.join(root, 'assets'), path.join(codexStaging, 'assets'));
copyRecursive(path.join(root, 'prompts'), path.join(codexStaging, 'prompts'));

// Standard ChatGPT .well-known structure
fs.mkdirSync(path.join(codexStaging, '.well-known'), { recursive: true });
if (fs.existsSync(path.join(root, '.chatgpt-plugin', 'ai-plugin.json'))) {
  fs.copyFileSync(
    path.join(root, '.chatgpt-plugin', 'ai-plugin.json'),
    path.join(codexStaging, '.well-known', 'ai-plugin.json')
  );
}
if (fs.existsSync(path.join(root, '.chatgpt-plugin', 'openapi.json'))) {
  fs.copyFileSync(
    path.join(root, '.chatgpt-plugin', 'openapi.json'),
    path.join(codexStaging, 'openapi.json')
  );
}

fs.copyFileSync(path.join(root, 'README.md'), path.join(codexStaging, 'README.md'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(codexStaging, 'LICENSE'));
fs.copyFileSync(path.join(root, 'SKILL.md'), path.join(codexStaging, 'SKILL.md'));
fs.copyFileSync(path.join(root, 'AGENTS.md'), path.join(codexStaging, 'AGENTS.md'));

const codexZipPath = path.join(releaseDir, `get-fable-codex-plugin-v${version}.zip`);
const codexGenericZipPath = path.join(releaseDir, 'get-fable-codex-chatgpt-plugin.zip');
const codexDistZipPath = path.join(distDir, 'get-fable-codex-chatgpt-plugin.zip');

fs.rmSync(codexZipPath, { force: true });
fs.rmSync(codexGenericZipPath, { force: true });
fs.rmSync(codexDistZipPath, { force: true });

execFileSync('zip', ['-r', codexZipPath, '.'], { cwd: codexStaging, stdio: 'inherit' });
fs.copyFileSync(codexZipPath, codexGenericZipPath);
fs.copyFileSync(codexZipPath, codexDistZipPath);
console.log(`✔ Generated ${codexZipPath}`);
console.log(`✔ Generated ${codexGenericZipPath}`);
console.log(`✔ Generated ${codexDistZipPath}`);

// 2. Build Canonical Skills Pack zip
const skillsStaging = path.join(distDir, `get-fable-skills-pack-v${version}`);
fs.rmSync(skillsStaging, { recursive: true, force: true });
fs.mkdirSync(skillsStaging, { recursive: true });

copyRecursive(path.join(root, 'skills'), path.join(skillsStaging, 'skills'));
copyRecursive(path.join(root, 'packs'), path.join(skillsStaging, 'packs'));
fs.copyFileSync(path.join(root, 'skills.sh.json'), path.join(skillsStaging, 'skills.sh.json'));
fs.copyFileSync(path.join(root, 'README.md'), path.join(skillsStaging, 'README.md'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(skillsStaging, 'LICENSE'));

const skillsZipPath = path.join(releaseDir, `get-fable-skills-pack-v${version}.zip`);
fs.rmSync(skillsZipPath, { force: true });
execFileSync('zip', ['-r', skillsZipPath, '.'], { cwd: skillsStaging, stdio: 'inherit' });
console.log(`✔ Generated ${skillsZipPath}`);

// 3. Tarball
const tarPath = path.join(releaseDir, `get-fable-v${version}.tar.gz`);
fs.rmSync(tarPath, { force: true });
execFileSync('tar', ['-czf', tarPath, '--exclude=.git', '--exclude=node_modules', '--exclude=dist', '.'], { cwd: root, stdio: 'inherit' });
console.log(`✔ Generated ${tarPath}`);

console.log(`\n🎉 All release assets successfully packaged in ${releaseDir}!`);
