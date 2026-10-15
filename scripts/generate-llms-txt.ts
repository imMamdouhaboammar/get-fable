import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'https://github.com/imMamdouhaboammar/get-fable';
const CORE_FILES = ['README.md', 'SECURITY.md', 'CONTRIBUTING.md', 'SUPPORT.md'];

function titleFor(markdown: string, fallback: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');
}

function descriptionFor(markdown: string): string {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const text = lines.find((line) => line && !line.startsWith('#') && !line.startsWith('```') && !line.startsWith('['));
  return (text || 'Project documentation').replace(/\s+/g, ' ').slice(0, 180).trim();
}

function documentationFiles(repoRoot: string): string[] {
  const docsDir = path.join(repoRoot, 'docs');
  const docs = fs.readdirSync(docsDir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => `docs/${name}`)
    .sort();
  return [...CORE_FILES, ...docs];
}
export function buildLlmsTxt(repoRoot: string): string {
  const entries = documentationFiles(repoRoot).map((relativePath) => {
    const absolutePath = path.join(repoRoot, relativePath);
    const markdown = fs.readFileSync(absolutePath, 'utf-8');
    const title = titleFor(markdown, path.basename(relativePath));
    const description = descriptionFor(markdown);
    const url = `${REPOSITORY}/blob/master/${relativePath}`;
    return `- [${title}](${url}): ${description}`;
  });

  return [
    '# get-fable',
    '',
    '> Evidence-driven coding lifecycle discipline and reusable Skills for AI coding agents.',
    '',
    '## Documentation',
    '',
    ...entries,
    '',
  ].join('\n');
}

function isDirectExecution(): boolean {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url));
}

if (isDirectExecution()) {
  const repoRoot = path.resolve(import.meta.dir, '..');
  const outputPath = path.join(repoRoot, 'public', 'llms.txt');
  const generated = buildLlmsTxt(repoRoot);
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : '';
    if (current !== generated) {
      console.error('public/llms.txt is stale; run bun run generate:llms');
      process.exitCode = 1;
    } else {
      console.log('public/llms.txt is current');
    }
  } else {
    fs.writeFileSync(outputPath, generated, 'utf-8');
    console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
  }
}
