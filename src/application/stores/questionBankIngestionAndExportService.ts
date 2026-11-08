import { QuestionSchema, type Question } from '../../domain/model/types.ts';
import { db } from '../../infrastructure/storage/db.ts';
import type { BlockId } from '../../domain/curriculum/ids.ts';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { QuestionCanonicalHasher } from '../../domain/questionBank/canonicalHasher.ts';
import { normalizeBlockId } from '../../domain/questionBank/QuestionNormalizer.ts';
import { useAuthStore } from './useAuthStore.ts';
import { edgeAuthGateway } from '../../infrastructure/auth/edgeAuthGateway.ts';
import { createClientQddEngine } from '../../domain/questionBank/duplication/clientCompositionRoot.ts';
import type { UserRole } from '../../domain/auth/types.ts';
import type {
  BankSyncCursor,
  GovernedQuestion,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { filterActiveQuestions } from './questionBankSyncOrchestrator.ts';

export async function validateAndIngestLocalQuestions(params: {
  rawInput: string | unknown[];
  activeBlockId: string;
  currentQuestions: ReadonlyArray<Question>;
}): Promise<{
  count: number;
  errors: string[];
  ingested?: Question[];
  duplicateWarnings?: string[];
  updatedQuestions?: Question[];
}> {
  const { rawInput, activeBlockId, currentQuestions } = params;
  let parsed: unknown[];
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (e) {
      return { count: 0, errors: [`JSON Parse Error: ${(e as Error).message}`] };
    }
  } else {
    parsed = rawInput;
  }

  if (!Array.isArray(parsed)) {
    return { count: 0, errors: ['Input must be a JSON array of questions'] };
  }

  const validated: Question[] = [];
  const errors: string[] = [];

  parsed.forEach((item, index) => {
    const res = QuestionSchema.safeParse(item);
    if (res.success) {
      const blockId = normalizeBlockId(res.data.blockId, activeBlockId || 'cvs') as BlockId;
      const customItem: GovernedQuestion = {
        ...res.data,
        blockId,
        provenanceScope: 'local-custom',
        editorialStatus: 'local_draft',
        stemHash: QuestionCanonicalHasher.computeStemHashSync(res.data.stem),
        globalRevision: 0,
        authorId: 'usr-local-author',
        authorDisplayName: 'Local Author',
        reviewedById: null,
        reviewedByDisplayName: null,
        reviewerNotes: null,
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      validated.push(customItem as Question);
    } else {
      const issues = res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      errors.push(`Item #${index + 1}: ${issues}`);
    }
  });

  const duplicateWarnings: string[] = [];
  let updatedQuestions: Question[] | undefined;

  if (validated.length > 0) {
    try {
      const qddEngine = await createClientQddEngine(currentQuestions as Question[]);
      const qddResult = await qddEngine.checkBatch(validated, { kind: 'block', blockId: 'cvs' });
      if (qddResult.ok) {
        for (const verdict of qddResult.value) {
          if (verdict.relation === 'EXACT') {
            const cand = verdict.candidates[0];
            duplicateWarnings.push(
              `Question "${verdict.questionId}" is an exact duplicate of existing bank item (${
                cand?.matchedQuestionId || 'bank question'
              }).`
            );
          } else if (verdict.relation === 'CONFLICT') {
            const cand = verdict.candidates[0];
            duplicateWarnings.push(
              `Question "${verdict.questionId}" has an answer-key conflict with question (${
                cand?.matchedQuestionId || 'bank question'
              }).`
            );
          }
        }
      }
    } catch {
      // Non-blocking duplicate audit
    }

    await db.questions.bulkPut(validated);
    const map = new Map<string, Question>();
    currentQuestions.forEach((q) => map.set(q.id, q));
    validated.forEach((q) => map.set(q.id, q));
    updatedQuestions = filterActiveQuestions(Array.from(map.values()));
  }

  return {
    count: validated.length,
    errors,
    ingested: validated,
    duplicateWarnings,
    updatedQuestions,
  };
}

export async function submitQuestionsForGlobalReviewWithQdd(params: {
  candidates: Question[];
  localCount: number;
  localErrors: string[];
  currentQuestions: ReadonlyArray<Question>;
  authorContext: {
    authorId?: string;
    authorDisplayName?: string;
    authorRole?: UserRole;
  };
}): Promise<{
  count: number;
  errors: string[];
  ticketCount: number;
  updatedQuestions?: Question[];
}> {
  const { candidates, localCount, localErrors, currentQuestions, authorContext } = params;

  try {
    const qddEngine = await createClientQddEngine(currentQuestions as Question[]);
    const qddRes = await qddEngine.checkBatch(candidates, { kind: 'block', blockId: 'cvs' });
    if (qddRes.ok) {
      const blockedItems = qddRes.value.filter(
        (v) =>
          v.decision === 'BLOCK' &&
          v.candidates.some((c) => c.matchedQuestionId !== v.questionId)
      );
      if (blockedItems.length > 0) {
        const reasons = blockedItems.map(
          (b) =>
            `Question "${b.questionId}" is a duplicate of ${b.candidates[0]?.matchedQuestionId}`
        );
        return {
          count: localCount,
          errors: [
            ...localErrors,
            `Submission stopped by DuplicationDetectionEngine: ${reasons.join(', ')}`,
          ],
          ticketCount: 0,
        };
      }
    }
  } catch {
    // Fallback
  }

  const submissionRes = await edgeQuestionBankGateway.submitQuestionsForGlobalReview({
    questions: candidates,
    authorId: authorContext.authorId || 'usr_local_author',
    authorDisplayName: authorContext.authorDisplayName || 'Medical Scholar',
    authorRole: authorContext.authorRole || 'student-pro',
  });

  if (!submissionRes.ok) {
    return {
      count: localCount,
      errors: [
        ...localErrors,
        `Review queue submission warning: ${submissionRes.error.code}`,
      ],
      ticketCount: 0,
    };
  }

  const acceptedQuestionIds = new Set(
    submissionRes.value.submittedTickets.map((ticket) => ticket.question.id)
  );

  const updatedSubmittedQuestions = candidates
    .filter((q) => acceptedQuestionIds.has(q.id))
    .map((q) => ({
      ...q,
      provenanceScope: 'submitted-pending' as const,
      editorialStatus: 'pending_review' as const,
      authorId: authorContext.authorId || 'usr_local_author',
      authorDisplayName: authorContext.authorDisplayName || 'Medical Scholar',
      updatedAt: new Date().toISOString(),
    }));

  await db.questions.bulkPut(updatedSubmittedQuestions as unknown as Question[]);

  const currentMap = new Map<string, Question>();
  currentQuestions.forEach((q) => currentMap.set(q.id, q));
  updatedSubmittedQuestions.forEach((q) => currentMap.set(q.id, q as unknown as Question));
  const updatedQuestions = filterActiveQuestions(Array.from(currentMap.values()));

  return {
    count: localCount,
    errors: localErrors,
    ticketCount: submissionRes.value.submittedTickets.length,
    updatedQuestions,
  };
}

export function exportAuthoritativeBankJson(params: {
  blockId: string;
  questions: ReadonlyArray<Question>;
  syncCursor: BankSyncCursor | null;
}): string {
  const { blockId, questions, syncCursor } = params;
  const authState = useAuthStore.getState().authState;
  const isAdmin =
    authState.status === 'authenticated-active' && authState.user.role === 'admin';

  if (!isAdmin) {
    const actorId =
      authState.status === 'authenticated-active' ? authState.user.id : 'usr_anonymous';
    const actorName =
      authState.status === 'authenticated-active'
        ? authState.user.displayName
        : 'Local Scholar';
    const actorRole =
      authState.status === 'authenticated-active' ? authState.user.role : 'unauthenticated';

    edgeAuthGateway.logSecurityAudit({
      actorUserId: actorId,
      actorDisplayName: `${actorName} (${actorRole})`,
      targetUserId: actorId,
      targetDisplayName: `Question Bank [${blockId.toUpperCase()}]`,
      action: 'QUESTION_BANK_EXPORTED',
      summary: `BLOCKED unauthorized export attempt of question bank by ${actorName} [Role: ${actorRole}]. Admin privileges strictly required.`,
      edgeColo: 'CAI',
      latencyMs: 0.9,
    });

    useAuthStore.setState({ auditLogs: [...edgeAuthGateway.getAuditLogs()] });

    throw new Error(
      'Access Denied (403): Exporting the question bank is strictly restricted to Authoritative Platform Administrators within the Admin Governance Dashboard.'
    );
  }

  const list = questions.filter((q) => !blockId || q.blockId === blockId);

  edgeAuthGateway.logSecurityAudit({
    actorUserId: authState.user.id,
    actorDisplayName: authState.user.displayName,
    targetUserId: authState.user.id,
    targetDisplayName: `Authoritative Curriculum [${blockId.toUpperCase()}]`,
    action: 'QUESTION_BANK_EXPORTED',
    summary: `Exported authoritative question bank for block [${blockId.toUpperCase()}] (${
      list.length
    } questions, Rev #${syncCursor?.serverRevision ?? 1})`,
    edgeColo: 'CAI',
    latencyMs: 1.2,
  });

  useAuthStore.setState({ auditLogs: [...edgeAuthGateway.getAuditLogs()] });

  return JSON.stringify(list, null, 2);
}
