/**
 * QddVerificationService
 *
 * Dedicated domain and store service for Question Duplication Detection (QDD)
 * batch auditing, multi-model probe formatting, and duplicate filtering.
 */

import { QuestionSchema, type Question } from '../../../domain/model/types.ts';
import { QuestionParsingAgent } from '../../../domain/questionBank/aiQuestionParser/QuestionParsingAgent.ts';
import type { ParsedQuestionItem } from '../../../domain/questionBank/aiQuestionParser/types.ts';
import {
  createClientQddEngine,
  loadAllClientBankQuestions,
} from '../../../domain/questionBank/duplication/clientCompositionRoot.ts';
import type { DuplicationVerdict } from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { LEGACY_DEFAULT_BLOCK_ID, type BlockId } from '../../../domain/curriculum/ids.ts';
import { useQuestionStore } from '../useQuestionStore.ts';
import { useBankGovernanceStore } from '../useBankGovernanceStore.ts';

const parsingAgent = new QuestionParsingAgent();

export async function getMergedBankQuestions(): Promise<Question[]> {
  const storeQuestions = useQuestionStore.getState().questions || [];
  const govState = useBankGovernanceStore.getState();
  const govCatalog = govState.catalogQuestions || [];
  const govQueue = (govState.reviewQueue || []).map((r) => r.question).filter(Boolean);
  return loadAllClientBankQuestions([...storeQuestions, ...govCatalog, ...govQueue]);
}

/** Schema-valid copy for QDD: one malformed LLM item must never void the whole batch. */
export function toQddProbe(
  q: Question,
  bankIdSet?: Set<string>,
  idx = 0,
  blockId: BlockId = LEGACY_DEFAULT_BLOCK_ID
): Question {
  const valid = QuestionSchema.safeParse(q).success
    ? q
    : parsingAgent.repairQuestionToSchema(q, blockId);
  const safeId = bankIdSet?.has(valid.id) ? `${valid.id}-probe-${idx + 1}` : valid.id;
  return {
    ...valid,
    id: safeId,
    blockId,
  };
}

const VERDICT_RANK: Record<string, number> = {
  EXACT: 5,
  CONFLICT: 4,
  NEAR: 3,
  SIBLING: 2,
  UNIQUE: 1,
};

export function pickStrongerVerdict(
  a: DuplicationVerdict | undefined,
  b: DuplicationVerdict | undefined
): DuplicationVerdict | undefined {
  if (!a) return b;
  if (!b) return a;
  return (VERDICT_RANK[b.relation] || 0) >= (VERDICT_RANK[a.relation] || 0) ? b : a;
}

export interface BatchDuplicationResult {
  updatedQuestions: ParsedQuestionItem[];
  filteredSelectedIds: Set<string>;
}

export async function executeBatchDuplicationAudit(
  parsedQuestions: ParsedQuestionItem[],
  targetBlockId: BlockId,
  selectedTempIds: Set<string>
): Promise<BatchDuplicationResult> {
  const bankQuestions = await getMergedBankQuestions();
  const bankIdSet = new Set(bankQuestions.map((q) => q.id));

  let edgeVerdicts: DuplicationVerdict[] = [];
  try {
    const questionsPayload = parsedQuestions.map((q, idx) =>
      toQddProbe(q.question, bankIdSet, idx, targetBlockId)
    );
    const res = await fetch('/api/qdd/check-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: questionsPayload,
        scope: { kind: 'block', blockId: targetBlockId },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.verdicts)) {
        edgeVerdicts = data.verdicts;
      }
    }
  } catch {
    // Network or offline fallback
  }

  try {
    const engine = await createClientQddEngine(bankQuestions);
    const questionsPayload = parsedQuestions.map((q, idx) =>
      toQddProbe(q.question, bankIdSet, idx, targetBlockId)
    );
    const res = await engine.checkBatch(questionsPayload, {
      kind: 'block',
      blockId: targetBlockId,
    });
    if (!res.ok) {
      console.error('[QddVerificationService] QDD batch rejected input:', res.error);
    }
    const clientVerdicts = res.ok ? res.value : [];

    const updated = parsedQuestions.map((item, idx) => ({
      ...item,
      qddVerdict:
        pickStrongerVerdict(clientVerdicts[idx], edgeVerdicts[idx]) || item.qddVerdict,
      isCheckingDuplication: false,
    }));

    const filteredSelected = new Set(
      Array.from(selectedTempIds).filter((tempId) => {
        const item = updated.find((p) => p.tempId === tempId);
        const rel = item?.qddVerdict?.relation;
        return rel !== 'EXACT' && rel !== 'NEAR' && rel !== 'CONFLICT';
      })
    );

    return {
      updatedQuestions: updated,
      filteredSelectedIds: filteredSelected,
    };
  } catch (fallbackErr) {
    console.error('[QddVerificationService] Prebuilt QDD check failed:', fallbackErr);
    const reset = parsedQuestions.map((q, idx) => ({
      ...q,
      qddVerdict: edgeVerdicts[idx] || q.qddVerdict,
      isCheckingDuplication: false,
    }));
    const filteredSelected = new Set(
      Array.from(selectedTempIds).filter((tempId) => {
        const item = reset.find((p) => p.tempId === tempId);
        const rel = item?.qddVerdict?.relation;
        return rel !== 'EXACT' && rel !== 'NEAR' && rel !== 'CONFLICT';
      })
    );
    return {
      updatedQuestions: reset,
      filteredSelectedIds: filteredSelected,
    };
  }
}
