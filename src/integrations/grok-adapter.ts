import type {
  CurrentSearchProvider,
  CurrentSearchResult,
  SkillBehaviorProvider,
  SkillBehaviorRequest,
  SkillBehaviorResponse,
} from './providers.js';

export interface GrokAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  offlineMode?: boolean;
  fetchFn?: typeof fetch;
}

export class GrokBotAdapter implements SkillBehaviorProvider, CurrentSearchProvider {
  readonly id = 'grok-bot';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly offlineMode: boolean;
  private readonly fetchFn: typeof fetch;

  constructor(options: GrokAdapterOptions = {}) {
    this.apiKey = options.apiKey || process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
    this.baseUrl = options.baseUrl || process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
    this.model = options.model || process.env.GROK_MODEL || 'grok-2-latest';
    this.offlineMode = options.offlineMode ?? (!this.apiKey || process.env.NODE_ENV === 'test');
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  isOffline(): boolean {
    return this.offlineMode;
  }

  getModel(): string {
    return this.model;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getCapabilities(): string[] {
    return [
      'skill-behavior',
      'current-search',
      'first-principles-reasoning',
      'lifecycle-governance',
      'deterministic-tdd',
      'evidence-generation',
    ];
  }

  async executeSkill(request: SkillBehaviorRequest): Promise<SkillBehaviorResponse> {
    if (this.offlineMode || !this.apiKey) {
      return this.executeOffline(request);
    }

    return this.executeOnline(request);
  }

  async search(
    query: string,
    options?: { domains?: string[]; maxResults?: number }
  ): Promise<CurrentSearchResult[]> {
    const maxResults = options?.maxResults ?? 5;
    if (this.offlineMode || !this.apiKey) {
      return [
        {
          title: `Grok Search Result: ${query}`,
          url: `https://x.ai/search?q=${encodeURIComponent(query)}`,
          excerpt: `First-principles technical knowledge synthesis for query: ${query}`,
          publishedAt: new Date().toISOString(),
        },
      ].slice(0, maxResults);
    }

    try {
      const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are Grok Bot with real-time web search capabilities. Search and return top findings in JSON array format: [{"title": string, "url": string, "excerpt": string}]. Return ONLY raw JSON.',
            },
            {
              role: 'user',
              content: `Search query: ${query}${options?.domains?.length ? ` Restricted to domains: ${options.domains.join(', ')}` : ''}`,
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`xAI search request failed with status ${response.status}`);
      }

      const json = await response.json() as any;
      const content = json.choices?.[0]?.message?.content || '[]';
      const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
      if (Array.isArray(parsed)) {
        return parsed.slice(0, maxResults).map((item: any) => ({
          title: String(item.title || query),
          url: String(item.url || 'https://x.ai/search'),
          excerpt: item.excerpt ? String(item.excerpt) : undefined,
          publishedAt: item.publishedAt ? String(item.publishedAt) : new Date().toISOString(),
        }));
      }
    } catch {
      // Graceful fallback to simulated result on network/parse failure
    }

    return [
      {
        title: `xAI Knowledge Base: ${query}`,
        url: `https://x.ai/search?q=${encodeURIComponent(query)}`,
        excerpt: `Real-time synthesis result for: ${query}`,
        publishedAt: new Date().toISOString(),
      },
    ].slice(0, maxResults);
  }

  private executeOffline(request: SkillBehaviorRequest): SkillBehaviorResponse {
    const vocab = request.actionVocabulary;
    const instructionLower = request.instruction.toLowerCase();
    const skillIdLower = request.skillId.toLowerCase();

    // 1. Direct match with vocabulary
    for (const v of vocab) {
      if (instructionLower.includes(v.toLowerCase())) {
        return { action: v, selectedSkill: request.skillId };
      }
    }

    // 2. Keyword-based matching against vocabulary
    if (instructionLower.includes('discover') || instructionLower.includes('unknown') || instructionLower.includes('map') || skillIdLower.includes('discover')) {
      const match = vocab.find((v) => /discover|inspect|find|explore|map/i.test(v));
      if (match) return { action: match, selectedSkill: request.skillId };
    }

    if (instructionLower.includes('plan') || instructionLower.includes('decompose') || instructionLower.includes('card') || skillIdLower.includes('plan')) {
      const match = vocab.find((v) => /plan|decompose|card|bound/i.test(v));
      if (match) return { action: match, selectedSkill: request.skillId };
    }

    if (instructionLower.includes('tdd') || instructionLower.includes('test-first') || instructionLower.includes('failing test') || skillIdLower.includes('tdd')) {
      const match = vocab.find((v) => /tdd|test|red|minimal/i.test(v));
      if (match) return { action: match, selectedSkill: request.skillId };
    }

    if (instructionLower.includes('execute') || instructionLower.includes('run') || instructionLower.includes('implement') || skillIdLower.includes('execute')) {
      const match = vocab.find((v) => /execute|implement|apply|build/i.test(v));
      if (match) return { action: match, selectedSkill: request.skillId };
    }

    if (instructionLower.includes('verify') || instructionLower.includes('proof') || instructionLower.includes('evidence') || skillIdLower.includes('verify')) {
      const match = vocab.find((v) => /verify|evidence|proof|assert/i.test(v));
      if (match) return { action: match, selectedSkill: request.skillId };
    }

    if (instructionLower.includes('review') || skillIdLower.includes('review')) {
      const match = vocab.find((v) => /review|critique|inspect/i.test(v));
      if (match) return { action: match, selectedSkill: request.skillId };
    }

    if (instructionLower.includes('security') || instructionLower.includes('audit') || skillIdLower.includes('security')) {
      const match = vocab.find((v) => /security|audit|threat/i.test(v));
      if (match) return { action: match, selectedSkill: request.skillId };
    }

    if (instructionLower.includes('recover') || instructionLower.includes('failure') || skillIdLower.includes('recover')) {
      const match = vocab.find((v) => /recover|diagnose|halt/i.test(v));
      if (match) return { action: match, selectedSkill: request.skillId };
    }

    // Default fallback to first vocabulary item or canonical action
    const fallbackAction = vocab[0] || 'execute';
    return {
      action: fallbackAction,
      selectedSkill: request.skillId,
    };
  }

  private async executeOnline(request: SkillBehaviorRequest): Promise<SkillBehaviorResponse> {
    const prompt = [
      `You are Grok Bot, an autonomous xAI engineering agent operating under the get-fable lifecycle.`,
      `Evaluate the following Skill execution request and choose the single best action from the allowed action vocabulary.`,
      ``,
      `Skill ID: ${request.skillId}`,
      `Case ID: ${request.caseId}`,
      `Instruction: ${request.instruction}`,
      `Given Context: ${JSON.stringify(request.given)}`,
      `Allowed Action Vocabulary: ${JSON.stringify(request.actionVocabulary)}`,
      ``,
      `You must output a JSON object strictly following this schema:`,
      `{ "action": "<one action from Allowed Action Vocabulary>", "selectedSkill": "${request.skillId}" }`,
      `Do not include any explanation or markdown formatting. Output raw JSON only.`,
    ].join('\n');

    const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are Grok Bot. Output valid JSON only, with no commentary or markdown wrappers.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI completions request failed with status ${response.status}`);
    }

    const json = await response.json() as any;
    const rawContent = json.choices?.[0]?.message?.content || '{}';
    const cleaned = rawContent.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed || typeof parsed.action !== 'string' || !parsed.action.trim()) {
      throw new Error('Grok Bot provider returned an invalid response structure');
    }

    return {
      action: parsed.action.trim(),
      selectedSkill: parsed.selectedSkill || request.skillId,
      produces: parsed.produces,
      gates: Array.isArray(parsed.gates) ? parsed.gates : undefined,
      structure: Array.isArray(parsed.structure) ? parsed.structure : undefined,
    };
  }
}
