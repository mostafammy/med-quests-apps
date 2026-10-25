/**
 * OpenRouter Cloud Provider
 * Connects to OpenRouter.ai API with standard application headers.
 */
import { OpenAiCompatibleProvider } from './openAiCompatibleProvider.ts';

export class OpenRouterProvider extends OpenAiCompatibleProvider {
  readonly providerId = 'openrouter' as const;
  readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  readonly modelsUrl = 'https://openrouter.ai/api/v1/models';

  constructor(apiKey: string, modelId: string = 'nvidia/nemotron-3.5-lightning:free') {
    super(apiKey, modelId);
  }

  protected override getCustomHeaders(): Record<string, string> {
    return {
      'HTTP-Referer': 'https://medquests.app',
      'X-Title': 'Med Quests Medical AI Co-Pilot',
    };
  }
}
