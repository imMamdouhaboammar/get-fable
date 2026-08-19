import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSkillFeed } from '../src/core/feed.ts';
import { canonicalSkillIds, getCoreRepoRoot } from '../src/core/skill-registry.ts';

describe('Skill Feed evidence semantics', () => {
  test('source availability is not treated as target installation', () => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-feed-target-'));
    try {
      const feed = loadSkillFeed(getCoreRepoRoot(), target);
      expect(feed.length).toBe(canonicalSkillIds().length);
      expect(feed.every((item) => item.sourceAvailable)).toBe(true);
      expect(feed.every((item) => item.installedInTarget === false)).toBe(true);
      expect(feed.every((item) => item.isInstalled === false)).toBe(true);
    } finally { fs.rmSync(target, { recursive: true, force: true }); }
  });

  test('awards M4 only where fresh behavioral holdout evidence exists', () => {
    const feed = loadSkillFeed();
    const proven = feed.filter((item) => item.behaviorallyProven);
    const unproven = feed.filter((item) => !item.behaviorallyProven);
    expect(proven.every((item) => item.maturity === 'M4')).toBe(true);
    expect(proven.every((item) => item.holdout.status === 'PASS')).toBe(true);
    expect(unproven.every((item) => item.maturity === 'M3')).toBe(true);
    expect(unproven.every((item) => item.holdout.status === 'NOT_CHECKED')).toBe(true);
    expect(feed.every((item) => item.enterpriseReady === false)).toBe(true);
    expect(['fable-spark', 'fable-verify', 'get-fable'].every((id) => proven.map((item) => item.id).includes(id))).toBe(true);
    expect(proven.length).toBeGreaterThanOrEqual(3);
  });
});
