import { describe, expect, test } from 'bun:test';
import type {
  BrowserEvidenceProvider,
  CurrentSearchProvider,
  ExecutionReceiptProvider,
  RepositoryProvider,
  SecurityEvidenceProvider,
  SkillBehaviorProvider,
} from '../src/index.ts';

describe('optional provider capability contracts', () => {
  test('canonical capabilities can be implemented without vendor coupling', async () => {
    const search: CurrentSearchProvider = { search: async (query) => [{ title: query, url: 'https://example.com', excerpt: 'current' }] };
    const receipt: ExecutionReceiptProvider = { capture: async (request) => ({ receiptId: 'r1', revision: request.revision, verified: true }) };
    const security: SecurityEvidenceProvider = { assess: async () => ({ verdict: 'pass', findings: [] }) };
    const repo: RepositoryProvider = { revision: async () => 'abc123', changedFiles: async () => ['src/a.ts'] };
    const browser: BrowserEvidenceProvider = { capture: async () => ({ url: 'https://example.com', status: 200, title: 'Example' }) };
    const behavior: SkillBehaviorProvider = { id: 'fixture', executeSkill: async (request) => ({ action: request.caseId }) };

    expect((await search.search('Bun docs'))[0].title).toBe('Bun docs');
    expect((await receipt.capture({ repository: 'repo', revision: 'abc123', commandCategory: 'test' })).revision).toBe('abc123');
    expect((await security.assess({ scope: ['src/a.ts'] })).verdict).toBe('pass');
    expect(await repo.revision()).toBe('abc123');
    expect((await browser.capture({ url: 'https://example.com' })).status).toBe(200);
    expect((await behavior.executeSkill({ skillId: 'fable-tdd', caseId: 'case-1', instruction: '# TDD', given: {}, actionVocabulary: ['write-failing-test-first'] })).action).toBe('case-1');
  });
});
