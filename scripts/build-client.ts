import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const outFile = join(projectRoot, 'dist/client.js');

execSync('bun build ./src/dsh/client/index.tsx --outfile ./dist/client.js --target browser', {
  cwd: projectRoot,
  stdio: 'inherit',
});

// Strip ESM export statements because DSH combos all client plugins into a classic <script>
let content = readFileSync(outFile, 'utf8');
content = content.replace(/export\s*\{[^}]*\}\s*;?/g, '/* stripped esm exports for dsh bundle */');
writeFileSync(outFile, content, 'utf8');
console.log('✓ Successfully sanitized dist/client.js for DSH classic script combo bundling');
