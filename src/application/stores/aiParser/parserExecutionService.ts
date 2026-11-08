/**
 * ParserExecutionService
 *
 * Dedicated domain and store service for executing AI question parsing pipelines
 * via QuestionParsingAgent and performing multi-model quorum consensus checks.
 */

import { QuestionParsingAgent } from '../../../domain/questionBank/aiQuestionParser/QuestionParsingAgent.ts';
import { multiModelConsensusEngine } from '../../../domain/questionBank/aiQuestionParser/MultiModelConsensusEngine.ts';
import type {
  ParsedQuestionItem,
  QuestionStemMode,
  AgentExecutionTelemetry,
} from '../../../domain/questionBank/aiQuestionParser/types.ts';
import type { CloudProviderId } from '../../../domain/ai/settings.ts';
import type { BlockId } from '../../../domain/curriculum/ids.ts';
import { getMergedBankQuestions } from './qddVerificationService.ts';

const parsingAgent = new QuestionParsingAgent();

export interface ParseOptions {
  rawInputText: string;
  selectedProvider: CloudProviderId;
  selectedModelId: string;
  targetBlockId: BlockId;
  targetSubjectId: string;
  targetChapterId: string;
  stemMode: QuestionStemMode;
  enableConsensusCheck: boolean;
  onTelemetryUpdate: (telemetry: AgentExecutionTelemetry) => void;
}

export interface ParseExecutionResult {
  readonly items: readonly ParsedQuestionItem[];
  readonly detectedBlockId?: BlockId;
  readonly safeIds: Set<string>;
}

export async function executeParseRawQuestions(
  options: ParseOptions,
  signal: AbortSignal
): Promise<ParseExecutionResult> {
  const bankQuestions = await getMergedBankQuestions();

  const result = await parsingAgent.parseRawQuestions(
    {
      rawText: options.rawInputText,
      providerId: options.selectedProvider,
      modelId: options.selectedModelId,
      targetBlockId: options.targetBlockId,
      stemMode: options.stemMode,
      enableConsensusCheck: options.enableConsensusCheck,
      existingQuestions: bankQuestions,
      targetSubjectId:
        options.targetSubjectId === 'all' || options.targetSubjectId === 'auto'
          ? undefined
          : options.targetSubjectId,
      targetChapterId:
        options.targetChapterId === 'all' || options.targetChapterId === 'auto'
          ? undefined
          : options.targetChapterId,
      onTelemetryUpdate: options.onTelemetryUpdate,
    },
    signal
  );

  if (result.items.length === 0) {
    return {
      items: [],
      safeIds: new Set(),
    };
  }

  const detectedBlockId = result.items[0]?.question?.blockId as BlockId | undefined;

  const safeIds = new Set(
    result.items
      .filter((i) => {
        const rel = i.qddVerdict?.relation;
        return rel !== 'EXACT' && rel !== 'NEAR' && rel !== 'CONFLICT';
      })
      .map((i) => i.tempId)
  );

  return {
    items: result.items,
    detectedBlockId,
    safeIds,
  };
}

export async function executeSingleQuestionConsensus(
  parsedQuestions: readonly ParsedQuestionItem[],
  index: number,
  selectedModelId: string
): Promise<ParsedQuestionItem[]> {
  const list = [...parsedQuestions];
  const target = list[index];
  if (!target) return list;

  const consensus = await multiModelConsensusEngine.verifyConsensus(
    target.question,
    selectedModelId
  );
  list[index] = {
    ...target,
    consensusSummary: consensus,
  };
  return list;
}
