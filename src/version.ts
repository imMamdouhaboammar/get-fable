import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getPackageVersion(): string {
  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const packagePath = path.resolve(moduleDir, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as { version?: unknown };
    return typeof packageJson.version === 'string' ? packageJson.version : 'unknown';
  } catch {
    return 'unknown';
  }
}
