/**
 * AgenticOrchestrator (Multi-Turn ReAct Agent Engine)
 * Manages the Reason + Act multi-turn loop between Cloud LLMs and the 9 Agentic Tools.
 *
 * Flow:
 * 1. Compiles dynamic Medical Faculty System Prompt via SystemPromptBuilder.
 * 2. If the model invokes Silent Background Tools (A, B, C), executes them silently in <10ms,
 *    feeds their JSON back to the LLM (role: 'tool'), and initiates follow-up synthesis.
 * 3. If the model invokes Clinical Modeling / Memory Tools (D–I), executes them, yields
 *    structured UI artifact events, and streams the final grounded response.
 */
import type { SafeAiContext } from '../../domain/ai/context.ts';
import type { AiSettings } from '../../domain/ai/settings.ts';
import { SystemPromptBuilder } from '../../domain/ai/systemPromptBuilder.ts';
import { ChatLanguagePolicy } from '../../domain/ai/languagePolicy.ts';
import { questionTelemetryTracker } from '../../domain/ai/telemetry.ts';
import {
  agentToolRegistry,
  type AgentToolExecutionEnvelope,
} from '../../domain/ai/tools/toolRegistry.ts';
import {
  resolveAiProvider,
  getAvailableFallbackProvider,
  type AnyCloudProvider,
} from './engineRegistry.ts';
import type { LlmMessage } from './providers/openAiCompatibleProvider.ts';

export interface OrchestratorRequest {
  readonly userMessage: string;
  readonly safeContext: SafeAiContext;
  readonly activeQuestion: any | null;
  readonly questionsBank: any[];
  readonly historyTurns: readonly { readonly role: 'user' | 'assistant'; readonly text: string }[];
  readonly settings: AiSettings;
  readonly signal: AbortSignal;
}

export type OrchestratorEvent =
  | { type: 'silent-diagnostic-start'; toolName: string }
  | { type: 'silent-diagnostic-done'; toolName: string }
  | { type: 'artifact'; envelope: AgentToolExecutionEnvelope }
  | { type: 'text-delta'; delta: string }
  | { type: 'thinking-delta'; delta: string }
  | { type: 'engine-resolved'; providerId: string; modelId: string };

const MAX_REACT_TURNS = 3;

export class AgenticOrchestrator {
  async *runAgentTurn(
    request: OrchestratorRequest,
    providerOverride?: AnyCloudProvider
  ): AsyncIterable<OrchestratorEvent> {
    const {
      userMessage,
      safeContext,
      activeQuestion,
      questionsBank,
      historyTurns,
      settings,
      signal,
    } = request;

    // 1. Resolve Provider
    let provider = providerOverride ?? resolveAiProvider(settings);
    yield {
      type: 'engine-resolved',
      providerId: provider.providerId,
      modelId: provider.modelId,
    };

    // 2. Build Authoritative Medical System Prompt
    const telemetrySnapshot = questionTelemetryTracker.getSnapshot();
    const timeSpentSeconds = questionTelemetryTracker.getTimeSpentSeconds();
    const langContext = ChatLanguagePolicy.resolveChatLanguageContext(
      settings.chatLanguage || 'auto',
      userMessage
    );

    const systemPrompt = new SystemPromptBuilder()
      .withRolePersona()
      .withChatLanguageDirective(langContext)
      .withSafeContext(safeContext, activeQuestion)
      .withTelemetrySnapshot(telemetrySnapshot, timeSpentSeconds)
      .withToolOrchestrationRules()
      .build();

    // 3. Assemble Conversation History
    const conversationMessages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyTurns.map((h) => ({
        role: h.role,
        content: h.text,
      })),
      { role: 'user', content: userMessage },
    ];

    const toolDeclarations = agentToolRegistry.getToolDeclarations(safeContext);
    const executionContext = {
      activeQuestion,
      safeContext,
      questionsBank,
    };

    // 4. Multi-Turn ReAct Loop (Up to 3 turns)
    let currentTurn = 0;

    while (currentTurn < MAX_REACT_TURNS) {
      if (signal.aborted) break;
      currentTurn += 1;

      let turnText = '';
      const turnToolCalls: Array<{ callId: string; name: string; argsJson: string }> = [];
      let streamedAnyChunks = false;

      try {
        for await (const chunk of provider.streamTurn(conversationMessages, toolDeclarations, signal)) {
          if (signal.aborted) break;

          if (chunk.type === 'text') {
            streamedAnyChunks = true;
            turnText += chunk.delta;
            yield { type: 'text-delta', delta: chunk.delta };
          } else if (chunk.type === 'thinking') {
            streamedAnyChunks = true;
            yield { type: 'thinking-delta', delta: chunk.delta };
          } else if (chunk.type === 'tool-call') {
            streamedAnyChunks = true;
            turnToolCalls.push(chunk);
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') throw err;

        const errMsg = ((err as Error).message || '').toLowerCase();
        const isRateLimit =
          errMsg.includes('rate limit') ||
          errMsg.includes('429') ||
          errMsg.includes('quota') ||
          errMsg.includes('resource exhausted');

        // Automatically fail over to an available high-capacity provider (e.g. Gemini)
        if (isRateLimit && !streamedAnyChunks) {
          const fallback = getAvailableFallbackProvider(settings, provider.providerId);
          if (fallback) {
            console.warn(
              `[AgenticOrchestrator] ${provider.providerId} rate limited. Auto-failing over to ${fallback.providerId} (${fallback.modelId}).`
            );
            provider = fallback;
            yield {
              type: 'engine-resolved',
              providerId: provider.providerId,
              modelId: provider.modelId,
            };

            for await (const chunk of provider.streamTurn(conversationMessages, toolDeclarations, signal)) {
              if (signal.aborted) break;

              if (chunk.type === 'text') {
                turnText += chunk.delta;
                yield { type: 'text-delta', delta: chunk.delta };
              } else if (chunk.type === 'tool-call') {
                turnToolCalls.push(chunk);
              }
            }
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      // If no tool calls were made, we have reached the final answer
      if (turnToolCalls.length === 0) {
        break;
      }

      // Record assistant's turn with tool_calls in message history
      conversationMessages.push({
        role: 'assistant',
        content: turnText || null,
        tool_calls: turnToolCalls.map((tc) => ({
          id: tc.callId,
          type: 'function',
          function: {
            name: tc.name,
            arguments: tc.argsJson,
          },
        })),
      });

      // Execute each tool call
      for (const tc of turnToolCalls) {
        if (signal.aborted) break;

        const tool = agentToolRegistry.getTool(tc.name as any);
        const isSilent = !tool || tool.visibility === 'silent';

        if (isSilent) {
          yield { type: 'silent-diagnostic-start', toolName: tc.name };
        }

        const envelope = await agentToolRegistry.executeTool(
          tc.callId,
          tc.name,
          tc.argsJson,
          executionContext
        );

        if (isSilent) {
          yield { type: 'silent-diagnostic-done', toolName: tc.name };
        } else {
          yield { type: 'artifact', envelope };
        }

        // Feed tool execution result back into conversation for next turn
        conversationMessages.push({
          role: 'tool',
          tool_call_id: tc.callId,
          content: envelope.llmFeedbackJson,
        });
      }
    }
  }
}

export const agenticOrchestrator = new AgenticOrchestrator();
