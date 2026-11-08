import type { ChoiceId } from '../../model/types.ts';
import type {
  RawQuestionParseRequest,
  ParsedQuestionItem,
  ParseResultSummary,
} from './types.ts';
import { LEGACY_DEFAULT_BLOCK_ID } from '../../curriculum/ids.ts';
import { QuestionNormalizer, normalizeBlockId } from '../QuestionNormalizer.ts';
import { TextSegmentationAndChoiceExtractor } from './TextSegmentationAndChoiceExtractor.ts';
import { TaxonomyDisplayResolver } from '../../taxonomy/TaxonomyDisplayResolver.ts';
import cvsManifest from '../../../../content/cvs/manifest.json';
import cnsManifest from '../../../../content/cns/manifest.json';

interface ManifestChapterEntry {
  readonly id: string;
  readonly name: string | { readonly en?: string; readonly ar?: string };
  readonly subjectId: string;
}

interface ManifestTopicEntry {
  readonly id: string;
  readonly chapterId: string;
  readonly name: string | { readonly en?: string; readonly ar?: string };
}

interface BlockManifest {
  readonly chapters?: readonly ManifestChapterEntry[];
  readonly topics?: readonly ManifestTopicEntry[];
}

const KNOWN_MANIFESTS: Record<string, BlockManifest> = {
  [LEGACY_DEFAULT_BLOCK_ID]: cvsManifest as unknown as BlockManifest,
  cns: cnsManifest as unknown as BlockManifest,
};

/**
 * Direct JSON fast-path parser and curriculum manifest chapter/topic reconciler.
 */
export class DirectJsonQuestionStrategy {
  public static tryExtractDirectJson(rawText: string): Record<string, unknown>[] | null {
    const stripped = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    let candidate = stripped;
    const codeBlockMatch = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (codeBlockMatch) {
      candidate = codeBlockMatch[1].trim();
    }

    if (!candidate.startsWith('[') && !candidate.startsWith('{')) {
      const firstBracket = candidate.indexOf('[');
      const lastBracket = candidate.lastIndexOf(']');
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        candidate = candidate.slice(firstBracket, lastBracket + 1);
      } else if (firstBrace !== -1 && lastBrace > firstBrace) {
        candidate = candidate.slice(firstBrace, lastBrace + 1);
      } else {
        return null;
      }
    }

    try {
      const parsed = JSON.parse(candidate);
      let items: Record<string, unknown>[] = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.items)) {
          items = obj.items as Record<string, unknown>[];
        } else if (Array.isArray(obj.questions)) {
          items = obj.questions as Record<string, unknown>[];
        } else if (
          typeof obj.stem === 'string' ||
          (obj.question && typeof (obj.question as Record<string, unknown>).stem === 'string')
        ) {
          items = [obj];
        }
      }

      if (items.length === 0) return null;

      const looksLikeQuestion = items.some(
        (it) =>
          it && (typeof it.stem === 'string' || Array.isArray(it.choices) || Boolean(it.question))
      );
      return looksLikeQuestion ? items : null;
    } catch {
      return null;
    }
  }

  public static resolveTargetBlockId(
    rawJsonItems: readonly Record<string, unknown>[],
    request: RawQuestionParseRequest
  ): string {
    const firstWithBlock = rawJsonItems.find((it) => {
      if (!it) return false;
      if (typeof it.blockId === 'string') return true;
      const nested = it.question as Record<string, unknown> | undefined;
      return Boolean(nested && typeof nested.blockId === 'string');
    });
    const rawBlockId =
      (firstWithBlock?.blockId as string | undefined) ||
      ((firstWithBlock?.question as Record<string, unknown> | undefined)?.blockId as
        | string
        | undefined);
    return normalizeBlockId(rawBlockId || request.targetBlockId || LEGACY_DEFAULT_BLOCK_ID);
  }

  public static extractDirectJsonItems(
    rawJsonItems: readonly Record<string, unknown>[],
    request: RawQuestionParseRequest,
    targetBlockId: string,
    startTime: number
  ): ParseResultSummary {
    const validatedItems: ParsedQuestionItem[] = [];

    for (let i = 0; i < rawJsonItems.length; i++) {
      const rawItem = rawJsonItems[i];
      if (!rawItem || typeof rawItem !== 'object') continue;

      const item =
        rawItem.question && typeof rawItem.question === 'object'
          ? (rawItem.question as Record<string, unknown>)
          : rawItem;

      const rawStem = typeof item.stem === 'string' ? item.stem.trim() : '';
      const subjectId =
        typeof item.subjectId === 'string' && item.subjectId
          ? item.subjectId
          : request.targetSubjectId || 'anatomy';
      const concept =
        typeof item.concept === 'string' && item.concept
          ? item.concept
          : TextSegmentationAndChoiceExtractor.extractConceptTitle(
              rawStem,
              subjectId,
              targetBlockId
            );

      const reconciled = this.reconcileChapterAndTopic(
        targetBlockId,
        subjectId,
        (item.chapterId as string | undefined) || request.targetChapterId,
        item.topicId as string | undefined,
        concept,
        rawStem
      );

      const itemWarnings: string[] = [];
      if (reconciled.warning) {
        itemWarnings.push(reconciled.warning);
      }

      const choices = QuestionNormalizer.normalizeChoices(item.choices, {
        defaultCorrectRationale:
          'Correct. This option accurately reflects the established physiological or anatomical mechanism.',
        defaultIncorrectRationale: 'Incorrect for this specific clinical presentation.',
      });

      const correctChoice = choices.find((c) => c.isCorrect) || choices[0];
      const selectedCorrectChoiceId = (correctChoice.id as ChoiceId) || 'a';

      const evidence = QuestionNormalizer.normalizeEvidence(item.evidence, {
        blockId: targetBlockId,
        subjectId,
        concept,
        defaultChunkPrefix: `SRC-${targetBlockId.toUpperCase()}`,
        defaultSourceName: `${targetBlockId.toUpperCase()} Core Syllabus`,
        defaultLocation: 'Core Reference',
        defaultQuote: `Author-verified curriculum citation for ${concept}.`,
      });

      const repaired = QuestionNormalizer.repairToQuestionSchema(
        {
          ...item,
          id:
            typeof item.id === 'string' && item.id.trim()
              ? item.id.trim()
              : `q-parsed-${Date.now().toString(36)}-${i + 1}`,
          blockId: targetBlockId,
          subjectId,
          chapterId: reconciled.chapterId,
          topicId: reconciled.topicId,
          concept,
          stem: rawStem,
          choices,
          evidence,
        },
        targetBlockId
      );

      validatedItems.push({
        tempId: `item-${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
        rawInputExcerpt: rawStem.slice(0, 200),
        originalRawStem: rawStem,
        question: repaired,
        wasAnswerKeyProvidedInInput: true,
        aiGeneratedAnswerKey: false,
        selectedCorrectChoiceId,
        confidenceScore: 100,
        warnings: itemWarnings,
        isApproved: false,
        isReclassified: Boolean(item.chapterId && item.chapterId !== repaired.chapterId),
        originalDraftTaxonomy: item.chapterId
          ? {
              chapterName: String(item.chapterId),
              subjectName: typeof item.subjectId === 'string' ? item.subjectId : undefined,
              blockId: typeof item.blockId === 'string' ? item.blockId : undefined,
              blockName: typeof item.blockId === 'string' ? item.blockId : undefined,
            }
          : undefined,
        taxonomyClassification: {
          blockId: targetBlockId,
          blockName: TaxonomyDisplayResolver.humanizeTaxonomySlug(targetBlockId),
          subjectId,
          subjectName: TaxonomyDisplayResolver.resolveSubjectName(subjectId, undefined, targetBlockId),
          chapterId: repaired.chapterId,
          chapterName: TaxonomyDisplayResolver.resolveChapterName(repaired.chapterId, undefined, targetBlockId),
          confidenceScore: 100,
          rationale: 'Directly grounded from authored JSON structure',
          isNewDomainSuggested: false,
        },
      });
    }

    return {
      items: validatedItems,
      totalParsed: validatedItems.length,
      totalMissingAnswerKeys: 0,
      durationMs: Date.now() - startTime,
      modelUsed: 'direct-json-engine',
    };
  }

  public static reconcileChapterAndTopic(
    blockId: string,
    subjectId: string,
    rawChapterId: string | undefined,
    rawTopicId: string | undefined,
    concept: string | undefined,
    _stem: string
  ): { chapterId: string; topicId: string; warning?: string } {
    const manifest = KNOWN_MANIFESTS[blockId] || null;
    if (!manifest || !Array.isArray(manifest.chapters) || manifest.chapters.length === 0) {
      return {
        chapterId: rawChapterId || `${subjectId}-general`,
        topicId: rawTopicId || `${rawChapterId || subjectId}/core-concepts`,
      };
    }

    const chapters = manifest.chapters;
    const allTopics = Array.isArray(manifest.topics) ? manifest.topics : [];

    const subjectChapters = chapters.filter((c) => !subjectId || c.subjectId === subjectId);
    const candidateChapters = subjectChapters.length > 0 ? subjectChapters : chapters;

    let resolvedChapterId = candidateChapters[0]?.id || `${blockId}-${subjectId}-core`;
    let chapterWarning: string | undefined;

    const exactChap = candidateChapters.find((c) => c.id === rawChapterId);
    if (exactChap) {
      resolvedChapterId = exactChap.id;
    } else {
      let bestChap = candidateChapters[0];
      let maxOverlap = -1;

      for (const chap of candidateChapters) {
        const chapTokens = chap.id.toLowerCase().split(/[-_/\s]+/);
        const nameEn = typeof chap.name === 'string' ? chap.name : chap.name?.en || '';
        const nameTokens = nameEn.toLowerCase().split(/[-_/\s]+/);
        const allChapTokens = new Set([...chapTokens, ...nameTokens]);

        let score = 0;
        if (rawChapterId) {
          const rawTokens = rawChapterId
            .toLowerCase()
            .split(/[-_/\s]+/)
            .filter((t) => t.length > 2 && t !== blockId && t !== subjectId);
          for (const t of rawTokens) {
            if (allChapTokens.has(t)) score += 3;
          }
        }
        if (concept) {
          const conceptTokens = concept
            .toLowerCase()
            .split(/[-_/\s]+/)
            .filter((t) => t.length > 2);
          for (const t of conceptTokens) {
            if (allChapTokens.has(t)) score += 2;
          }
        }
        if (_stem) {
          const stemLower = _stem.toLowerCase();
          for (const ct of allChapTokens) {
            if (ct.length > 3 && stemLower.includes(ct)) score += 1;
          }
        }

        if (score > maxOverlap) {
          maxOverlap = score;
          bestChap = chap;
        }
      }

      if (bestChap && maxOverlap > 0) {
        resolvedChapterId = bestChap.id;
        if (rawChapterId && rawChapterId !== bestChap.id) {
          chapterWarning = `Chapter ID '${rawChapterId}' mapped to canonical '${bestChap.id}' via curriculum reconciliation.`;
        }
      } else if (rawChapterId && /^[a-z0-9-_/]+$/i.test(rawChapterId)) {
        resolvedChapterId = rawChapterId.toLowerCase().replace(/_/g, '-');
        chapterWarning = `Preserved custom chapter ID '${resolvedChapterId}' pending faculty review.`;
      }
    }

    const resolvedTopicId = this.reconcileTopic(
      resolvedChapterId,
      rawTopicId,
      concept,
      allTopics
    );

    return {
      chapterId: resolvedChapterId,
      topicId: resolvedTopicId,
      warning: chapterWarning,
    };
  }

  private static reconcileTopic(
    chapterId: string,
    rawTopicId: string | undefined,
    concept: string | undefined,
    allTopics: readonly ManifestTopicEntry[]
  ): string {
    const chapterTopics = allTopics.filter((t) => t.chapterId === chapterId);
    if (chapterTopics.length === 0) {
      return rawTopicId || `${chapterId}/core-concepts`;
    }

    if (rawTopicId) {
      const exactInChapter = chapterTopics.find((t) => t.id === rawTopicId);
      if (exactInChapter) return exactInChapter.id;

      const exactAnywhere = allTopics.find((t) => t.id === rawTopicId);
      if (exactAnywhere) return exactAnywhere.id;
    }

    const searchTarget = `${rawTopicId || ''} ${concept || ''}`.toLowerCase();
    const targetTokens = searchTarget.split(/[-_/\s]+/).filter((t) => t.length > 2);

    if (targetTokens.length > 0) {
      let bestTopic = chapterTopics[0];
      let maxOverlap = -1;

      for (const top of chapterTopics) {
        const topTokens = top.id.toLowerCase().split(/[-_/\s]+/);
        const nameEn = typeof top.name === 'string' ? top.name : top.name?.en || '';
        const nameTokens = nameEn.toLowerCase().split(/[-_/\s]+/);
        const allTopTokens = new Set([...topTokens, ...nameTokens]);

        const overlap = targetTokens.filter((t) => {
          for (const tt of allTopTokens) {
            if (tt === t || tt.includes(t) || t.includes(tt)) return true;
          }
          return false;
        }).length;

        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestTopic = top;
        }
      }

      if (maxOverlap > 0) {
        return bestTopic.id;
      }
    }

    return chapterTopics[0].id;
  }
}
