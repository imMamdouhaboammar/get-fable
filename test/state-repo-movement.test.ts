import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  addEvidence,
  createInitialState,
  hasFreshPassingEvidence,
  transitionState,
  validateFableState,
} from '../src/core/state.ts';

function createTempGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-test-repo-'));
  execFileSync('git', ['init', '-b', 'master'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Fable Test'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@fable.local'], { cwd: dir, stdio: 'ignore' });
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test\n');
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'initial commit'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

describe('Issue #109: Invalidate completion evidence when repository contents move', () => {
  test('unchanged repository accepts fresh evidence and completes cleanly', () => {
    const repoDir = createTempGitRepo();
    try {
      const state = {
        ...createInitialState('2026-09-21T00:00:00.000Z', repoDir),
        phase: 'verifying' as const,
        substantial: true,
      };

      const evidencedState = addEvidence(state, {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'test passed cleanly',
      }, repoDir);

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(true);
      const completed = transitionState(evidencedState, 'complete', undefined, repoDir);
      expect(completed.phase).toBe('complete');
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  test('invalidates completion evidence when a new commit is created', () => {
    const repoDir = createTempGitRepo();
    try {
      const state = {
        ...createInitialState('2026-09-21T00:00:00.000Z', repoDir),
        phase: 'verifying' as const,
        substantial: true,
      };

      const evidencedState = addEvidence(state, {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'test passed at initial commit',
      }, repoDir);

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(true);

      // Now repository moves: a new commit is created
      fs.writeFileSync(path.join(repoDir, 'feature.txt'), 'new feature\n');
      execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', 'second commit'], { cwd: repoDir, stdio: 'ignore' });

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(false);
      expect(() => transitionState(evidencedState, 'complete', undefined, repoDir)).toThrow(
        'Substantial work cannot complete without passing evidence'
      );
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  test('invalidates completion evidence when branch moves', () => {
    const repoDir = createTempGitRepo();
    try {
      const state = {
        ...createInitialState('2026-09-21T00:00:00.000Z', repoDir),
        phase: 'verifying' as const,
        substantial: true,
      };

      const evidencedState = addEvidence(state, {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'test passed on master',
      }, repoDir);

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(true);

      // Switch to a new branch
      execFileSync('git', ['checkout', '-b', 'feature-branch'], { cwd: repoDir, stdio: 'ignore' });

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(false);
      expect(() => transitionState(evidencedState, 'complete', undefined, repoDir)).toThrow();
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  test('invalidates completion evidence on git reset to an earlier commit', () => {
    const repoDir = createTempGitRepo();
    try {
      fs.writeFileSync(path.join(repoDir, 'step2.txt'), 'second\n');
      execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', 'second commit'], { cwd: repoDir, stdio: 'ignore' });

      const state = {
        ...createInitialState('2026-09-21T00:00:00.000Z', repoDir),
        phase: 'verifying' as const,
        substantial: true,
      };

      const evidencedState = addEvidence(state, {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'test passed at second commit',
      }, repoDir);

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(true);

      // Reset to HEAD~1
      execFileSync('git', ['reset', '--hard', 'HEAD~1'], { cwd: repoDir, stdio: 'ignore' });

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(false);
      expect(() => transitionState(evidencedState, 'complete', undefined, repoDir)).toThrow();
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  test('invalidates completion evidence when dirty tree changes bypass hooks', () => {
    const repoDir = createTempGitRepo();
    try {
      const state = {
        ...createInitialState('2026-09-21T00:00:00.000Z', repoDir),
        phase: 'verifying' as const,
        substantial: true,
      };

      const evidencedState = addEvidence(state, {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'test passed before file edit',
      }, repoDir);

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(true);

      // Modify a source file directly
      fs.writeFileSync(path.join(repoDir, 'README.md'), '# Modified without hook\n');

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(false);
      expect(() => transitionState(evidencedState, 'complete', undefined, repoDir)).toThrow();
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  test('supports detached HEAD: valid on same commit, invalidated if detached HEAD moves', () => {
    const repoDir = createTempGitRepo();
    try {
      fs.writeFileSync(path.join(repoDir, 'c2.txt'), 'c2\n');
      execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', 'commit 2'], { cwd: repoDir, stdio: 'ignore' });
      const c2Sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf-8' }).trim();

      fs.writeFileSync(path.join(repoDir, 'c3.txt'), 'c3\n');
      execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', 'commit 3'], { cwd: repoDir, stdio: 'ignore' });

      // Checkout c2 detached
      execFileSync('git', ['checkout', c2Sha], { cwd: repoDir, stdio: 'ignore' });

      const state = {
        ...createInitialState('2026-09-21T00:00:00.000Z', repoDir),
        phase: 'verifying' as const,
        substantial: true,
      };

      const evidencedState = addEvidence(state, {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'test passed on detached commit 2',
      }, repoDir);

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(true);

      // Move detached HEAD to master
      execFileSync('git', ['checkout', 'master'], { cwd: repoDir, stdio: 'ignore' });

      expect(hasFreshPassingEvidence(evidencedState, repoDir)).toBe(false);
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  test('non-Git workspace: verified when unchanged, invalidated when modified', () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-test-nongit-'));
    try {
      fs.writeFileSync(path.join(nonGitDir, 'app.ts'), 'console.log("hello");\n');

      const state = {
        ...createInitialState('2026-09-21T00:00:00.000Z', nonGitDir),
        phase: 'verifying' as const,
        substantial: true,
      };

      const evidencedState = addEvidence(state, {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'test passed in non-git workspace',
      }, nonGitDir);

      expect(hasFreshPassingEvidence(evidencedState, nonGitDir)).toBe(true);

      // Mutate workspace file
      fs.writeFileSync(path.join(nonGitDir, 'app.ts'), 'console.log("changed");\n');

      expect(hasFreshPassingEvidence(evidencedState, nonGitDir)).toBe(false);
    } finally {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  });

  test('legacy evidence lacking repoState fails closed for substantial completion', () => {
    const repoDir = createTempGitRepo();
    try {
      const state = createInitialState('2026-09-21T00:00:00.000Z', repoDir);
      const legacyState = validateFableState({
        ...state,
        phase: 'verifying',
        substantial: true,
        verifiedGeneration: 0,
        evidence: [
          {
            kind: 'test',
            source: 'bun test',
            result: 'pass',
            detail: 'legacy evidence without repoState',
            generation: 0,
            timestamp: '2026-09-21T00:01:00.000Z',
            workspaceId: state.workspaceId,
            // repoState intentionally omitted
          },
        ],
      }, repoDir);

      expect(hasFreshPassingEvidence(legacyState, repoDir)).toBe(false);
      expect(() => transitionState(legacyState, 'complete', undefined, repoDir)).toThrow(
        'Substantial work cannot complete without passing evidence'
      );
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });
});
