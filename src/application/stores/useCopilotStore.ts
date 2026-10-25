/**
 * Zustand store for the AI Cognitive Co-Pilot (v2.0).
 * Orchestrates cloud streaming, multi-turn tool execution, active telemetry tracking,
 * and high-frequency token buffering at locked 60fps.
 */
import { create } from 'zustand';
import type { CopilotSurface, SafeAiContext } from '../../domain/ai/context.ts';
import type { ChatMessage, MessagePart } from '../../domain/ai/conversation.ts';
import { buildSafeAiContext } from '../../domain/ai/policyGate.ts';
import { questionTelemetryTracker } from '../../domain/ai/telemetry.ts';
import { agenticOrchestrator } from '../../infrastructure/ai/agenticOrchestrator.ts';
import { useAiSettingsStore } from './useAiSettingsStore.ts';
import { useQuestionStore } from './useQuestionStore.ts';
import { useStatsStore } from './useStatsStore.ts';
import { db } from '../../infrastructure/storage/db.ts';
import { powerActionCacheService } from '../../domain/ai/powerActionCacheService.ts';
import { POWER_ACTIONS, type PowerActionKey } from '../../domain/ai/powerActions.ts';

interface CopilotState {
  // Drawer visibility & size
  isOpen: boolean;
  isExpanded: boolean;

  // Active Surface & Thread
  surface: CopilotSurface | null;
  activeQuestionId: string | null;
  threadId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  activeDiagnosticTool: string | null;
  activeResolvedEngine: string | null;
  error: string | null;

  // Power Actions & Instant Cache
  cachedActionKeys: Set<string>;
  loadCachedActionKeys: (questionId: string) => Promise<void>;
  clearQuestionAiCache: () => Promise<void>;
  executePowerAction: (actionKey: PowerActionKey, promptOverride?: string) => Promise<void>;

  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  toggleExpanded: () => void;

  setSurface: (surface: CopilotSurface | null) => void;
  sendUserMessage: (text: string, cacheActionKey?: string) => Promise<void>;
  abortStreaming: () => void;
  clearMessages: () => void;
}

let activeAbortController: AbortController | null = null;

export const useCopilotStore = create<CopilotState>((set, get) => ({
  isOpen: false,
  isExpanded: false,

  surface: null,
  activeQuestionId: null,
  threadId: null,
  messages: [],
  isStreaming: false,
  activeDiagnosticTool: null,
  activeResolvedEngine: null,
  error: null,
  cachedActionKeys: new Set<string>(),

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

  loadCachedActionKeys: async (questionId: string) => {
    if (!questionId) {
      set({ cachedActionKeys: new Set() });
      return;
    }
    try {
      const { settings } = useAiSettingsStore.getState();
      const lang = settings.chatLanguage === 'ar' ? 'ar' : 'en';
      const keys = await powerActionCacheService.getCachedActionKeys(questionId, lang);
      set({ cachedActionKeys: keys });
    } catch {
      set({ cachedActionKeys: new Set() });
    }
  },

  clearQuestionAiCache: async () => {
    const { activeQuestionId } = get();
    if (!activeQuestionId) return;
    await powerActionCacheService.clearQuestionCache(activeQuestionId);
    set({ cachedActionKeys: new Set() });
  },

  executePowerAction: async (actionKey: PowerActionKey, promptOverride?: string) => {
    const { surface, isStreaming, activeQuestionId } = get();
    if (!surface || surface.kind !== 'session' || isStreaming || !activeQuestionId) return;

    const actionDef = POWER_ACTIONS.find((a) => a.key === actionKey);
    if (!actionDef) return;

    const { settings } = useAiSettingsStore.getState();
    const resolvedLang = settings.chatLanguage === 'ar' ? 'ar' : 'en';

    // Check if we already have an instant 0ms cached answer in IndexedDB
    const cachedRecord = await powerActionCacheService.getCachedAction(
      activeQuestionId,
      actionKey,
      resolvedLang
    );
    if (cachedRecord && cachedRecord.responseParts.length > 0) {
      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        role: 'user',
        parts: [
          {
            kind: 'text',
            text:
              cachedRecord.prompt ||
              (resolvedLang === 'ar' ? actionDef.labelAr : actionDef.label),
          },
        ],
        status: 'complete',
        engine: null,
        createdAt: Date.now(),
        latencyMs: 0,
      };

      const assistantMsg: ChatMessage = {
        id: `msg-ai-${Date.now() + 1}`,
        role: 'assistant',
        parts: cachedRecord.responseParts,
        status: 'complete',
        engine: cachedRecord.engine ?? 'cached',
        createdAt: Date.now() + 1,
        latencyMs: 0,
      };

      set((state) => ({
        messages: [...state.messages, userMsg, assistantMsg],
        error: null,
      }));
      return;
    }

    // Not cached yet: generate deterministic clinical prompt in requested language
    const correctChoiceId = surface.question.choices.find((c) => c.isCorrect)?.id ?? 'a';
    const prompt =
      promptOverride ||
      actionDef.generatePrompt(
        {
          questionStem: surface.question.stem,
          choices: surface.question.choices,
          correctChoiceId,
          selectedChoiceId: surface.selectedChoiceId,
        },
        resolvedLang
      );

    await get().sendUserMessage(prompt, actionKey);
  },

  setSurface: (surface) => {
    const prev = get().surface;
    const qId = surface && surface.kind === 'session' ? surface.question.id : null;
    const prevQId = prev && prev.kind === 'session' ? prev.question.id : null;

    if (qId && qId !== prevQId) {
      // Start live telemetry tracking for the new question
      questionTelemetryTracker.startQuestion(qId);

      set({
        surface,
        activeQuestionId: qId,
        threadId: `question:${qId}`,
        activeDiagnosticTool: null,
      });

      // Load cached actions for this active question
      get().loadCachedActionKeys(qId);
    } else {
      set({ surface });
      if (qId) {
        get().loadCachedActionKeys(qId);
      } else {
        set({ cachedActionKeys: new Set() });
      }
    }
  },

  clearMessages: () => set({ messages: [], error: null, activeDiagnosticTool: null }),

  abortStreaming: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    set({ isStreaming: false, activeDiagnosticTool: null });
  },

  sendUserMessage: async (userText: string, cacheActionKey?: string) => {
    const { surface, messages, isStreaming } = get();
    if (!surface || isStreaming || !userText.trim()) return;

    // 1. Gather trusted question state
    const { questions } = useQuestionStore.getState();
    const { topicStats, overallAccuracy, mistakeQuestionIds } = useStatsStore.getState();
    const activeQuestion = surface.kind === 'session' ? surface.question : null;

    let attemptsOnQ: any[] = [];
    let existingNote: string | null = null;
    if (activeQuestion) {
      try {
        attemptsOnQ = await db.attempts.where('questionId').equals(activeQuestion.id).toArray();
        const noteRecord = await db.notes.get(activeQuestion.id);
        existingNote = noteRecord?.note ?? null;
      } catch {
        // Continue gracefully
      }
    }

    const topicStat = activeQuestion
      ? topicStats.find((t) => t.topicId === activeQuestion.topicId)
      : undefined;

    const signals = {
      questionAttempts: attemptsOnQ.map((a) => ({
        isCorrect: a.isCorrect,
        confidence: a.confidence,
        answeredAt: a.answeredAt,
      })),
      topicAccuracy: topicStat ? topicStat.accuracy / 100 : 0.7,
      topicAttempts: topicStat ? topicStat.totalAttempts : 0,
      dangerZoneCountOnTopic: attemptsOnQ.filter((a) => a.isCorrect === false && a.confidence === 'sure').length,
      overdueReviewCount: 0,
      srsIntervalDays: 1,
      existingNote,
    };

    const overview = {
      totalQuestions: questions.length,
      mistakeCount: mistakeQuestionIds.length,
      overallAccuracy: overallAccuracy / 100,
      topics: topicStats.map((t) => ({
        topicId: t.topicId,
        topicName: t.topicName,
        chapterId: t.chapterId,
        questionCount: questions.filter((q) => q.topicId === t.topicId).length,
        highYieldCount: questions.filter((q) => q.topicId === t.topicId && q.highYield).length,
        attempts: t.totalAttempts,
        accuracy: t.accuracy / 100,
        band: (t.status === 'unattempted' ? 'insufficient-data' : t.status) as any,
      })),
    };

    // 2. Build SafeAiContext through Domain Policy Gate
    const safeContext: SafeAiContext = buildSafeAiContext({ surface, signals, overview });

    // 3. Append User Message
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      parts: [{ kind: 'text', text: userText }],
      status: 'complete',
      engine: null,
      createdAt: Date.now(),
      latencyMs: null,
    };

    // Prepare Assistant Message Placeholder
    const assistantMsgId = `msg-ai-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      parts: [],
      status: 'streaming',
      engine: null,
      createdAt: Date.now(),
      latencyMs: null,
    };

    set({
      messages: [...messages, userMsg, assistantMsg],
      isStreaming: true,
      error: null,
      activeDiagnosticTool: null,
    });

    const { settings } = useAiSettingsStore.getState();
    activeAbortController = new AbortController();
    const signal = activeAbortController.signal;
    const startTime = performance.now();

    let accumulatedText = '';
    const partsBuffer: MessagePart[] = [];
    let resolvedEngineId: string | null = settings.engine;
    let rafId: number | null = null;

    const flushUpdatesToStore = () => {
      set((state) => {
        const updated = state.messages.map((m) => {
          if (m.id !== assistantMsgId) return m;

          const currentParts: MessagePart[] = [];
          if (accumulatedText) {
            currentParts.push({ kind: 'text', text: accumulatedText });
          }
          currentParts.push(...partsBuffer);

          return {
            ...m,
            engine: resolvedEngineId,
            parts: currentParts,
            latencyMs: Math.round(performance.now() - startTime),
          };
        });
        return { messages: updated };
      });
    };

    const scheduleFlush = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          flushUpdatesToStore();
          rafId = null;
        });
      }
    };

    try {
      const historyTurns = messages
        .filter((m) => m.parts.some((p) => p.kind === 'text'))
        .slice(-6)
        .map((m) => ({
          role: m.role,
          text: m.parts
            .filter((p): p is { kind: 'text'; text: string } => p.kind === 'text')
            .map((p) => p.text)
            .join('\n'),
        }));

      for await (const event of agenticOrchestrator.runAgentTurn({
        userMessage: userText,
        safeContext,
        activeQuestion,
        questionsBank: questions,
        historyTurns,
        settings,
        signal,
      })) {
        if (signal.aborted) break;

        if (event.type === 'engine-resolved') {
          resolvedEngineId = event.providerId;
          set({ activeResolvedEngine: event.providerId });
        } else if (event.type === 'text-delta') {
          accumulatedText += event.delta;
          scheduleFlush();
        } else if (event.type === 'silent-diagnostic-start') {
          set({ activeDiagnosticTool: event.toolName });
        } else if (event.type === 'silent-diagnostic-done') {
          set({ activeDiagnosticTool: null });
        } else if (event.type === 'artifact') {
          partsBuffer.push({ kind: 'artifact', envelope: event.envelope });
          scheduleFlush();
        }
      }

      if (rafId !== null) cancelAnimationFrame(rafId);
      flushUpdatesToStore();

      const finalParts: MessagePart[] = [];
      if (accumulatedText) {
        finalParts.push({ kind: 'text', text: accumulatedText });
      }
      finalParts.push(...partsBuffer);

      set((state) => ({
        isStreaming: false,
        activeDiagnosticTool: null,
        messages: state.messages.map((m) =>
          m.id === assistantMsgId ? { ...m, status: 'complete' } : m
        ),
      }));

      // Cache power action response in local IndexedDB for 0ms instant future retrieval
      if (cacheActionKey && activeQuestion?.id && finalParts.length > 0) {
        const langCtx = ChatLanguagePolicy.resolveChatLanguageContext(
          settings.chatLanguage || 'auto',
          userText
        );
        await powerActionCacheService.saveCachedAction(
          activeQuestion.id,
          cacheActionKey,
          userText,
          finalParts,
          resolvedEngineId,
          langCtx.resolvedLanguage
        );
        await get().loadCachedActionKeys(activeQuestion.id);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        set((state) => ({
          isStreaming: false,
          activeDiagnosticTool: null,
          messages: state.messages.map((m) =>
            m.id === assistantMsgId ? { ...m, status: 'aborted' } : m
          ),
        }));
      } else {
        const errorMsg = (err as Error).message || 'An error occurred during response generation.';
        set((state) => ({
          isStreaming: false,
          activeDiagnosticTool: null,
          error: errorMsg,
          messages: state.messages.map((m) =>
            m.id === assistantMsgId ? { ...m, status: 'error' } : m
          ),
        }));
      }
    } finally {
      activeAbortController = null;
    }
  },
}));
