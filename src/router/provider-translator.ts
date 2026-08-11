export interface GenericChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
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

export class ProviderTranslator {
  /**
   * Transforms incoming request payload into generic format
   */
  static normalizeRequest(body: any): GenericLLMRequest {
    if (Array.isArray(body.messages)) {
      return {
        model: body.model || 'default-fable-model',
        messages: body.messages.map((m: any) => ({
          role: m.role || 'user',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          name: m.name,
        })),
        temperature: body.temperature,
        max_tokens: body.max_tokens || body.max_completion_tokens,
        stream: body.stream || false,
      };
    }
    // Gemini format fallback
    if (Array.isArray(body.contents)) {
      const messages: GenericChatMessage[] = [];
      if (body.systemInstruction) {
        messages.push({
          role: 'system',
          content: typeof body.systemInstruction === 'string'
            ? body.systemInstruction
            : JSON.stringify(body.systemInstruction),
        });
      }
      for (const item of body.contents) {
        const role = item.role === 'model' ? 'assistant' : 'user';
        const partsText = (item.parts || []).map((p: any) => p.text || '').join('\n');
        messages.push({ role, content: partsText });
      }
      return {
        model: body.model || 'gemini-fable-wrapper',
        messages,
        temperature: body.generationConfig?.temperature,
        max_tokens: body.generationConfig?.maxOutputTokens,
        stream: false,
      };
    }

    return {
      model: body.model || 'fable-generic',
      messages: [{ role: 'user', content: JSON.stringify(body) }],
    };
  }

  /**
   * Injects Fable 5 System Prompt & discipline into system message
   */
  static injectFableSystemPrompt(req: GenericLLMRequest, fablePromptText: string): GenericLLMRequest {
    const existingSystemIdx = req.messages.findIndex((m) => m.role === 'system');

    if (existingSystemIdx >= 0) {
      req.messages[existingSystemIdx].content = `${fablePromptText}\n\n--- ORIGINAL SYSTEM INSTRUCTIONS ---\n${req.messages[existingSystemIdx].content}`;
    } else {
      req.messages.unshift({
        role: 'system',
        content: fablePromptText,
      });
    }

    return req;
  }
}
