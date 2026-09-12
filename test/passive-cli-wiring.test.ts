import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'bun:test';

const repoRoot = path.resolve(import.meta.dir, '..');
const tempDirs: string[] = [];

function tempHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-cli-wiring-'));
  tempDirs.push(dir);
  return dir;
}

function run(args: string[], home = tempHome()) {
  return spawnSync('bun', [path.join(repoRoot, 'bin', 'get-fable.js'), ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, HOME: home, CI: '' },
  });
}

function seedAnnouncementCache(home: string): void {
  const dir = path.join(home, '.fable', 'update');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'announcements-feed.json'),
    JSON.stringify({
      schemaVersion: 1,
      fetchedAt: '2099-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T06:00:00.000Z',
      value: {
        schemaVersion: 1,
        generatedAt: '2026-09-12T00:00:00.000Z',
        announcements: [
          {
            id: 'cached-1',
            type: 'info',
            title: 'Cached notice',
            message: 'Loaded without network access.',
            display: 'always',
          },
        ],
      },
    }),
    'utf-8'
  );
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('public CLI passive wiring', () => {
  test('non-TTY ordinary command remains deterministic with no passive notice', () => {
    const result = run(['version']);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    expect(result.stderr.trim()).toBe('');
  });

  test('machine output remains one uncontaminated JSON document', () => {
    const result = run(['status', '--json']);
    expect(result.status).toBe(0);
    expect(result.stderr.trim()).toBe('');
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  test('announcements list --json uses fresh local feed cache and emits one machine document', () => {
    const home = tempHome();
    seedAnnouncementCache(home);
    const result = run(['announcements', 'list', '--json'], home);

    expect(result.status).toBe(0);
    expect(result.stderr.trim()).toBe('');
    const parsed = JSON.parse(result.stdout) as { announcements: Array<{ id: string }> };
    expect(parsed.announcements.map((item) => item.id)).toEqual(['cached-1']);
  });

  test('entrypoint source routes announcements explicitly and passive awareness only after primary CLI success', () => {
    const source = fs.readFileSync(path.join(repoRoot, 'bin', 'get-fable.js'), 'utf-8');
    expect(source).toMatch(/command === 'announcements'/);
    expect(source).toMatch(/runDefaultAnnouncementsCli/);
    expect(source).toMatch(/runDefaultPassiveUpdateAwareness/);
    expect(source).toMatch(/runDefaultPassiveAnnouncements/);
    expect(source).toMatch(/process\.exitCode/);
  });
});
