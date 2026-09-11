import fs from 'node:fs';
import path from 'node:path';

const LIFECYCLE_FILES = ['state.json', 'state.lock', 'LEDGER.md', 'PROGRESS.md', 'VERIFIER_PROMPT.md'];

/** Validate existing entries before touching lifecycle data. This is not a TOCTOU defense. */
export function assertSafeFableBoundary(targetDir: string, create = false): string | null {
  const fableDir = path.join(targetDir, '.fable');
  let directory: fs.Stats;
  try {
    directory = fs.lstatSync(fableDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (!create) return null;
    fs.mkdirSync(fableDir, { recursive: true });
    directory = fs.lstatSync(fableDir);
  }
  if (!directory.isDirectory() || directory.isSymbolicLink()) {
    throw new Error('Unsafe .fable boundary: expected a real directory, not a symlink or special file');
  }
  for (const filename of LIFECYCLE_FILES) {
    let entry: fs.Stats;
    try {
      entry = fs.lstatSync(path.join(fableDir, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error(`Unsafe .fable/${filename}: expected a regular file, not a symlink or special file`);
    }
  }
  return fableDir;
}
