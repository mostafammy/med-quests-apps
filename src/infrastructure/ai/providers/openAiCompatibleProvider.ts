/**
 * Base Streaming Provider for OpenAI-Compatible APIs (OpenRouter, Groq).
 * Connects directly from the browser via Server-Sent Events (SSE).
 * Includes dynamic model discovery and self-healing auto-fallback for 404 model_not_found.
 */
import type { ToolDefinition } from '../../../domain/ai/tools/toolRegistry.ts';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export type LlmStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'thinking'; delta: string }
  | { type: 'tool-call'; callId: string; name: string; argsJson: string };

/**
 * Robust streaming parser that detects and splits <think>...</think> tags
 * into dedicated 'thinking' events without polluting final answer text.
 */
export class ThinkTagStreamFilter {
  private inThinkTag = false;
  private pendingBuffer = '';

  processChunk(chunk: string): Array<{ type: 'text' | 'thinking'; delta: string }> {
    const events: Array<{ type: 'text' | 'thinking'; delta: string }> = [];
    let text = this.pendingBuffer + chunk;
    this.pendingBuffer = '';

    while (text.length > 0) {
      if (!this.inThinkTag) {
        const startIdx = text.indexOf('<think>');
        if (startIdx === -1) {
          const partialMatch = text.match(/<t(h(i(n(k)?)?)?)?$/i);
          if (partialMatch) {
            const safeText = text.slice(0, partialMatch.index);
            if (safeText) events.push({ type: 'text', delta: safeText });
            this.pendingBuffer = partialMatch[0];
            break;
          } else {
            events.push({ type: 'text', delta: text });
            break;
          }
        } else {
          if (startIdx > 0) {
            events.push({ type: 'text', delta: text.slice(0, startIdx) });
          }
          this.inThinkTag = true;
          text = text.slice(startIdx + 7);
        }
      } else {
        const endIdx = text.indexOf('</think>');
        if (endIdx === -1) {
          const partialMatch = text.match(/<\/t(h(i(n(k)?)?)?)?$/i);
          if (partialMatch) {
            const safeText = text.slice(0, partialMatch.index);
            if (safeText) events.push({ type: 'thinking', delta: safeText });
            this.pendingBuffer = partialMatch[0];
            break;
          } else {
            events.push({ type: 'thinking', delta: text });
            break;
          }
        } else {
          if (endIdx > 0) {
            events.push({ type: 'thinking', delta: text.slice(0, endIdx) });
          }
          this.inThinkTag = false;
          text = text.slice(endIdx + 8).replace(/^\n+/, '');
        }
      }
    }

    return events;
  }

  flush(): Array<{ type: 'text' | 'thinking'; delta: string }> {
    if (!this.pendingBuffer) return [];
    const chunk = this.pendingBuffer;
    this.pendingBuffer = '';
    return [{ type: this.inThinkTag ? 'thinking' : 'text', delta: chunk }];
  }
}

export abstract class OpenAiCompatibleProvider {
  abstract readonly providerId: 'openrouter' | 'groq';
  abstract readonly baseUrl: string;
  abstract readonly modelsUrl: string;

  constructor(
    protected readonly apiKey: string,
    readonly modelId: string,
  ) {}

  protected getCustomHeaders(): Record<string, string> {
    return {};
  }

  protected getCustomBodyFields(): Record<string, unknown> {
    return {};
  }

  async *streamTurn(
    messages: LlmMessage[],
    tools: ToolDefinition[],
    signal: AbortSignal
  ): AsyncIterable<LlmStreamEvent> {
    if (!this.apiKey.trim()) {
      if (this.providerId === 'openrouter') {
        throw new Error(
          'OpenRouter API Key is missing. OpenRouter requires a free API key (openrouter.ai/keys) even for :free models. Please enter your key in Co-Pilot Settings, or switch to Google Gemini (pre-configured).'
        );
      }
      throw new Error(`API Key for ${this.providerId.toUpperCase()} is missing. Configure it in Co-Pilot settings.`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey.trim()}`,
      ...this.getCustomHeaders(),
    };

    const body: Record<string, unknown> = {
      model: this.modelId,
      messages,
      stream: true,
      temperature: 0.2,
      ...this.getCustomBodyFields(),
    };

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    let response: Response;
    try {
      response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new Error(`Failed to connect to ${this.providerId}: ${(err as Error).message}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');

      // Dynamic Auto-Recovery for 404 (model_not_found / do not have access)
      if (
        response.status === 404 &&
        (errText.includes('model_not_found') ||
          errText.includes('does not exist') ||
          errText.includes('do not have access'))
      ) {
        let availableModels: string[] = [];
        try {
          const modelsRes = await fetch(this.modelsUrl, {
            headers: {
              Authorization: `Bearer ${this.apiKey.trim()}`,
              ...this.getCustomHeaders(),
            },
            signal,
          });
          if (modelsRes.ok) {
            const data = await modelsRes.json();
            availableModels = (data.data || [])
              .map((m: any) => m.id)
              .filter(
                (id: string) =>
                  !id.includes('whisper') &&
                  !id.includes('guard') &&
                  !id.includes('audio') &&
                  !id.includes('tts')
              );
          }
        } catch {
          // Ignore lookup failure
        }

        if (availableModels.length > 0) {
          // Choose candidate from real available models on this key
          const fallbackCandidate =
            availableModels.find((id) => id === 'openai/gpt-oss-20b') ||
            availableModels.find((id) => id === 'openai/gpt-oss-120b') ||
            availableModels.find((id) => id.includes('qwen')) ||
            availableModels.find((id) => id.includes('gpt-oss')) ||
            availableModels[0];

          if (fallbackCandidate && fallbackCandidate !== body.model) {
            body.model = fallbackCandidate;
            try {
              response = await fetch(this.baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal,
              });
            } catch (err) {
              if ((err as Error).name === 'AbortError') throw err;
              throw new Error(`Failed to connect to ${this.providerId}: ${(err as Error).message}`);
            }
          }
        } else if (errText.includes('do not have access')) {
          throw new Error(
            `Your ${this.providerId.toUpperCase()} key does not have access to model '${this.modelId}'. Please check your model permissions in the Groq console.`
          );
        }
      }

      if (!response.ok) {
        const finalErr = await response.text().catch(() => errText);
        if (response.status === 401) {
          throw new Error(`Invalid ${this.providerId.toUpperCase()} API Key. Please verify your key in Co-Pilot settings.`);
        }
        if (response.status === 429) {
          throw new Error(`${this.providerId.toUpperCase()} rate limit exceeded. Please wait a moment, or switch to Google Gemini (high limits) in Co-Pilot Settings.`);
        }
        try {
          const parsed = JSON.parse(finalErr);
          if (parsed?.error?.message) {
            throw new Error(`${this.providerId.toUpperCase()}: ${parsed.error.message}`);
          }
        } catch {
          // Ignore JSON parse error
        }
        throw new Error(`${this.providerId.toUpperCase()} error (${response.status}): ${finalErr.slice(0, 200)}`);
      }
    }

    if (!response.body) {
      throw new Error(`No response stream from ${this.providerId}.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const toolCallAccumulators = new Map<number, { id: string; name: string; argsJson: string }>();
    const thinkFilter = new ThinkTagStreamFilter();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;
          if (!trimmed.startsWith('data: ')) continue;

          let payload: any;
          try {
            payload = JSON.parse(trimmed.slice(6));
          } catch {
            continue;
          }

          const choice = payload.choices?.[0];
          if (!choice) continue;

          // 1. Stream dedicated reasoning/thinking deltas (DeepSeek, OpenRouter, Groq reasoning models)
          const reasoningDelta = choice.delta?.reasoning_content ?? choice.delta?.reasoning;
          if (typeof reasoningDelta === 'string' && reasoningDelta) {
            yield { type: 'thinking', delta: reasoningDelta };
          }

          // 2. Stream content deltas (filtering embedded <think>...</think> tags)
          if (typeof choice.delta?.content === 'string' && choice.delta.content) {
            const filteredEvents = thinkFilter.processChunk(choice.delta.content);
            for (const ev of filteredEvents) {
              yield ev;
            }
          }

          // Accumulate tool call chunks
          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const idx = tc.index ?? 0;
              const existing = toolCallAccumulators.get(idx) ?? {
                id: tc.id || `call_${idx}`,
                name: tc.function?.name || '',
                argsJson: '',
              };

              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.argsJson += tc.function.arguments;

              toolCallAccumulators.set(idx, existing);
            }
          }
        }
      }

      // Flush any pending trailing tokens from thinkFilter
      for (const ev of thinkFilter.flush()) {
        yield ev;
      }

      // Yield all assembled tool calls
      for (const call of toolCallAccumulators.values()) {
        if (call.name) {
          yield {
            type: 'tool-call',
            callId: call.id,
            name: call.name,
            argsJson: call.argsJson || '{}',
          };
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
