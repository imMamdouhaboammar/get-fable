import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export type GitHooksPathResolution =
  | { kind: 'none' }
  | { kind: 'resolved'; hooksDir: string }
  | { kind: 'error'; message: string };

export const CANONICAL_GIT_HOOKS = [
  'pre-commit',
  'post-commit',
  'post-checkout',
  'pre-push',
] as const;

/**
 * Resolve the hooks directory using Git so linked worktrees and core.hooksPath
 * follow the same rules as Git itself. The directory fallback preserves support
 * for the lightweight `.git/` fixtures and not-yet-initialized repositories the
 * installer historically accepted.
 */
export function resolveGitHooksPath(targetDir: string): GitHooksPathResolution {
  const gitMarker = path.join(targetDir, '.git');
  let marker: fs.Stats;

  try {
    marker = fs.lstatSync(gitMarker);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'none' };
    return {
      kind: 'error',
      message: `Cannot inspect Git metadata at ${gitMarker}: ${formatProcessError(error)}`,
    };
  }

  const result = spawnSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-path', 'hooks'],
    { cwd: targetDir, encoding: 'utf-8', env: { ...process.env } }
  );
  const output = result.stdout?.trim();

  if (result.status === 0 && output) {
    if (!path.isAbsolute(output)) {
      return {
        kind: 'error',
        message: `Git returned a non-absolute hooks path for ${targetDir}: ${output}`,
      };
    }
    return validateHooksDirectory(path.normalize(output), targetDir);
  }

  // Preserve the historical lightweight fixture behavior only when `.git/` is
  // demonstrably empty. A populated Git directory must never silently bypass a
  // failed Git invocation because that would ignore worktree/config semantics.
  if (marker.isDirectory() && isSyntheticGitDirectory(gitMarker)) {
    return { kind: 'resolved', hooksDir: path.join(gitMarker, 'hooks') };
  }

  const detail = result.error
    ? formatProcessError(result.error)
    : (result.stderr?.trim() || `git exited with status ${result.status ?? 'unknown'}`);
  return {
    kind: 'error',
    message: `Cannot resolve Git hooks directory for ${targetDir}: ${detail}`,
  };
}

export function areCanonicalGitHooksInstalled(hooksDir: string): boolean {
  return CANONICAL_GIT_HOOKS.every((hook) => {
    try {
      return fs.statSync(path.join(hooksDir, hook)).isFile();
    } catch {
      return false;
    }
  });
}

function validateHooksDirectory(hooksDir: string, targetDir: string): GitHooksPathResolution {
  try {
    if (fs.statSync(hooksDir).isDirectory()) return { kind: 'resolved', hooksDir };
    return {
      kind: 'error',
      message: `Git hooks path for ${targetDir} is not a directory: ${hooksDir}`,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { kind: 'resolved', hooksDir };
    }
    return {
      kind: 'error',
      message: `Cannot inspect Git hooks path ${hooksDir}: ${formatProcessError(error)}`,
    };
  }
}

function isSyntheticGitDirectory(directory: string): boolean {
  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    if (entries.length === 0) return true;
    if (entries.length !== 1) return false;

    const [entry] = entries;
    return entry.name === 'hooks' && entry.isDirectory() && !entry.isSymbolicLink();
  } catch {
    return false;
  }
}

function formatProcessError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
