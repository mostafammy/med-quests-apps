/**
 * Groq Cloud Provider
 * Ultra-low latency inference via Groq LPU API.
 */
import { OpenAiCompatibleProvider } from './openAiCompatibleProvider.ts';

export class GroqProvider extends OpenAiCompatibleProvider {
  readonly providerId = 'groq' as const;
  readonly baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  readonly modelsUrl = 'https://api.groq.com/openai/v1/models';

  constructor(apiKey: string, modelId: string = 'openai/gpt-oss-20b') {
    super(apiKey, modelId);
  }
}
