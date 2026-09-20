// Zero-dependency Bun native TypeSafe Jev Client & Question Builders
// Compatible with @typesafe-ai/sdk API surface.

import { TYPESAFE_API_ENDPOINT } from './providers/typesafe-jev.js';
export { TYPESAFE_API_ENDPOINT };
export const DEFAULT_MODEL = 'jev-1.13.0';

export interface TypeSafeClientOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface QuestionDescriptor {
  type: 'choice' | 'noul' | 'score';
  instructions: string | Record<string, any>;
  criteria?: any;
}

export function choice(instructions: string | Record<string, any>, criteria: Record<string, any> | string[]): QuestionDescriptor {
  return { type: 'choice', instructions, criteria };
}

export function noul(instructions: string | Record<string, any>, criteria?: any): QuestionDescriptor {
  return { type: 'noul', instructions, ...(criteria ? { criteria } : {}) };
}

export function score(instructions: string | Record<string, any>, levels: string[]): QuestionDescriptor {
  return { type: 'score', instructions, criteria: levels };
}

export interface SystemOneRequest {
  state: any;
  questions: Record<string, QuestionDescriptor | any>;
  model?: string;
}

export interface SystemOneResponse {
  answers: Record<string, any>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cost?: number;
  };
  model?: string;
  latencyMs?: number;
}

export class TypeSafeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: TypeSafeClientOptions = {}) {
    this.apiKey = options.apiKey !== undefined ? options.apiKey : (process.env.TYPESAFE_API_KEY || '');
    this.baseUrl = options.baseUrl || TYPESAFE_API_ENDPOINT;
    this.model = options.model || process.env.JEV_MODEL || DEFAULT_MODEL;
    this.timeoutMs = options.timeoutMs || 10000;
    this.fetchFn = options.fetchFn || fetch;
  }

  async systemOne(req: SystemOneRequest, signal?: AbortSignal): Promise<SystemOneResponse> {
    if (!this.apiKey) {
      throw new Error('TYPESAFE_API_KEY is not configured in environment or client options');
    }

    const t0 = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const onExternalAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    try {
      const response = await this.fetchFn(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: req.model || this.model,
          state: req.state,
          questions: req.questions,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', onExternalAbort);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`TypeSafe API HTTP ${response.status}: ${errorText.slice(0, 300)}`);
      }

      const json = (await response.json()) as any;
      return {
        answers: json.answers || {},
        usage: json.usage,
        model: json.model || this.model,
        latencyMs: Date.now() - t0,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', onExternalAbort);
      }
      throw err;
    }
  }
}
