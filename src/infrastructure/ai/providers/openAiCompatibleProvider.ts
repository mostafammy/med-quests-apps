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
  | { type: 'tool-call'; callId: string; name: string; argsJson: string };

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

  async *streamTurn(
    messages: LlmMessage[],
    tools: ToolDefinition[],
    signal: AbortSignal
  ): AsyncIterable<LlmStreamEvent> {
    if (!this.apiKey.trim()) {
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
          throw new Error(`${this.providerId.toUpperCase()} rate limit exceeded. Please wait a moment.`);
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

          // Stream Text deltas
          if (choice.delta?.content) {
            yield { type: 'text', delta: choice.delta.content };
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
