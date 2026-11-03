/**
 * Domain Service: QuestionCanonicalizerV2
 * Layer: Domain (Pure, Deterministic, Zero I/O)
 * Version: qdd-norm-v2
 */

import type { Question } from '../../model/types.ts';
import type {
  CanonicalQuestion,
  IQuestionCanonicalizer,
  NormalizerVersion,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { Sha256Hasher } from './sha256.ts';
import { ClinicalDiscriminatorExtractor } from './ClinicalDiscriminatorExtractor.ts';
import { ShingleExtractor } from './shingles.ts';

export class QuestionCanonicalizerV2 implements IQuestionCanonicalizer {
  public readonly version: NormalizerVersion = 'qdd-norm-v2';
  private readonly discriminatorExtractor = new ClinicalDiscriminatorExtractor();

  /**
   * Normalizes arbitrary text per qdd-norm-v2 rules:
   * 1. Unicode NFKC normalization
   * 2. Lowercase
   * 3. Quotes & dashes normalization
   * 4. LaTeX formula canonicalization
   * 5. Unit standardizations (mmHg, %, C)
   * 6. Whitespace collapsing
   */
  public normalizeText(rawText: string): string {
    let text = rawText.normalize('NFKC').toLowerCase();

    // Smart quotes and dashes
    text = text
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–]/g, '-');

    // LaTeX fractions and math delimiters
    text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
    text = text.replace(/\$([^\$]+)\$/g, '$1');

    // Clinical unit standardizations
    text = text
      .replace(/\bmm\s*hg\b/g, 'mmhg')
      .replace(/°\s*c\b/g, 'c')
      .replace(/(\d+)\s+%/g, '$1%');

    // Strip leading question numbers like "1.", "1-", "Q1:", "(1)"
    text = text.replace(/^(?:(?:question|item|q)\s*\d+\s*[:.)-]\s*|\(\d+\)\s*|\d+\s*[.):-]\s+)/i, '');

    // Strip multiple-choice leading labels like "a)", "b.", "(c)", "d:"
    // Crucial: Must NOT strip the English article "A" in "A 45-year-old male..."
    text = text.replace(/^(?:\(?[a-d]\)[.:\s-]*|[a-d][.:-]\s+)/i, '');

    // Collapse all whitespace and control characters into single spaces
    text = text.replace(/[\s\u0000-\u001f\u007f-\u009f]+/g, ' ').trim();

    // Strip outer surrounding quotes if present and trim again
    text = text.replace(/^["']+|["']+$/g, '').trim();

    return text;
  }

  /**
   * Normalizes choice text, additionally stripping trailing periods/punctuation noise
   * so "Blood culture." and "Blood culture" yield identical canonical choice & answerKey hashes.
   */
  public normalizeChoiceText(rawChoiceText: string): string {
    return this.normalizeText(rawChoiceText).replace(/[.]+$/, '').trim();
  }

  public async canonicalize(question: Question): Promise<CanonicalQuestion> {
    const canonicalStem = this.normalizeText(question.stem);

    // Normalize each choice and strip letter markers + trailing periods
    const normalizedChoices = (question.choices || []).map((c) => this.normalizeChoiceText(c.text));

    // Choice order invariance: sort alphabetically
    const canonicalChoices = [...normalizedChoices].sort();

    // Identify correct answer text
    const correctChoice = (question.choices || []).find((c) => c.isCorrect);
    const canonicalCorrectAnswer = correctChoice ? this.normalizeChoiceText(correctChoice.text) : '';

    // Embedding input string incorporates both stem and the target answer key
    const embeddingText = `${canonicalStem} || ${canonicalCorrectAnswer}`;

    // Hashes
    const stemHash = await Sha256Hasher.computeStemHash(canonicalStem);
    const itemPayload = `${canonicalStem} | ${canonicalChoices.join('␟')} | ${canonicalCorrectAnswer}`;
    const itemHash = await Sha256Hasher.computeItemHash(itemPayload);
    const answerKeyHash = await Sha256Hasher.computeAnswerKeyHash(canonicalCorrectAnswer);

    // Clinical discriminators
    const discriminators = this.discriminatorExtractor.extract(canonicalStem);

    // 3-shingles for MinHash
    const shingles = ShingleExtractor.extractShingles(canonicalStem);

    return {
      questionId: question.id,
      blockId: question.blockId || 'cvs',
      chapterId: question.chapterId,
      topicId: question.topicId,
      normalizerVersion: this.version,
      canonicalStem,
      canonicalChoices,
      canonicalCorrectAnswer,
      embeddingText,
      stemHash,
      itemHash,
      answerKeyHash,
      discriminators,
      shingles,
    };
  }
}
