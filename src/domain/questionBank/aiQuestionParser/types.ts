/**
 * Domain Types: AI Question Parsing & Anti-Hallucination Studio
 * Clean Architecture / Domain Driven Design (Apple Engineering Standards)
 * Layer: Domain
 */

import type { Question, ChoiceId, SubjectId, ChapterId } from '../../model/types.ts';
import type { CloudProviderId } from '../../ai/settings.ts';

export interface RawQuestionParseRequest {
  readonly rawText: string;
  readonly providerId: CloudProviderId;
  readonly modelId: string;
  readonly targetSubjectId?: SubjectId;
  readonly targetChapterId?: ChapterId;
}

export interface ParsedQuestionItem {
  readonly tempId: string;
  readonly rawInputExcerpt: string;
  readonly question: Question;
  /** Whether the administrator explicitly indicated the answer key in the raw text */
  readonly wasAnswerKeyProvidedInInput: boolean;
  /** Whether the AI Agent had to solve the question and generate the answer key */
  readonly aiGeneratedAnswerKey: boolean;
  /** Keyed correct choice ('a' | 'b' | 'c' | 'd') */
  readonly selectedCorrectChoiceId: ChoiceId;
  /** Estimated clinical confidence of the parsed question */
  readonly confidenceScore: number; // 0 to 100
  /** Informative warnings regarding ambiguities or missing fields */
  readonly warnings: readonly string[];
  /** Approval status prior to committing to the Global Question Bank */
  readonly isApproved: boolean;
}

export interface ParseResultSummary {
  readonly items: readonly ParsedQuestionItem[];
  readonly totalParsed: number;
  readonly totalMissingAnswerKeys: number;
  readonly durationMs: number;
  readonly modelUsed: string;
}

export interface CrossModelPromptOptions {
  readonly questions: readonly Question[];
  readonly contextNote?: string;
  readonly includeRationales?: boolean;
}
