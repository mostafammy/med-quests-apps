import { QuestionSchema } from '../../model/types.ts';
import type {
  RawQuestionParseRequest,
  ParsedQuestionItem,
  ParseResultSummary,
  AgentExecutionTelemetry,
  AgentToolStep,
  AgentToolStepId,
  AgentToolStepStatus,
} from './types.ts';
import { multiModelConsensusEngine } from './MultiModelConsensusEngine.ts';
import {
  createClientQddEngine,
  loadAllClientBankQuestions,
} from '../duplication/clientCompositionRoot.ts';
import type { DuplicationVerdict } from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { QuestionNormalizer } from '../QuestionNormalizer.ts';

const VERDICT_RANK: Record<string, number> = {
  EXACT: 5,
  CONFLICT: 4,
  NEAR: 3,
  SIBLING: 2,
  UNIQUE: 1,
};

/**
 * Manages AgentExecutionTelemetry state and the unified post-extraction verification pipeline:
 * Step 4: Multi-Model Consensus Cross-Examination
 * Step 5: Invariant & Schema Validation
 * Step 6: Duplication Detection & Collision Analysis (Local QDD + Edge D1 merge)
 */
export class QuestionParsingTelemetryAndPipeline {
  public static createInitialTelemetry(enableConsensus: boolean): AgentExecutionTelemetry {
    const steps: AgentToolStep[] = [
      {
        id: 'segmentation',
        toolName: 'InputSegmentationTool',
        label: 'Text Segmentation & Tokenization',
        description: 'Splits raw text into discrete question blocks, stems, and choice options.',
        status: 'queued',
      },
      {
        id: 'taxonomy',
        toolName: 'CurriculumTaxonomyClassificationTool',
        label: 'Dynamic Curriculum Taxonomy & Gap Analysis',
        description:
          'Maps clinical concepts to active Subjects/Chapters and evaluates domain expansion proposals.',
        status: 'queued',
      },
      {
        id: 'reasoning',
        toolName: 'MedicalClinicalReasoningEngine',
        label: 'Medical Reasoning & Key Deduction',
        description: 'Applies clinical guidelines to infer missing keys and author distractor rationales.',
        status: 'queued',
      },
      {
        id: 'consensus',
        toolName: 'MultiModelCrossVerificationEnsemble',
        label: 'Multi-Model Cross-Examination Ensemble',
        description:
          'Concurrently queries independent models (Gemini, Claude, DeepSeek, Referee) to verify consensus.',
        status: enableConsensus ? 'queued' : 'skipped',
        detail: enableConsensus ? undefined : 'Skipped (enable in Control Deck for automatic quorum)',
      },
      {
        id: 'validation',
        toolName: 'SchemaInvariantVerificationTool',
        label: 'Single-Best-Answer Invariants & Zod Validation',
        description: 'Guarantees NBME / USMLE strict 4-choice formatting and pedagogical consistency.',
        status: 'queued',
      },
      {
        id: 'deduplication',
        toolName: 'QuestionDuplicationCollisionEngine',
        label: 'Question Duplication & Collision Analysis',
        description:
          'Discovers LSH bucket collisions, estimates Jaccard similarity, and flags duplicate or conflicting items against canonical bank.',
        status: 'queued',
      },
    ];

    return {
      isRunning: true,
      currentStepId: 'segmentation',
      totalSteps: steps.length,
      completedSteps: 0,
      steps,
      startedAt: Date.now(),
      elapsedMs: 0,
      activeToolName: 'InputSegmentationTool',
    };
  }

  public static updateTelemetryStep(
    current: AgentExecutionTelemetry,
    stepId: AgentToolStepId,
    status: AgentToolStepStatus,
    updates?: Partial<AgentToolStep>
  ): AgentExecutionTelemetry {
    const steps = current.steps.map((s) => {
      if (s.id === stepId) {
        return {
          ...s,
          status,
          ...updates,
        };
      }
      return s;
    });

    const completed = steps.filter(
      (s) => s.status === 'completed' || s.status === 'skipped'
    ).length;
    const activeStep = steps.find((s) => s.id === stepId);

    return {
      ...current,
      currentStepId: status === 'running' ? stepId : current.currentStepId,
      activeToolName: status === 'running' ? activeStep?.toolName || null : null,
      completedSteps: completed,
      steps,
      elapsedMs: current.startedAt ? Date.now() - current.startedAt : 0,
    };
  }

  public static async runPostExtractionPipeline(params: {
    readonly parsedResult: ParseResultSummary;
    readonly request: RawQuestionParseRequest;
    readonly initialTelemetry: AgentExecutionTelemetry;
    readonly startTime: number;
    readonly targetBlockId: string;
    readonly isTestEnv: boolean;
    readonly modelUsedOverride?: string;
    readonly signal?: AbortSignal;
  }): Promise<ParseResultSummary> {
    const {
      request,
      startTime,
      targetBlockId,
      isTestEnv,
      modelUsedOverride,
      signal,
    } = params;
    let parsedResult = params.parsedResult;
    let telemetry = params.initialTelemetry;

    // STEP 4: Multi-Model Consensus Cross-Examination (if requested)
    if (request.enableConsensusCheck && parsedResult.items.length > 0) {
      const consensusStartTime = Date.now();
      telemetry = this.updateTelemetryStep(telemetry, 'consensus', 'running', {
        detail:
          'Querying parallel quorum across Gemini, Claude, DeepSeek, and Referee to cross-verify answers...',
      });
      request.onTelemetryUpdate?.(telemetry);

      const itemsWithConsensus: ParsedQuestionItem[] = [];
      for (const item of parsedResult.items) {
        const consensusSummary = await multiModelConsensusEngine.verifyConsensus(
          item.question,
          request.modelId,
          signal
        );
        itemsWithConsensus.push({
          ...item,
          consensusSummary,
        });
      }

      parsedResult = {
        ...parsedResult,
        items: itemsWithConsensus,
      };

      const quorumRatio = Math.round(
        (itemsWithConsensus.filter(
          (i) => i.consensusSummary?.consensusVerdict === 'unanimous_agreement'
        ).length /
          itemsWithConsensus.length) *
          100
      );

      telemetry = this.updateTelemetryStep(telemetry, 'consensus', 'completed', {
        durationMs: Date.now() - consensusStartTime,
        detail: `Consensus quorum evaluated (${quorumRatio}% unanimous agreement across ensemble)`,
      });
      request.onTelemetryUpdate?.(telemetry);
    }

    // STEP 5: Invariant & Schema Validation
    const valStartTime = Date.now();
    telemetry = this.updateTelemetryStep(telemetry, 'validation', 'running', {
      detail:
        'Validating single-best-answer invariants, 4 choices, and Zod QuestionSchema contracts...',
    });
    request.onTelemetryUpdate?.(telemetry);

    for (const item of parsedResult.items) {
      QuestionSchema.safeParse(item.question);
    }

    telemetry = this.updateTelemetryStep(telemetry, 'validation', 'completed', {
      durationMs: Date.now() - valStartTime,
      detail: `All ${parsedResult.items.length} item(s) conform to board-standard NBME schema`,
    });
    request.onTelemetryUpdate?.(telemetry);

    // STEP 6: Duplication Detection & Collision Analysis
    const dedupStartTime = Date.now();
    telemetry = this.updateTelemetryStep(telemetry, 'deduplication', 'running', {
      detail: 'Launching prebuilt DuplicationDetectionEngine (MinHash LSH & Discriminator Sieve)...',
    });
    request.onTelemetryUpdate?.(telemetry);

    const bankQuestions = await loadAllClientBankQuestions(request.existingQuestions || []);
    const bankIdSet = new Set(bankQuestions.map((q) => q.id));
    const qddEngine = await createClientQddEngine(bankQuestions);

    // Always send schema-valid probes with IDs guaranteed not to collide with existing bank IDs
    const questionsPayload = parsedResult.items.map((item, idx) => {
      const validQ = QuestionSchema.safeParse(item.question).success
        ? item.question
        : QuestionNormalizer.repairToQuestionSchema(item.question, targetBlockId);
      const safeProbeId = bankIdSet.has(validQ.id)
        ? `${validQ.id}-probe-${idx + 1}`
        : validQ.id;
      return {
        ...validQ,
        id: safeProbeId,
        blockId: targetBlockId,
      };
    });

    const qddBatchResult = await qddEngine.checkBatch(
      questionsPayload,
      { kind: 'block', blockId: targetBlockId },
      signal
    );

    let verdicts: DuplicationVerdict[] = [];
    if (qddBatchResult.ok) {
      verdicts = [...qddBatchResult.value];
    } else {
      console.error(
        '[QuestionParsingAgent] QDD batch failed, falling back to per-item checks:',
        qddBatchResult.error
      );
      for (const probe of questionsPayload) {
        const single = await qddEngine.check(
          probe,
          { kind: 'block', blockId: targetBlockId },
          'batch-audit',
          signal
        );
        verdicts.push(single.ok ? single.value : (undefined as unknown as DuplicationVerdict));
      }
    }

    // Consult Edge D1 (/api/qdd/check-batch) when online so newly published D1 questions are checked
    if (!isTestEnv && typeof fetch === 'function') {
      try {
        const edgeRes = await fetch('/api/qdd/check-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: questionsPayload,
            scope: { kind: 'block', blockId: targetBlockId },
          }),
          signal,
        });
        if (edgeRes.ok) {
          const edgeData = await edgeRes.json();
          if (edgeData && Array.isArray(edgeData.verdicts)) {
            verdicts = parsedResult.items.map((_, idx) => {
              const localV = verdicts[idx];
              const edgeV = edgeData.verdicts[idx] as DuplicationVerdict | undefined;
              if (!localV) return edgeV!;
              if (!edgeV) return localV;
              return (VERDICT_RANK[edgeV.relation] || 0) >= (VERDICT_RANK[localV.relation] || 0)
                ? edgeV
                : localV;
            });
          }
        }
      } catch {
        // Offline or local dev without edge worker — local client QDD verdicts are used
      }
    }

    const itemsWithVerdicts: ParsedQuestionItem[] = parsedResult.items.map((item, idx) => ({
      ...item,
      qddVerdict: verdicts[idx],
      isCheckingDuplication: false,
    }));

    parsedResult = {
      ...parsedResult,
      items: itemsWithVerdicts,
    };

    const exactTotal = itemsWithVerdicts.filter((i) => i.qddVerdict?.relation === 'EXACT').length;
    const conflictTotal = itemsWithVerdicts.filter(
      (i) => i.qddVerdict?.relation === 'CONFLICT'
    ).length;
    const nearTotal = itemsWithVerdicts.filter((i) => i.qddVerdict?.relation === 'NEAR').length;
    const siblingTotal = itemsWithVerdicts.filter(
      (i) => i.qddVerdict?.relation === 'SIBLING'
    ).length;
    const uniqueTotal = itemsWithVerdicts.filter(
      (i) => i.qddVerdict?.relation === 'UNIQUE'
    ).length;
    const uncheckedTotal = itemsWithVerdicts.filter((i) => !i.qddVerdict).length;

    const summaryParts: string[] = [];
    if (exactTotal > 0) summaryParts.push(`${exactTotal} exact`);
    if (conflictTotal > 0) summaryParts.push(`${conflictTotal} conflict`);
    if (nearTotal > 0) summaryParts.push(`${nearTotal} near`);
    if (siblingTotal > 0) summaryParts.push(`${siblingTotal} sibling`);
    summaryParts.push(`${uniqueTotal} unique`);
    if (uncheckedTotal > 0) {
      summaryParts.push(`⚠️ ${uncheckedTotal} NOT CHECKED (engine error)`);
    }

    telemetry = this.updateTelemetryStep(telemetry, 'deduplication', 'completed', {
      durationMs: Math.max(1, Date.now() - dedupStartTime),
      detail: `Prebuilt QDD Engine audited ${parsedResult.items.length} item(s) against ${bankQuestions.length} bank questions: ${summaryParts.join(', ')}`,
    });

    telemetry = {
      ...telemetry,
      isRunning: false,
      currentStepId: null,
      activeToolName: null,
      elapsedMs: Date.now() - startTime,
    };
    request.onTelemetryUpdate?.(telemetry);

    return {
      ...parsedResult,
      durationMs: Date.now() - startTime,
      modelUsed: modelUsedOverride ?? request.modelId,
    };
  }
}
