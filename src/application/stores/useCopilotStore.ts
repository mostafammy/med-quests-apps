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
  error: string | null;

  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  toggleExpanded: () => void;

  setSurface: (surface: CopilotSurface | null) => void;
  sendUserMessage: (text: string) => Promise<void>;
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
  error: null,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

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
    } else {
      set({ surface });
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

  sendUserMessage: async (userText: string) => {
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

      set((state) => ({
        isStreaming: false,
        activeDiagnosticTool: null,
        messages: state.messages.map((m) =>
          m.id === assistantMsgId ? { ...m, status: 'complete' } : m
        ),
      }));
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
