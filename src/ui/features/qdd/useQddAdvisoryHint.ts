/**
 * Custom React Hook: useQddAdvisoryHint
 * Provides instant (< 16ms), non-blocking, offline advisory duplicate hints while authoring
 * Debounces typing at 250ms and delegates check to the dedicated background Web Worker.
 * Layer: UI / Features / QDD
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DuplicationVerdict } from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import type { Question } from '../../../domain/model/types.ts';
import { dexieFingerprintCache } from '../../../infrastructure/questionBank/duplication/dexie/DexieFingerprintCache.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import type {
  QddWorkerInboundMessage,
  QddWorkerOutboundMessage,
} from '../../../application/qdd/qddWorkerProtocol.ts';

export interface UseQddAdvisoryHintOptions {
  readonly stem: string;
  readonly questionId?: string;
  readonly blockId?: string;
  readonly chapterId?: string;
  readonly enabled?: boolean;
  readonly debounceMs?: number;
}

export interface UseQddAdvisoryHintReturn {
  readonly verdict: DuplicationVerdict | null;
  readonly isComputing: boolean;
  readonly isDismissed: boolean;
  readonly dismissHint: () => void;
  readonly clearVerdict: () => void;
}

export function useQddAdvisoryHint({
  stem,
  questionId = 'draft-authoring-q',
  blockId = 'cvs',
  chapterId = 'heart-failure',
  enabled = true,
  debounceMs = 250,
}: UseQddAdvisoryHintOptions): UseQddAdvisoryHintReturn {
  const [verdict, setVerdict] = useState<DuplicationVerdict | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const isWorkerInitializedRef = useRef(false);
  const pendingRequestIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Initialize Worker & Index on mount
  useEffect(() => {
    if (!enabled || typeof Worker === 'undefined') return;

    try {
      const worker = new Worker(
        new URL('../../../application/qdd/qddAdvisory.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<QddWorkerOutboundMessage>) => {
        const msg = e.data;
        if (msg.type === 'ADVISORY_RESULT') {
          if (msg.payload.requestId === pendingRequestIdRef.current) {
            setIsComputing(false);
            // Only set verdict if there are actual duplicate candidates
            if (msg.payload.verdict.relation !== 'UNIQUE') {
              setVerdict(msg.payload.verdict);
            } else {
              setVerdict(null);
            }
          }
        } else if (msg.type === 'INIT_INDEX_DONE') {
          isWorkerInitializedRef.current = true;
        } else if (msg.type === 'ERROR') {
          setIsComputing(false);
        }
      };

      // Sync fingerprints from local store / Dexie into worker
      const initWorkerIndex = async () => {
        const bankQuestions = useQuestionStore.getState().questions;
        const fps = await dexieFingerprintCache.syncFromQuestions(bankQuestions, blockId);
        const initMsg: QddWorkerInboundMessage = {
          type: 'INIT_INDEX',
          payload: { fingerprints: fps },
        };
        worker.postMessage(initMsg);
      };

      void initWorkerIndex();
    } catch {
      // Fallback if Web Workers unsupported in environment
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, blockId]);

  // 2. Debounced Check on Stem Change
  useEffect(() => {
    if (!enabled) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedStem = stem.trim();

    // Invariant: Never check stems shorter than 12 characters
    if (trimmedStem.length < 12) {
      setVerdict(null);
      setIsComputing(false);
      return;
    }

    // Reset dismissed state if user typed meaningfully new content
    setIsDismissed(false);

    debounceTimerRef.current = setTimeout(() => {
      const worker = workerRef.current;
      if (!worker) return;

      const reqId = `adv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      pendingRequestIdRef.current = reqId;
      setIsComputing(true);

      // Synthesize dummy question payload for canonicalizer & pipeline
      const draftQuestion: Question = {
        id: questionId,
        blockId,
        subjectId: 'anatomy',
        chapterId,
        topicId: `${chapterId}/draft`,
        concept: 'Draft Concept',
        type: 'single-best-answer',
        stem: trimmedStem,
        choices: [
          { id: 'a', text: 'Option A', isCorrect: true, rationale: 'Key rationale' },
          { id: 'b', text: 'Option B', isCorrect: false, rationale: 'Distractor rationale' },
          { id: 'c', text: 'Option C', isCorrect: false, rationale: 'Distractor rationale' },
          { id: 'd', text: 'Option D', isCorrect: false, rationale: 'Distractor rationale' },
        ],
        explanation: 'Draft explanation rationale for advisory check.',
        examTip: null,
        mnemonic: null,
        difficulty: 2,
        cognitiveLevel: 'understanding',
        highYield: true,
        origin: 'authored-grounded',
        evidence: [
          {
            chunkId: 'chk-draft',
            sourceName: 'Draft Evidence',
            location: 'Draft',
            quote: 'Draft evidence citation quote.',
            kind: 'text',
          },
        ],
        status: 'active',
        bankVersion: 1,
      };

      const msg: QddWorkerInboundMessage = {
        type: 'CHECK_ADVISORY',
        payload: {
          requestId: reqId,
          question: draftQuestion,
          scope: { kind: 'block', blockId },
        },
      };

      worker.postMessage(msg);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [stem, enabled, questionId, blockId, chapterId, debounceMs]);

  const dismissHint = useCallback(() => {
    setIsDismissed(true);
  }, []);

  const clearVerdict = useCallback(() => {
    setVerdict(null);
    setIsDismissed(false);
  }, []);

  return {
    verdict: isDismissed ? null : verdict,
    isComputing,
    isDismissed,
    dismissHint,
    clearVerdict,
  };
}
