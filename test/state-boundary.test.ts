import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInitialState, readFableState, writeFableState, withFableStateTransaction } from '../src/core/state.ts';
import { getFableStatus, initProjectFable } from '../src/installer.ts';
import { runDoctor, runDoctorFix } from '../src/core/doctor.ts';
import { runFableLint } from '../src/fable-lint.ts';

const root = path.resolve(import.meta.dir, '..');
const dirs: string[] = [];
function workspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-boundary-'));
  dirs.push(dir);
  return dir;
}
function hook(name: string, cwd: string, extra: Record<string, unknown> = {}) {
  return spawnSync('python3', [path.join(root, 'hooks', name)], {
    input: JSON.stringify({ cwd, ...extra }), encoding: 'utf-8', timeout: 2500,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
}
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

describe('local lifecycle filesystem boundary', () => {
  test('dangling .fable is diagnosed as invalid rather than absent', () => {
    const dir = workspace();
    fs.symlinkSync(path.join(workspace(), 'missing'), path.join(dir, '.fable'));
    expect(getFableStatus(dir).project.phase).toBe('invalid');
    expect(runDoctor(dir).checks.find(check => check.id === 'project-state')?.status).toBe('ERROR');
    expect(hook('fable_close_guard.py', dir, { stop_hook_active: true }).status).toBe(2);
  }, 30000);

  test.each(['state.json', 'state.lock', 'LEDGER.md', 'PROGRESS.md', 'VERIFIER_PROMPT.md'])('special-file %s is rejected by reads, writes, and Stop', filename => {
    const dir = workspace();
    writeFableState(dir, createInitialState(undefined, dir));
    const target = path.join(dir, '.fable', filename);
    if (fs.existsSync(target)) fs.unlinkSync(target);
    expect(spawnSync('mkfifo', [target]).status).toBe(0);
    expect(() => readFableState(dir)).toThrow(/unsafe/i);
    expect(() => writeFableState(dir, createInitialState(undefined, dir))).toThrow(/unsafe/i);
    const mutation = hook('fable_mutation.py', dir, { tool_name: 'Edit' });
    expect(mutation.error).toBeUndefined();
    expect(mutation.status).toBe(0);
    expect(hook('fable_close_guard.py', dir, { stop_hook_active: true }).status).toBe(2);
    expect(fs.lstatSync(target).isFIFO()).toBe(true);
  });

  test('non-directory opt-in boundary does not become absent or reach ancestor state', () => {
    const outer = workspace();
    writeFableState(outer, createInitialState(undefined, outer));
    const dir = path.join(outer, 'nested');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, '.fable'), 'invalid opt-in');
    const before = fs.readFileSync(path.join(outer, '.fable', 'state.json'), 'utf-8');
    expect(() => readFableState(dir)).toThrow(/unsafe/i);
    expect(hook('fable_close_guard.py', dir).status).toBe(2);
    hook('fable_mutation.py', dir, { tool_name: 'Edit' });
    expect(fs.readFileSync(path.join(outer, '.fable', 'state.json'), 'utf-8')).toBe(before);
  });

  test.each(['symlink', 'file'])('state writer refuses a pre-existing %s temporary file without deleting it', kind => {
    const dir = workspace();
    const outside = workspace();
    const state = createInitialState(undefined, dir);
    writeFableState(dir, state);
    const stateBefore = fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8');
    const target = path.join(outside, 'private');
    fs.writeFileSync(target, 'unchanged');
    const timestamp = 1234567890;
    const temp = path.join(dir, '.fable', `.state.json.${process.pid}.${timestamp}.tmp`);
    if (kind === 'symlink') fs.symlinkSync(target, temp);
    else fs.writeFileSync(temp, 'owned by someone else');
    const originalNow = Date.now;
    try {
      Date.now = () => timestamp;
      expect(() => writeFableState(dir, state)).toThrow();
    } finally {
      Date.now = originalNow;
    }
    expect(fs.readFileSync(target, 'utf-8')).toBe('unchanged');
    expect(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8')).toBe(stateBefore);
    expect(fs.lstatSync(path.join(dir, '.fable', 'state.json')).isSymbolicLink()).toBe(false);
    expect(fs.lstatSync(temp).isSymbolicLink()).toBe(kind === 'symlink');
    if (kind === 'file') expect(fs.readFileSync(temp, 'utf-8')).toBe('owned by someone else');
  });

  test('symlinked .fable cannot read, write, initialize, repair, or allow Stop', () => {
    const dir = workspace();
    const outside = workspace();
    fs.mkdirSync(path.join(outside, '.fable'));
    // Correct workspace identity prevents unrelated identity validation masking the bug.
    const state = createInitialState(undefined, dir);
    const target = path.join(outside, '.fable', 'state.json');
    fs.writeFileSync(target, JSON.stringify(state));
    fs.symlinkSync(path.join(outside, '.fable'), path.join(dir, '.fable'));
    const before = fs.readFileSync(target, 'utf-8');
    expect(() => readFableState(dir)).toThrow(/unsafe|symlink|boundary/i);
    expect(() => writeFableState(dir, state)).toThrow(/unsafe|symlink|boundary/i);
    expect(() => initProjectFable(dir)).toThrow(/unsafe|symlink|boundary/i);
    expect(runDoctorFix(dir, root).errors.length).toBeGreaterThan(0);
    expect(hook('fable_mutation.py', dir, { tool_name: 'Edit' }).status).toBe(0);
    expect(fs.readFileSync(target, 'utf-8')).toBe(before);
    expect(fs.readdirSync(path.join(outside, '.fable'))).toEqual(['state.json']);
    for (const stop_hook_active of [false, true]) {
      expect(hook('fable_close_guard.py', dir, { stop_hook_active }).status).toBe(2);
    }
  });

  test.each(['state.json', 'state.lock', 'LEDGER.md', 'PROGRESS.md', 'VERIFIER_PROMPT.md'])('preflights dangling %s before any initialization or repair write', filename => {
    const dir = workspace();
    const outside = workspace();
    fs.mkdirSync(path.join(dir, '.fable'));
    const target = path.join(outside, 'missing');
    fs.symlinkSync(target, path.join(dir, '.fable', filename));
    expect(() => initProjectFable(dir)).toThrow(/unsafe|symlink|boundary/i);
    expect(runDoctorFix(dir, root).errors.length).toBeGreaterThan(0);
    expect(fs.existsSync(target)).toBe(false);
    expect(fs.readdirSync(dir)).toEqual(['.fable']);
    expect(fs.readdirSync(path.join(dir, '.fable'))).toEqual([filename]);
    expect(hook('fable_close_guard.py', dir).status).toBe(2);
  });

  test('linked state and ledger do not disclose external content or mutate targets', () => {
    const dir = workspace();
    const outside = workspace();
    fs.mkdirSync(path.join(dir, '.fable'));
    const target = path.join(outside, 'private');
    fs.writeFileSync(target, '- [ ] PRIVATE_BOUNDARY_SENTINEL acceptance test\n');
    fs.symlinkSync(target, path.join(dir, '.fable', 'LEDGER.md'));
    expect(runFableLint(dir)).toBe(false);
    const result = hook('fable_profile_inject.py', dir);
    expect(result.stdout).not.toContain('PRIVATE_BOUNDARY_SENTINEL');
    const lint = spawnSync('python3', [path.join(root, 'hooks/fable_lint.py'), dir], {
      encoding: 'utf-8', timeout: 2500,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });
    expect(lint.status).toBe(1);
    expect(lint.stdout).not.toContain('PRIVATE_BOUNDARY_SENTINEL');
    expect(hook('fable_close_guard.py', dir).status).toBe(2);
    fs.unlinkSync(path.join(dir, '.fable', 'LEDGER.md'));
    fs.writeFileSync(target, JSON.stringify(createInitialState(undefined, dir)));
    fs.symlinkSync(target, path.join(dir, '.fable', 'state.json'));
    const before = fs.readFileSync(target, 'utf-8');
    expect(() => readFableState(dir)).toThrow(/unsafe|symlink|boundary/i);
    expect(() => withFableStateTransaction(dir, state => state)).toThrow(/unsafe|symlink|boundary/i);
    hook('fable_mutation.py', dir, { tool_name: 'Edit' });
    expect(fs.readFileSync(target, 'utf-8')).toBe(before);
    expect(fs.lstatSync(path.join(dir, '.fable', 'state.json')).isSymbolicLink()).toBe(true);
  });

  test('stale FIFO lock is rejected without blocking TypeScript or Python', () => {
    const dir = workspace();
    writeFableState(dir, createInitialState(undefined, dir));
    const lock = path.join(dir, '.fable', 'state.lock');
    expect(spawnSync('mkfifo', [lock]).status).toBe(0);
    fs.utimesSync(lock, new Date(0), new Date(0));
    const source = `import {withFableStateTransaction} from ${JSON.stringify(path.join(root, 'src/core/state.ts'))}; try { withFableStateTransaction(${JSON.stringify(dir)}, s => s); process.exit(9); } catch { process.exit(0); }`;
    const ts = spawnSync(process.execPath, ['--eval', source], { encoding: 'utf-8', timeout: 2500 });
    expect(ts.error).toBeUndefined();
    expect(ts.status).toBe(0);
    const py = hook('fable_mutation.py', dir, { tool_name: 'Edit' });
    expect(py.error).toBeUndefined();
    expect(py.status).toBe(0);
    expect(fs.lstatSync(lock).isFIFO()).toBe(true);
    expect(hook('fable_close_guard.py', dir).status).toBe(2);
  }, 10000);

  test.each(['events.jsonl', 'events.jsonl.tmp'])('observer refuses symlinked %s before journal mutation', filename => {
    const dir = workspace();
    const outside = workspace();
    fs.mkdirSync(path.join(dir, '.fable'));
    const target = path.join(outside, 'private');
    fs.writeFileSync(target, 'unchanged');
    if (filename.endsWith('.tmp')) fs.writeFileSync(path.join(dir, '.fable', 'events.jsonl'), 'x'.repeat(300000));
    fs.symlinkSync(target, path.join(dir, '.fable', filename));
    const result = hook('fable_event_observer.py', dir, { hook_event_name: 'SessionStart' });
    expect(result.status).toBe(0);
    expect(fs.readFileSync(target, 'utf-8')).toBe('unchanged');
    expect(fs.lstatSync(path.join(dir, '.fable', filename)).isSymbolicLink()).toBe(true);
  });

  test('absent opt-in and symlinked workspace remain supported', () => {
    const dir = workspace();
    expect(readFableState(dir)).toBeNull();
    expect(hook('fable_close_guard.py', dir).status).toBe(0);
    const alias = path.join(workspace(), 'workspace');
    fs.symlinkSync(dir, alias);
    writeFableState(alias, createInitialState(undefined, alias));
    expect(readFableState(alias)?.phase).toBe('idle');
    expect(withFableStateTransaction(alias, state => state).stateRevision).toBe(1);
    expect(hook('fable_close_guard.py', alias).status).toBe(0);
  });
});
