import type { FableSkillId, FableTaskShape } from '../../types.js';
import { buildSecondStageQuestions } from '../disambiguation.js';
import { buildFirstPassQuestions, type JevQuestion } from '../question-builder.js';
import type {
  ReflexAdvice,
  ReflexAdvisor,
  ReflexConfig,
  ReflexErrorKind,
  ReflexProviderError,
  ReflexProviderId,
  ReflexStateEnvelopeV1,
  SecondStageAdvice,
} from '../types.js';

export const TYPESAFE_API_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

export class TypeSafeProviderException extends Error implements ReflexProviderError {
  readonly kind: ReflexErrorKind;
  readonly retryable: boolean;

  constructor(kind: ReflexErrorKind, message: string, retryable = false) {
    super(message);
    this.name = 'TypeSafeProviderException';
    this.kind = kind;
    this.retryable = retryable;
  }
}

export class TypeSafeJevAdvisor implements ReflexAdvisor {
  readonly id: ReflexProviderId = 'typesafe-jev';
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: ReflexConfig, customFetch: typeof fetch = fetch) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'jev-1.13.0';
    this.timeoutMs = config.timeoutMs || 1200;
    this.fetchFn = customFetch;
  }

  async advise(input: ReflexStateEnvelopeV1, externalSignal?: AbortSignal): Promise<ReflexAdvice> {
    const questions = buildFirstPassQuestions();
    const { data, latencyMs } = await this.postQuestions(input, questions, externalSignal);
    return this.normalizeResponse(data, latencyMs);
  }

  async adviseSecondStage(
    input: ReflexStateEnvelopeV1,
    candidates: FableSkillId[],
    externalSignal?: AbortSignal
  ): Promise<SecondStageAdvice> {
    const questions = buildSecondStageQuestions(candidates);
    const { data, latencyMs } = await this.postQuestions(input, questions, externalSignal);
    return this.normalizeSecondStageResponse(data, latencyMs);
  }

  private async postQuestions(
    state: any,
    questions: Record<string, JevQuestion>,
    externalSignal?: AbortSignal
  ): Promise<{ data: any; latencyMs: number }> {
    if (!this.apiKey) {
      throw new TypeSafeProviderException(
        'missing-credential',
        'TYPESAFE_API_KEY is not configured',
        false
      );
    }

    const startTime = Date.now();
    const requestBody = {
      state,
      model: this.model,
      questions,
    };

    let attempt = 0;
    const maxAttempts = 2; // 1 retry on 429/529 if budget permits

    while (attempt < maxAttempts) {
      attempt++;
      const remainingTimeout = Math.max(200, this.timeoutMs - (Date.now() - startTime));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), remainingTimeout);

      const onExternalAbort = () => controller.abort();
      if (externalSignal) {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }

      try {
        const response = await this.fetchFn(TYPESAFE_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new TypeSafeProviderException(
              'authentication',
              `TypeSafe API authentication failed (${response.status})`,
              false
            );
          }

          if (response.status === 429 || response.status === 529) {
            if (attempt < maxAttempts && remainingTimeout > 500) {
              await new Promise((resolve) => setTimeout(resolve, 250));
              continue;
            }
            throw new TypeSafeProviderException(
              'rate-limit',
              `TypeSafe API rate limit or overloaded (${response.status})`,
              true
            );
          }

          const errorBody = await response.text().catch(() => '');
          throw new TypeSafeProviderException(
            'bad-response',
            `TypeSafe API returned HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
            false
          );
        }

        const data = (await response.json()) as any;
        const latencyMs = Date.now() - startTime;
        return { data, latencyMs };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }

        if (err instanceof TypeSafeProviderException) {
          throw err;
        }

        if (controller.signal.aborted) {
          if (externalSignal?.aborted) {
            throw new TypeSafeProviderException('aborted', 'Request aborted by caller', false);
          }
          throw new TypeSafeProviderException(
            'timeout',
            `TypeSafe API request timed out after ${this.timeoutMs}ms`,
            true
          );
        }

        throw new TypeSafeProviderException(
          'network',
          `TypeSafe network error: ${err?.message || 'unknown error'}`,
          true
        );
      }
    }

    throw new TypeSafeProviderException('timeout', 'Exceeded retry budget', false);
  }

  private normalizeResponse(data: any, latencyMs: number): ReflexAdvice {
    if (!data || typeof data !== 'object' || !data.answers) {
      throw new TypeSafeProviderException(
        'bad-response',
        'TypeSafe response missing required answers field',
        false
      );
    }

    const answers = data.answers;
    const skillAnswer = answers.selected_skill;
    const shapeAnswer = answers.task_shape;

    const selectedSkill = (skillAnswer?.choice as FableSkillId) || null;
    const probabilities = (skillAnswer?.probabilities as Partial<Record<FableSkillId, number>>) || {};
    const confidence = typeof skillAnswer?.confidence === 'number' ? skillAnswer.confidence : null;
    const taskShape = (shapeAnswer?.choice as FableTaskShape) || undefined;

    // Collect companion Nouls
    const signals: Record<string, number> = {};
    for (const [key, answer] of Object.entries<any>(answers)) {
      if (key !== 'selected_skill' && key !== 'task_shape' && typeof answer?.noul === 'number') {
        signals[key] = answer.noul;
      }
    }

    return {
      provider: this.id,
      model: data.model || this.model,
      selectedSkill,
      probabilities,
      confidence,
      taskShape,
      signals,
      usage: data.usage
        ? {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
          }
        : undefined,
      latencyMs,
      stage: 1,
    };
  }

  private normalizeSecondStageResponse(data: any, latencyMs: number): SecondStageAdvice {
    if (!data || typeof data !== 'object' || !data.answers) {
      throw new TypeSafeProviderException(
        'bad-response',
        'TypeSafe response missing required answers field',
        false
      );
    }

    const answers = data.answers;
    const bestAnswer = answers.best_candidate;
    const fitsAnswer = answers.candidate_fits;

    const bestCandidate = (bestAnswer?.choice as FableSkillId | 'none_of_these') || 'none_of_these';
    const confidence = typeof bestAnswer?.confidence === 'number' ? bestAnswer.confidence : null;
    const probabilities = (bestAnswer?.probabilities as Partial<Record<string, number>>) || {};
    const candidateFits = typeof fitsAnswer?.noul === 'number' ? fitsAnswer.noul : 0;

    return {
      bestCandidate,
      confidence,
      probabilities,
      candidateFits,
      latencyMs,
      usage: data.usage
        ? {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
          }
        : undefined,
    };
  }
}
