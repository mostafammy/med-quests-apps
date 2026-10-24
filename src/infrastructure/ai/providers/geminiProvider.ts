/**
 * Google Gemini Cloud Provider
 * Deep clinical reasoning via Google Gemini v1beta REST SSE endpoint.
 */
import type { ToolDefinition } from '../../../domain/ai/tools/toolRegistry.ts';
import type { LlmMessage, LlmStreamEvent } from './openAiCompatibleProvider.ts';

export class GeminiProvider {
  readonly providerId = 'gemini' as const;

  constructor(
    private readonly apiKey: string,
    readonly modelId: string = 'gemini-3.5-flash-lite'
  ) {}

  async *streamTurn(
    messages: LlmMessage[],
    tools: ToolDefinition[],
    signal: AbortSignal
  ): AsyncIterable<LlmStreamEvent> {
    if (!this.apiKey.trim()) {
      throw new Error('Google Gemini API Key is missing. Configure it in Co-Pilot settings.');
    }

    // Split system prompt vs chat contents
    let systemText = '';
    const geminiContents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemText += (systemText ? '\n\n' : '') + (msg.content || '');
      } else if (msg.role === 'tool') {
        geminiContents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: msg.tool_call_id || 'tool_response',
                response: { output: msg.content },
              },
            },
          ],
        });
      } else {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            let parsedArgs = {};
            try {
              parsedArgs = JSON.parse(tc.function.arguments);
            } catch {
              parsedArgs = {};
            }
            parts.push({
              functionCall: {
                name: tc.function.name,
                args: parsedArgs,
              },
            });
          }
        }

        geminiContents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: parts.length > 0 ? parts : [{ text: '...' }],
        });
      }
    }

    const payload: any = {
      contents: geminiContents,
      generationConfig: {
        temperature: 0.2,
      },
    };

    if (systemText) {
      payload.systemInstruction = {
        parts: [{ text: systemText }],
      };
    }

    if (tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          })),
        },
      ];
    }

    const cleanModel = this.modelId.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:streamGenerateContent?alt=sse&key=${this.apiKey.trim()}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new Error(`Failed to connect to Gemini API: ${(err as Error).message}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      if (response.status === 400 || response.status === 403) {
        throw new Error('Invalid Gemini API Key or model access denied.');
      }
      if (response.status === 429) {
        throw new Error('Gemini rate limit exceeded.');
      }
      throw new Error(`Gemini error (${response.status}): ${errText.slice(0, 200)}`);
    }

    if (!response.body) {
      throw new Error('No response stream from Gemini.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          if (!trimmed.startsWith('data: ')) continue;

          let json: any;
          try {
            json = JSON.parse(trimmed.slice(6));
          } catch {
            continue;
          }

          const candidate = json.candidates?.[0];
          const parts = candidate?.content?.parts;
          if (!Array.isArray(parts)) continue;

          for (const part of parts) {
            // Text chunk
            if (typeof part.text === 'string') {
              yield { type: 'text', delta: part.text };
            }

            // Function call
            if (part.functionCall) {
              yield {
                type: 'tool-call',
                callId: `gemini-call-${Date.now()}`,
                name: part.functionCall.name,
                argsJson: JSON.stringify(part.functionCall.args || {}),
              };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
