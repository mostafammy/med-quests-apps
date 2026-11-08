/**
 * Domain Service: QuestionParsingAgent
 * Orchestrates unstructured plain text, lecture notes, rough MCQs, or structured JSON
 * into fully compliant, board-standard MedQuests Question objects.
 *
 * Strategy / Pipeline Decomposition:
 * - DirectJsonQuestionStrategy: Fast-path 100%-fidelity JSON ingestion & manifest reconciliation.
 * - TextSegmentationAndChoiceExtractor: Regex block segmentation, inline choice splitting, & 4-choice standardization.
 * - CloudLlmParsingStrategy: Live Cloud LLM medical reasoning & Edge AI fallback.
 * - DeterministicClinicalRefereeStrategy: Offline deterministic clinical referee & keyword deduction.
 * - QuestionParsingTelemetryAndPipeline: Real-time tool step telemetry + Consensus + Schema Validation + QDD Deduplication.
 */

import type { Question } from '../../model/types.ts';
import type { RawQuestionParseRequest, ParseResultSummary } from './types.ts';
import { curriculumClassificationAgent } from '../../taxonomy/CurriculumClassificationAgent.ts';
import { LEGACY_DEFAULT_BLOCK_ID } from '../../curriculum/ids.ts';
import { QuestionNormalizer, normalizeBlockId } from '../QuestionNormalizer.ts';
import { TextSegmentationAndChoiceExtractor } from './TextSegmentationAndChoiceExtractor.ts';
import { DeterministicClinicalRefereeStrategy } from './DeterministicClinicalRefereeStrategy.ts';
import { DirectJsonQuestionStrategy } from './DirectJsonQuestionStrategy.ts';
import { CloudLlmParsingStrategy, type CloudStreamingProvider } from './CloudLlmParsingStrategy.ts';
import { QuestionParsingTelemetryAndPipeline } from './QuestionParsingTelemetryAndPipeline.ts';

export { normalizeBlockId };

export class QuestionParsingAgent {
  constructor(private readonly providerOverride?: CloudStreamingProvider) {}

  /**
   * Main parsing entrypoint with real-time agent tool execution telemetry.
   */
  public async parseRawQuestions(
    request: RawQuestionParseRequest,
    signal?: AbortSignal
  ): Promise<ParseResultSummary> {
    const startTime = Date.now();
    const rawText = request.rawText.trim();
    let telemetry = QuestionParsingTelemetryAndPipeline.createInitialTelemetry(
      Boolean(request.enableConsensusCheck)
    );
    request.onTelemetryUpdate?.(telemetry);

    if (!rawText) {
      telemetry = {
        ...telemetry,
        isRunning: false,
        currentStepId: null,
        activeToolName: null,
      };
      request.onTelemetryUpdate?.(telemetry);
      return {
        items: [],
        totalParsed: 0,
        totalMissingAnswerKeys: 0,
        durationMs: 0,
        modelUsed: request.modelId,
      };
    }

    const isTestEnv = Boolean(
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
        import.meta.env?.VITEST ||
        import.meta.env?.MODE === 'test'
    );

    // DIRECT JSON FAST-PATH: If rawText is structured JSON array or object, parse directly with 100% data fidelity
    const directJsonItems = DirectJsonQuestionStrategy.tryExtractDirectJson(rawText);
    if (directJsonItems && directJsonItems.length > 0) {
      const targetBlockId = DirectJsonQuestionStrategy.resolveTargetBlockId(
        directJsonItems,
        request
      );

      telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
        telemetry,
        'segmentation',
        'completed',
        {
          durationMs: 1,
          detail: `Direct JSON Engine: Extracted ${directJsonItems.length} structured question object(s) with 100% data fidelity`,
        }
      );
      request.onTelemetryUpdate?.(telemetry);

      telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
        telemetry,
        'taxonomy',
        'completed',
        {
          durationMs: 1,
          detail: `Grounded against [${targetBlockId.toUpperCase()}] curriculum taxonomy structure`,
        }
      );
      request.onTelemetryUpdate?.(telemetry);

      telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
        telemetry,
        'reasoning',
        'completed',
        {
          durationMs: 1,
          detail: `Preserved authored stems, rationales, answer keys, and syllabus evidence citations`,
        }
      );
      request.onTelemetryUpdate?.(telemetry);

      const directParsedResult = DirectJsonQuestionStrategy.extractDirectJsonItems(
        directJsonItems,
        request,
        targetBlockId,
        startTime
      );

      return QuestionParsingTelemetryAndPipeline.runPostExtractionPipeline({
        parsedResult: directParsedResult,
        request,
        initialTelemetry: telemetry,
        startTime,
        targetBlockId,
        isTestEnv,
        modelUsedOverride: 'direct-json-engine',
        signal,
      });
    }

    // STEP 1: Text Segmentation & Tokenization
    const segStartTime = Date.now();
    telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
      telemetry,
      'segmentation',
      'running',
      {
        detail: 'Scanning text blocks, identifying stems, choice lists, and delimiter markers...',
      }
    );
    request.onTelemetryUpdate?.(telemetry);

    const rawBlocks = TextSegmentationAndChoiceExtractor.segmentRawTextIntoBlocks(rawText);
    telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
      telemetry,
      'segmentation',
      'completed',
      {
        durationMs: Date.now() - segStartTime,
        detail: `Identified and isolated ${rawBlocks.length} distinct question block(s)`,
      }
    );
    request.onTelemetryUpdate?.(telemetry);

    // STEP 2: Curriculum Taxonomy Classification & Gap Analysis
    const taxStartTime = Date.now();
    telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
      telemetry,
      'taxonomy',
      'running',
      {
        detail:
          'Matching clinical concepts against active CVS curriculum and evaluating unmapped domains...',
      }
    );
    request.onTelemetryUpdate?.(telemetry);

    const firstBlockSnippet = rawBlocks[0] || rawText;
    const initialClassification = curriculumClassificationAgent.classify(firstBlockSnippet);
    telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
      telemetry,
      'taxonomy',
      'completed',
      {
        durationMs: Date.now() - taxStartTime,
        detail: `Mapped to [${initialClassification.blockName}] ❯ ${initialClassification.subjectName} ❯ ${initialClassification.chapterName} (${initialClassification.confidenceScore}% Confidence)${
          initialClassification.isNewDomainSuggested ? ' [Curriculum Gap Detected]' : ''
        }`,
      }
    );
    request.onTelemetryUpdate?.(telemetry);

    // STEP 3: Primary Medical Clinical Reasoning & Distractor Authoring
    const reasoningStartTime = Date.now();
    telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
      telemetry,
      'reasoning',
      'running',
      {
        detail: `Engaging ${request.modelId} for clinical key deduction, distractor rationales, and exam tips...`,
      }
    );
    request.onTelemetryUpdate?.(telemetry);

    let parsedResult: ParseResultSummary | null = null;

    if ((!isTestEnv || this.providerOverride) && request.providerId && request.modelId) {
      try {
        const cloudResult = await CloudLlmParsingStrategy.parseViaCloudLlm(
          request,
          this.providerOverride,
          signal
        );
        if (cloudResult && cloudResult.items.length > 0) {
          parsedResult = cloudResult;
          telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
            telemetry,
            'reasoning',
            'completed',
            {
              durationMs: Date.now() - reasoningStartTime,
              detail: `${request.modelId} successfully extracted and grounded ${cloudResult.items.length} question(s)`,
            }
          );
          request.onTelemetryUpdate?.(telemetry);
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : undefined;
        console.warn(
          '[QuestionParsingAgent] Cloud LLM parsing issue, invoking deterministic fallback:',
          err
        );
        telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
          telemetry,
          'reasoning',
          'completed',
          {
            durationMs: Date.now() - reasoningStartTime,
            detail: `Notice: Cloud provider issue (${errMessage || 'timeout'}); engaged deterministic clinical referee`,
          }
        );
        request.onTelemetryUpdate?.(telemetry);
      }
    }

    if (!parsedResult) {
      parsedResult = DeterministicClinicalRefereeStrategy.parseDeterministicFallback(
        request,
        startTime
      );
      telemetry = QuestionParsingTelemetryAndPipeline.updateTelemetryStep(
        telemetry,
        'reasoning',
        'completed',
        {
          durationMs: Date.now() - reasoningStartTime,
          detail: `Deterministic Clinical Referee parsed ${parsedResult.items.length} question(s) with high-yield rules`,
        }
      );
      request.onTelemetryUpdate?.(telemetry);
    }

    const targetBlockId = (request.targetBlockId || LEGACY_DEFAULT_BLOCK_ID) as string;

    return QuestionParsingTelemetryAndPipeline.runPostExtractionPipeline({
      parsedResult,
      request,
      initialTelemetry: telemetry,
      startTime,
      targetBlockId,
      isTestEnv,
      signal,
    });
  }

  /**
   * Coerces a loosely-shaped question into a QuestionSchema-valid object
   * without altering stem, choice text, or the keyed answer.
   */
  public repairQuestionToSchema(
    raw: unknown,
    fallbackBlockId: string = LEGACY_DEFAULT_BLOCK_ID
  ): Question {
    return QuestionNormalizer.repairToQuestionSchema(raw, fallbackBlockId);
  }
}
