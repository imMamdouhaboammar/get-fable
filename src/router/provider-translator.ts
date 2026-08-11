export type GenericChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface GenericChatMessage {
  role: GenericChatRole;
  content: string;
  name?: string;
}

export interface GenericLLMRequest {
  model: string;
  messages: GenericChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export class RequestValidationError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}

function normalizeRole(value: unknown): GenericChatRole {
  if (value === 'system' || value === 'assistant' || value === 'tool') return value;
  return 'user';
}

function stringifyContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function extractPartsText(value: unknown): string {
  const record = asRecord(value);
  if (!record) return stringifyContent(value);

  if (Array.isArray(record.parts)) {
    return record.parts
      .map((part: unknown) => {
        const partRecord = asRecord(part);
        return partRecord && typeof partRecord.text === 'string' ? partRecord.text : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return stringifyContent(value);
}

function modelName(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export class ProviderTranslator {
  static normalizeRequest(body: unknown): GenericLLMRequest {
    const request = asRecord(body);
    if (!request) {
      throw new RequestValidationError('Request body must be a JSON object');
    }

    if (Array.isArray(request.messages)) {
      if (request.messages.length === 0) {
        throw new RequestValidationError('messages must contain at least one message');
      }

      const messages = request.messages.map((message: unknown, index: number) => {
        const item = asRecord(message);
        if (!item) {
          throw new RequestValidationError(`messages[${index}] must be an object`);
        }

        const normalized: GenericChatMessage = {
          role: normalizeRole(item.role),
          content: stringifyContent(item.content),
        };

        if (typeof item.name === 'string' && item.name.trim()) {
          normalized.name = item.name;
        }

        return normalized;
      });

      return {
        model: modelName(request.model, 'default-fable-model'),
        messages,
        temperature: finiteNumber(request.temperature),
        max_tokens:
          positiveInteger(request.max_tokens) ?? positiveInteger(request.max_completion_tokens),
        stream: request.stream === true,
      };
    }

    if (Array.isArray(request.contents)) {
      if (request.contents.length === 0) {
        throw new RequestValidationError('contents must contain at least one message');
      }

      const messages: GenericChatMessage[] = [];
      if (request.systemInstruction !== undefined) {
        messages.push({
          role: 'system',
          content: extractPartsText(request.systemInstruction),
        });
      }

      request.contents.forEach((content: unknown, index: number) => {
        const item = asRecord(content);
        if (!item) {
          throw new RequestValidationError(`contents[${index}] must be an object`);
        }

        messages.push({
          role: item.role === 'model' ? 'assistant' : 'user',
          content: extractPartsText(item),
        });
      });

      const generationConfig = asRecord(request.generationConfig) || {};
      return {
        model: modelName(request.model, 'gemini-fable-wrapper'),
        messages,
        temperature: finiteNumber(generationConfig.temperature),
        max_tokens: positiveInteger(generationConfig.maxOutputTokens),
        stream: false,
      };
    }

    throw new RequestValidationError('Request must contain a messages or contents array');
  }

  static injectFableSystemPrompt(
    request: GenericLLMRequest,
    fablePromptText: string
  ): GenericLLMRequest {
    if (!fablePromptText.trim()) {
      throw new Error('Fable system prompt is empty');
    }

    const messages = request.messages.map((message) => ({ ...message }));
    const existingSystemIndex = messages.findIndex((message) => message.role === 'system');

    if (existingSystemIndex >= 0) {
      const original = messages[existingSystemIndex];
      messages[existingSystemIndex] = {
        ...original,
        content: `${fablePromptText}\n\n--- ORIGINAL SYSTEM INSTRUCTIONS ---\n${original.content}`,
      };
    } else {
      messages.unshift({ role: 'system', content: fablePromptText });
    }

    return { ...request, messages };
  }
}
