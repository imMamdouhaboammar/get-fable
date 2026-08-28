import { describe, expect, test } from 'bun:test';
import { loadSkillFeed, searchSkillFeed, inspectSkillDetail } from '../src/core/feed.ts';

describe('Skill Feed Engine', () => {
  test('loads complete skill feed containing all canonical skills', () => {
    const feed = loadSkillFeed();
    expect(feed.length).toBe(25);
    const ids = feed.map((s) => s.id);
    expect(ids).toContain('get-fable');
    expect(ids).toContain('fable-discover');
    expect(ids).toContain('fable-tdd');
    expect(ids).toContain('fable-verify');
    expect(ids).toContain('fable-security');
    expect(ids).toContain('fable-dataviz');
    expect(ids).toContain('fable-artifact');
    expect(ids).toContain('fable-simplify');
    expect(ids).toContain('fable-loop');
    expect(ids).toContain('fable-run');
    expect(ids).toContain('fable-memory');
    expect(ids).toContain('fable-config');
    expect(ids).toContain('fable-simulator');
    expect(ids).toContain('fable-cowork');
    expect(ids).toContain('fable-spark');
    expect(ids).toContain('skill-creator');
  });

  test('searches feed by keyword, pack, and gate', () => {
    const tddResults = searchSkillFeed('tdd');
    expect(tddResults.length).toBeGreaterThanOrEqual(1);
    expect(tddResults.some((s) => s.id === 'fable-tdd')).toBe(true);

    const proofPack = searchSkillFeed('proof');
    expect(proofPack.length).toBeGreaterThanOrEqual(2);
  }, 30000);

  test('inspects skill detail and instructions', () => {
    const detail = inspectSkillDetail('fable-tdd');
    expect(detail.item).not.toBeNull();
    expect(detail.item?.pack).toBe('build');
    expect(detail.instructions).toContain('fable-tdd');
  }, 30000);
});
