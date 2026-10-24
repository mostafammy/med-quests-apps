import { describe, it, expect } from 'vitest';
import { AgenticOrchestrator, type OrchestratorEvent } from '../agenticOrchestrator.ts';
import type { TutorContext } from '../../../domain/ai/context.ts';
import type { AiSettings } from '../../../domain/ai/settings.ts';

class MockAiProvider {
  readonly providerId = 'openrouter' as const;
  readonly modelId = 'test-mock-model';

  constructor(
    private readonly script: Array<
      Array<
        | { type: 'text'; delta: string }
        | { type: 'tool-call'; callId: string; name: string; argsJson: string }
      >
    >
  ) {}

  async *streamTurn(messages: any[], _tools: any[], signal: AbortSignal) {
    const toolCount = messages.filter((m) => m.role === 'tool').length;
    const currentEvents = this.script[toolCount] || [];
    for (const evt of currentEvents) {
      if (signal.aborted) break;
      yield evt;
    }
  }
}

describe('AgenticOrchestrator (Multi-Turn ReAct Loop)', () => {
  const orchestrator = new AgenticOrchestrator();

  const dummyQuestion = {
    id: 'q-as-01',
    concept: 'Aortic Stenosis',
    topicId: 'valvular-heart-disease',
    chapterId: 'cardiovascular',
    highYield: true,
    stem: 'A 74-year-old male presents with exertional syncope.',
    choices: [
      { id: 'a', text: 'Aortic Stenosis' },
      { id: 'b', text: 'Mitral Regurgitation' },
    ],
  };

  const safeContext: TutorContext = {
    kind: 'tutor',
    mode: 'practice',
    question: dummyQuestion as any,
    disclosure: { state: 'sealed' },
    learner: {
      priorAttempts: 0,
      priorMistakes: 0,
      topicAccuracy: 0.7,
      topicBand: 'developing',
      dangerZoneCountOnTopic: 0,
      overdueReviewCount: 0,
      srsIntervalDays: 1,
      existingNote: null,
    },
    isBookmarked: false,
  };

  const dummySettings: AiSettings = {
    engine: 'openrouter',
    openRouterApiKey: 'test-key',
    openRouterModel: 'test-model',
    groqApiKey: '',
    groqModel: 'openai/gpt-oss-20b',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
  };

  it('streams simple conversational response without tool execution when model produces direct text', async () => {
    const mockProvider = new MockAiProvider([
      [
        { type: 'text', delta: 'Focus on the physical ' },
        { type: 'text', delta: 'exam findings.' },
      ],
    ]);

    const events: OrchestratorEvent[] = [];
    const controller = new AbortController();

    for await (const evt of orchestrator.runAgentTurn(
      {
        userMessage: 'What should I look at?',
        safeContext,
        activeQuestion: dummyQuestion,
        questionsBank: [dummyQuestion],
        historyTurns: [],
        settings: dummySettings,
        signal: controller.signal,
      },
      mockProvider as any
    )) {
      events.push(evt);
    }

    expect(events.some((e) => e.type === 'engine-resolved')).toBe(true);
    const textDeltas = events.filter((e) => e.type === 'text-delta').map((e: any) => e.delta).join('');
    expect(textDeltas).toBe('Focus on the physical exam findings.');
  });

  it('autonomously intercepts silent tool calls, executes them, feeds back, and synthesizes explanation', async () => {
    const mockProvider = new MockAiProvider([
      // Turn 1: Model requests silent vignette analysis
      [
        {
          type: 'tool-call',
          callId: 'call_1',
          name: 'analyze_active_question_vignette',
          argsJson: JSON.stringify({ focusChoiceId: 'a' }),
        },
      ],
      // Turn 2: Follow-up response after tool result is fed back
      [
        { type: 'text', delta: 'The syncope points directly to cerebral hypoperfusion during exertion.' },
      ],
    ]);

    const events: OrchestratorEvent[] = [];
    const controller = new AbortController();

    for await (const evt of orchestrator.runAgentTurn(
      {
        userMessage: 'Why does he pass out?',
        safeContext,
        activeQuestion: dummyQuestion,
        questionsBank: [dummyQuestion],
        historyTurns: [],
        settings: dummySettings,
        signal: controller.signal,
      },
      mockProvider as any
    )) {
      events.push(evt);
    }

    // Must have emitted silent diagnostic indicators
    expect(events.some((e) => e.type === 'silent-diagnostic-start' && e.toolName === 'analyze_active_question_vignette')).toBe(true);
    expect(events.some((e) => e.type === 'silent-diagnostic-done' && e.toolName === 'analyze_active_question_vignette')).toBe(true);

    // Final streamed answer
    const textDeltas = events.filter((e) => e.type === 'text-delta').map((e: any) => e.delta).join('');
    expect(textDeltas).toContain('cerebral hypoperfusion');
  });

  it('yields artifact envelope for visual modeling tools', async () => {
    const mockProvider = new MockAiProvider([
      [
        {
          type: 'tool-call',
          callId: 'call_pv_1',
          name: 'simulate_hemodynamic_pv_loop',
          argsJson: JSON.stringify({ pathology: 'aortic_stenosis', chronicity: 'chronic_compensated' }),
        },
      ],
      [
        { type: 'text', delta: 'Here is the pressure-volume loop comparing normal vs aortic stenosis.' },
      ],
    ]);

    const events: OrchestratorEvent[] = [];
    const controller = new AbortController();

    for await (const evt of orchestrator.runAgentTurn(
      {
        userMessage: 'Show me the PV loop',
        safeContext,
        activeQuestion: dummyQuestion,
        questionsBank: [dummyQuestion],
        historyTurns: [],
        settings: dummySettings,
        signal: controller.signal,
      },
      mockProvider as any
    )) {
      events.push(evt);
    }

    const artifactEvent = events.find((e) => e.type === 'artifact');
    expect(artifactEvent).toBeDefined();
    if (artifactEvent && artifactEvent.type === 'artifact') {
      expect(artifactEvent.envelope.toolName).toBe('simulate_hemodynamic_pv_loop');
      expect(artifactEvent.envelope.artifactPayload?.kind).toBe('pv_loop');
    }
  });
});
