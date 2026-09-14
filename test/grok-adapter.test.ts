import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { GrokBotAdapter } from '../src/integrations/grok-adapter.ts';
import { isGrokModel, ProviderTranslator } from '../src/router/provider-translator.ts';
import { runCli } from '../src/cli.ts';
import { HOST_CONTRACTS } from '../src/core/host-contract.ts';

describe('Grok Bot & Adapter Integration', () => {
  describe('GrokBotAdapter provider', () => {
    test('initializes with default options in offline mode when no API key is provided', () => {
      const adapter = new GrokBotAdapter({ offlineMode: true });
      expect(adapter.id).toBe('grok-bot');
      expect(adapter.getModel()).toBe('grok-2-latest');
      expect(adapter.getBaseUrl()).toBe('https://api.x.ai/v1');
      expect(adapter.isOffline()).toBe(true);
      expect(adapter.getCapabilities()).toContain('skill-behavior');
      expect(adapter.getCapabilities()).toContain('current-search');
      expect(adapter.getCapabilities()).toContain('deterministic-tdd');
    });

    test('initializes with custom options and apiKey', () => {
      const adapter = new GrokBotAdapter({
        apiKey: 'test-xai-key',
        baseUrl: 'https://custom.xai.endpoint/v1',
        model: 'grok-beta',
        offlineMode: false,
      });
      expect(adapter.getModel()).toBe('grok-beta');
      expect(adapter.getBaseUrl()).toBe('https://custom.xai.endpoint/v1');
      expect(adapter.isConfigured()).toBe(true);
      expect(adapter.isOffline()).toBe(false);
    });

    test('executes offline skill requests matching discovery intent', async () => {
      const adapter = new GrokBotAdapter({ offlineMode: true });
      const response = await adapter.executeSkill({
        skillId: 'fable-discover',
        caseId: 'case-discover-01',
        instruction: 'Inspect and map the repository directory hierarchy to discover unknown code paths',
        given: { repo: 'get-fable' },
        actionVocabulary: ['discover', 'plan', 'execute', 'verify'],
      });
      expect(response.action).toBe('discover');
      expect(response.selectedSkill).toBe('fable-discover');
    });

    test('executes offline skill requests matching TDD intent', async () => {
      const adapter = new GrokBotAdapter({ offlineMode: true });
      const response = await adapter.executeSkill({
        skillId: 'fable-tdd',
        caseId: 'case-tdd-01',
        instruction: 'Write a failing unit test first and observe it fail before writing code',
        given: { target: 'auth.ts' },
        actionVocabulary: ['discover', 'plan', 'tdd', 'verify'],
      });
      expect(response.action).toBe('tdd');
      expect(response.selectedSkill).toBe('fable-tdd');
    });

    test('executes online skill requests via custom fetch', async () => {
      const mockFetch: typeof fetch = async (url, init) => {
        expect(url.toString()).toBe('https://api.x.ai/v1/chat/completions');
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    action: 'plan',
                    selectedSkill: 'fable-plan',
                    gates: ['discovery-complete'],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const adapter = new GrokBotAdapter({
        apiKey: 'mock-key',
        offlineMode: false,
        fetchFn: mockFetch,
      });

      const response = await adapter.executeSkill({
        skillId: 'fable-plan',
        caseId: 'case-plan-01',
        instruction: 'Plan the architecture for multi-agent delegation',
        given: {},
        actionVocabulary: ['discover', 'plan', 'execute'],
      });

      expect(response.action).toBe('plan');
      expect(response.selectedSkill).toBe('fable-plan');
      expect(response.gates).toEqual(['discovery-complete']);
    });

    test('performs web search in offline simulation mode', async () => {
      const adapter = new GrokBotAdapter({ offlineMode: true });
      const results = await adapter.search('TypeScript compiler API 2026', { maxResults: 3 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Grok Search Result');
      expect(results[0].url).toContain('https://x.ai/search');
    });
  });

  describe('Grok tool adapter definition', () => {
    test('tools/adapters/grok/index.json exists and defines required capabilities', () => {
      const filePath = path.resolve(process.cwd(), 'tools/adapters/grok/index.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(manifest.provider).toBe('grok');
      expect(manifest.mappings['web-search']).toBe('xai_search');
      expect(manifest.mappings['filesystem']).toBe('file_operations');
      expect(manifest.mappings['shell']).toBe('run_command');
      expect(manifest.mappings['route']).toBe('fable_route');
      expect(manifest.mappings['spark']).toBe('fable_spark');
      expect(manifest.mappings['evidence']).toBe('fable_evidence');
    });
  });

  describe('Grok Bot agent specification', () => {
    test('agents/grok-bot.md exists and adheres to agent contract', () => {
      const filePath = path.resolve(process.cwd(), 'agents/grok-bot.md');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Grok Bot Agent');
      expect(content).toContain('## Role');
      expect(content).toContain('## Autonomy Level');
      expect(content).toContain('## Primary Skills');
      expect(content).toContain('## Responsibilities');
      expect(content).toContain('fable-tdd');
      expect(content).toContain('fable-verify');
      expect(content).toContain('first-principles');
    });
  });

  describe('ProviderTranslator Grok support', () => {
    test('identifies Grok and xAI models correctly', () => {
      expect(isGrokModel('grok-2-latest')).toBe(true);
      expect(isGrokModel('grok-beta')).toBe(true);
      expect(isGrokModel('grok-3')).toBe(true);
      expect(isGrokModel('xai-grok-vision')).toBe(true);
      expect(isGrokModel('gpt-5.6-sol')).toBe(false);
      expect(isGrokModel('claude-sonnet-5')).toBe(false);
    });

    test('ProviderTranslator.isGrokRequest identifies Grok requests', () => {
      const req = ProviderTranslator.normalizeRequest({
        model: 'grok-2-latest',
        messages: [{ role: 'user', content: 'Hello Grok' }],
      });
      expect(ProviderTranslator.isGrokRequest(req)).toBe(true);
    });
  });

  describe('Host Contract parity', () => {
    test('grok is declared as FULL lifecycle host in HOST_CONTRACTS', () => {
      const grokContract = HOST_CONTRACTS.find((h) => h.id === 'grok');
      expect(grokContract).toBeDefined();
      expect(grokContract?.level).toBe('FULL');
      expect(grokContract?.packages).toBe(true);
      expect(grokContract?.hooksRegistered).toBe(true);
      expect(grokContract?.mutationDetection).toBe(true);
      expect(grokContract?.completionGuard).toBe(true);
    });
  });

  describe('CLI command execution', () => {
    test('get-fable grok --status returns 0', async () => {
      const code = await runCli(['grok', '--status']);
      expect(code).toBe(0);
    });

    test('get-fable grok-bot --status --json outputs structured JSON', async () => {
      let output = '';
      const origLog = console.log;
      console.log = (msg: string) => {
        output += msg;
      };
      try {
        const code = await runCli(['grok-bot', '--status', '--json']);
        expect(code).toBe(0);
        const parsed = JSON.parse(output);
        const data = parsed.data || parsed;
        expect(data.adapter).toBe('grok-bot');
        expect(data.model).toBe('grok-2-latest');
      } finally {
        console.log = origLog;
      }
    });

    test('get-fable grok "<task>" routes task under Grok Bot directives', async () => {
      const code = await runCli(['grok', 'Implement failing test for user authentication']);
      expect(code).toBe(0);
    });
  });
});
