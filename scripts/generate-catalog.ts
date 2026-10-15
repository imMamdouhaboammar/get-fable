import path from 'node:path';
import { checkCatalogArtifacts, generateCatalogArtifacts } from '../src/core/catalog-generator.ts';

const root = path.resolve(import.meta.dir, '..');
const checkOnly = process.argv.includes('--check');
if (checkOnly) {
  const result = checkCatalogArtifacts(root);
  if (!result.ok) {
    console.error(`Generated catalog drift: ${result.drift.join(', ')}`);
    process.exit(1);
  }
  console.log('Generated catalog artifacts are current');
} else {
  const changed = generateCatalogArtifacts(root);
  console.log(changed.length ? `Updated: ${changed.join(', ')}` : 'Generated catalog artifacts already current');
}
