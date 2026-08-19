import { describe, expect, test } from 'bun:test';
import { loadSkillFeed, searchSkillFeed, inspectSkillDetail } from '../src/core/feed.ts';

describe('Skill Feed Engine', () => {
  test('loads complete skill feed containing all 14 canonical skills', () => {
    const feed = loadSkillFeed();
    expect(feed.length).toBe(14);
    const ids = feed.map((s) => s.id);
    expect(ids).toContain('get-fable');
    expect(ids).toContain('fable-discover');
    expect(ids).toContain('fable-tdd');
    expect(ids).toContain('fable-verify');
    expect(ids).toContain('fable-security');
  });

  test('searches feed by keyword, pack, and gate', () => {
    const tddResults = searchSkillFeed('tdd');
    expect(tddResults.length).toBeGreaterThanOrEqual(1);
    expect(tddResults.some((s) => s.id === 'fable-tdd')).toBe(true);

    const proofPack = searchSkillFeed('proof');
    expect(proofPack.length).toBeGreaterThanOrEqual(2);
  });

  test('inspects skill detail and instructions', () => {
    const detail = inspectSkillDetail('fable-tdd');
    expect(detail.item).not.toBeNull();
    expect(detail.item?.pack).toBe('build');
    expect(detail.instructions).toContain('fable-tdd');
  });
});
