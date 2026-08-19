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
    const router = feed.find((item) => item.id === 'get-fable');
    const specialists = feed.filter((item) => item.id !== 'get-fable');
    expect(router?.maturity).toBe('M4');
    expect(router?.behaviorallyProven).toBe(true);
    expect(router?.holdout.status).toBe('PASS');
    expect(specialists.every((item) => item.maturity === 'M3')).toBe(true);
    expect(specialists.every((item) => item.behaviorallyProven === false)).toBe(true);
    expect(feed.every((item) => item.enterpriseReady === false)).toBe(true);
    expect(specialists.every((item) => item.holdout.status === 'NOT_CHECKED')).toBe(true);
  });
});
