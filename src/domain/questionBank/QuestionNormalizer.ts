/**
 * Domain Service: QuestionNormalizer
 * Single Source of Truth for normalizing, repairing, patching, and enriching
 * Question & GovernedQuestion entities across Client Stores, AI Parsers, and Edge Workers.
 *
 * Eliminates duplicated field coercion and governance enrichment logic (DRY & Open/Closed Principle).
 */

import {
  PATCHABLE_QUESTION_FIELDS,
  type Choice,
  type ChoiceId,
  type Evidence,
  type Question,
} from '../model/types.ts';
import { LEGACY_DEFAULT_BLOCK_ID } from '../curriculum/ids.ts';
import { QuestionCanonicalHasher } from './canonicalHasher.ts';
import type {
  GovernedQuestion,
  QuestionEditorialStatus,
  QuestionMutationPatch,
  QuestionProvenanceScope,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

const CHOICE_IDS: readonly ChoiceId[] = ['a', 'b', 'c', 'd'];
const VALID_COGNITIVE_LEVELS = new Set<Question['cognitiveLevel']>([
  'recall',
  'understanding',
  'application',
]);

export interface ChoiceNormalizationOptions {
  readonly defaultCorrectRationale?: string;
  readonly defaultIncorrectRationale?: string;
}

export interface EvidenceNormalizationOptions {
  readonly blockId: string;
  readonly subjectId: string;
  readonly concept: string;
  readonly defaultChunkPrefix?: string;
  readonly defaultSourceName?: string;
  readonly defaultLocation?: string;
  readonly defaultQuote?: string;
}

export interface GovernanceEnrichmentOverrides {
  readonly blockId?: string;
  readonly provenanceScope?: QuestionProvenanceScope;
  readonly editorialStatus?: QuestionEditorialStatus;
  readonly globalRevision?: number;
  readonly authorId?: string;
  readonly authorDisplayName?: string;
  readonly reviewedById?: string | null;
  readonly reviewedByDisplayName?: string | null;
  readonly reviewerNotes?: string | null;
  readonly nowIso?: string;
}

/**
 * Resolves a raw block identifier or clinical label into a canonical BlockId.
 */
export function normalizeBlockId(
  rawBlockId: string | undefined | null,
  fallbackBlockId: string = LEGACY_DEFAULT_BLOCK_ID,
  questionCue?: { id?: string; subjectId?: string; stem?: string }
): string {
  if (questionCue) {
    const cueStr = `${questionCue.id || ''} ${questionCue.subjectId || ''}`.toLowerCase();
    if (cueStr.includes('cns') || cueStr.includes('neuro') || cueStr.includes('supratentorial')) {
      return 'cns';
    }
    if (cueStr.includes('cvs') || cueStr.includes('cardio')) {
      return LEGACY_DEFAULT_BLOCK_ID;
    }
  }

  if (!rawBlockId || typeof rawBlockId !== 'string') {
    return fallbackBlockId ? normalizeBlockId(fallbackBlockId, LEGACY_DEFAULT_BLOCK_ID) : LEGACY_DEFAULT_BLOCK_ID;
  }

  const clean = rawBlockId.toLowerCase().trim();

  // Central Nervous System matching (e.g. block-02-supratentorial, cns-neuroscience)
  if (
    clean === 'cns' ||
    clean.startsWith('cns-') ||
    clean.includes('cns') ||
    clean.includes('neuro') ||
    clean.includes('supratentorial') ||
    clean.includes('infratentorial') ||
    clean.includes('brain') ||
    clean.includes('cerebr') ||
    clean.includes('cortex') ||
    clean.includes('cerebell') ||
    clean.includes('spinal') ||
    clean.includes('spine') ||
    clean.includes('mening')
  ) {
    return 'cns';
  }

  // Cardiovascular System matching (e.g. cvs, block-206, cvs-cardiology)
  if (
    clean === LEGACY_DEFAULT_BLOCK_ID ||
    clean.startsWith('cvs-') ||
    clean.includes('cvs') ||
    clean.includes('cardio') ||
    clean.includes('cardiac') ||
    clean.includes('heart') ||
    clean.includes('vascular') ||
    clean.includes('circulation')
  ) {
    return LEGACY_DEFAULT_BLOCK_ID;
  }

  // Only return clean if it is a valid lowercase slug with 2-12 chars (per BlockIdSchema)
  if (/^[a-z][a-z0-9]{1,11}$/.test(clean)) {
    return clean;
  }

  return fallbackBlockId ? normalizeBlockId(fallbackBlockId, LEGACY_DEFAULT_BLOCK_ID) : LEGACY_DEFAULT_BLOCK_ID;
}

export class QuestionNormalizer {
  public static normalizeDifficulty(raw: unknown): 1 | 2 | 3 {
    const num = Number(raw);
    return num === 1 || num === 2 || num === 3 ? num : 2;
  }

  public static normalizeCognitiveLevel(raw: unknown): Question['cognitiveLevel'] {
    const clean = String(raw || '').toLowerCase() as Question['cognitiveLevel'];
    return VALID_COGNITIVE_LEVELS.has(clean) ? clean : 'understanding';
  }

  public static normalizeChoices(
    rawChoicesInput: unknown,
    options?: ChoiceNormalizationOptions
  ): Choice[] {
    const rawChoices = Array.isArray(rawChoicesInput) ? rawChoicesInput : [];
    const hasCorrect = rawChoices.some((c) => c && c.isCorrect === true);

    const correctFallback =
      options?.defaultCorrectRationale ?? 'Correct answer per clinical reasoning.';
    const incorrectFallback =
      options?.defaultIncorrectRationale ?? 'Incorrect for this clinical scenario.';

    const choices: Choice[] = CHOICE_IDS.map((id, idx) => {
      const c =
        rawChoices.find((rc) => String(rc?.id || '').toLowerCase() === id) ||
        rawChoices[idx] ||
        {};
      const isCorrect = hasCorrect ? c.isCorrect === true : idx === 0;
      let text =
        typeof c.text === 'string' && c.text.trim()
          ? c.text.trim()
          : `Option ${id.toUpperCase()}`;
      text = text.replace(/\s+(?:[([{\s]*[e-f][)\]}:.]|[e-f]\s*[-–—]+)\s+.*$/i, '').trim();
      const rationale =
        typeof c.rationale === 'string' && c.rationale.trim().length >= 5
          ? c.rationale.trim()
          : isCorrect
          ? correctFallback
          : incorrectFallback;
      return { id, text, isCorrect, rationale };
    });

    // Enforce single correct answer invariant
    let seenCorrect = false;
    for (const choice of choices) {
      if (choice.isCorrect && !seenCorrect) {
        seenCorrect = true;
      } else {
        choice.isCorrect = false;
      }
    }

    return choices;
  }

  public static synthesizeDefaultEvidence(
    subjectId: string,
    concept: string,
    blockId: string = LEGACY_DEFAULT_BLOCK_ID
  ): Evidence {
    const normBlock = normalizeBlockId(blockId);
    if (normBlock === 'cns') {
      const cnsSources: Record<string, { name: string; loc: string }> = {
        anatomy: {
          name: 'Snell Clinical Neuroanatomy & Netter Atlas of Neuroscience',
          loc: 'Neuroanatomy Core Syllabus',
        },
        physiology: {
          name: 'Guyton and Hall Textbook of Medical Physiology 14th Ed',
          loc: 'Unit IX: The Nervous System',
        },
        histology: {
          name: 'Junqueira Basic Histology 16th Ed',
          loc: 'Nervous Tissue & Glial Cells',
        },
        'pathology-micro': {
          name: 'Robbins & Cotran Pathologic Basis of Disease 10th Ed',
          loc: 'Chapter 28: Central Nervous System',
        },
        pharmacology: {
          name: 'Katzung Basic & Clinical Pharmacology 15th Ed',
          loc: 'Section V: Drugs Acting on the CNS',
        },
      };
      const src = cnsSources[subjectId] || cnsSources.anatomy;
      return {
        chunkId: `chunk-cns-${subjectId}-${Date.now().toString(36)}`,
        sourceName: src.name,
        location: src.loc,
        quote: `Curriculum syllabus excerpt validating ${concept} clinical principles and evidence.`,
        kind: 'text',
      };
    }

    const sources: Record<string, { name: string; loc: string }> = {
      anatomy: {
        name: 'Langman Medical Embryology & Moore Clinically Oriented Anatomy',
        loc: 'Chapter 13, CVS Development',
      },
      physiology: {
        name: 'Guyton and Hall Textbook of Medical Physiology 14th Ed',
        loc: 'Unit IV: Circulation & Cardiac Mechanics',
      },
      pharmacology: {
        name: 'Katzung Basic & Clinical Pharmacology 15th Ed',
        loc: 'Chapter 13: Cardiovascular Drugs',
      },
      microbiology: {
        name: 'Jawetz, Melnick & Adelberg Medical Microbiology 28th Ed',
        loc: 'Infective Endocarditis & Pericarditis',
      },
    };

    const src = sources[subjectId] || sources.physiology;
    return {
      chunkId: `chunk-${subjectId}-${Date.now().toString(36)}`,
      sourceName: src.name,
      location: src.loc,
      quote: `Official curriculum syllabus excerpt validating ${concept} clinical principles and evidence.`,
      kind: 'text',
    };
  }

  public static normalizeEvidence(
    rawEvidenceInput: unknown,
    options: EvidenceNormalizationOptions
  ): Evidence[] {
    const rawEvidence = Array.isArray(rawEvidenceInput) ? rawEvidenceInput : [];
    const normalizedBlock = normalizeBlockId(options.blockId);
    const defaultSource =
      options.defaultSourceName ?? `${normalizedBlock.toUpperCase()} Curriculum Reference`;
    const defaultLocation = options.defaultLocation ?? 'Core Syllabus';
    const defaultQuote =
      options.defaultQuote ??
      `Curriculum evidence supporting ${options.concept} clinical evaluation.`;

    const evidence: Evidence[] = rawEvidence
      .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
      .map((e, idx) => ({
        chunkId:
          typeof e.chunkId === 'string' && e.chunkId
            ? e.chunkId
            : options.defaultChunkPrefix
            ? `${options.defaultChunkPrefix}-${idx + 1}`
            : `chunk-${Date.now().toString(36)}`,
        sourceName:
          typeof e.sourceName === 'string' && e.sourceName ? e.sourceName : defaultSource,
        location:
          typeof e.location === 'string' && e.location ? e.location : defaultLocation,
        quote:
          typeof e.quote === 'string' && e.quote.trim().length >= 10
            ? e.quote.trim()
            : defaultQuote,
        kind: e.kind === 'figure' ? ('figure' as const) : ('text' as const),
      }));

    if (evidence.length === 0) {
      evidence.push(
        this.synthesizeDefaultEvidence(options.subjectId, options.concept, normalizedBlock)
      );
    }

    return evidence;
  }

  /**
   * Coerces any loosely-shaped question candidate into a QuestionSchema-valid object
   * while preserving any additional properties (such as governance metadata).
   */
  public static repairToQuestionSchema(
    raw: unknown,
    fallbackBlockId: string = LEGACY_DEFAULT_BLOCK_ID
  ): Question {
    const q = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
    const choices = this.normalizeChoices(q.choices);
    const difficulty = this.normalizeDifficulty(q.difficulty);
    const cognitiveLevel = this.normalizeCognitiveLevel(q.cognitiveLevel);

    const normalizedBlock = normalizeBlockId(q.blockId, fallbackBlockId);
    const subjectId =
      typeof q.subjectId === 'string' && q.subjectId ? q.subjectId : 'anatomy';
    const chapterId =
      typeof q.chapterId === 'string' && q.chapterId ? q.chapterId : `${subjectId}-general`;
    const concept =
      typeof q.concept === 'string' && q.concept
        ? q.concept
        : `${normalizedBlock.toUpperCase()} Clinical Assessment`;
    const stem = typeof q.stem === 'string' ? q.stem.trim() : '';

    const evidence = this.normalizeEvidence(q.evidence, {
      blockId: normalizedBlock,
      subjectId,
      concept,
    });

    const correct = choices.find((c) => c.isCorrect) || choices[0];
    const explanation =
      typeof q.explanation === 'string' && q.explanation.trim().length >= 10
        ? q.explanation.trim()
        : `The correct answer is (${correct.id.toUpperCase()}): "${correct.text}". ${correct.rationale}`;

    return {
      ...q,
      id:
        typeof q.id === 'string' && q.id
          ? q.id
          : `q-parsed-${Date.now().toString(36)}`,
      blockId: normalizedBlock,
      subjectId,
      chapterId,
      topicId:
        typeof q.topicId === 'string' && q.topicId
          ? q.topicId
          : `${chapterId}/core-concepts`,
      concept,
      type: q.type === 'true-false' ? 'true-false' : 'single-best-answer',
      stem:
        stem.length >= 10
          ? stem
          : `Clinical scenario regarding ${concept}: ${stem}`.trim(),
      choices,
      explanation,
      examTip: typeof q.examTip === 'string' ? q.examTip : null,
      mnemonic: typeof q.mnemonic === 'string' ? q.mnemonic : null,
      difficulty,
      cognitiveLevel,
      highYield: q.highYield !== false,
      origin:
        q.origin === 'curriculum-self-assessment'
          ? 'curriculum-self-assessment'
          : 'authored-grounded',
      evidence,
      status: q.status === 'quarantined' ? 'quarantined' : 'active',
      bankVersion:
        Number.isInteger(q.bankVersion) && q.bankVersion > 0 ? q.bankVersion : 1,
    } as Question;
  }

  /**
   * Filters an untrusted patch object against PATCHABLE_QUESTION_FIELDS
   * derived directly from QuestionObjectSchema.
   */
  public static sanitizeMutationPatch(
    rawPatch: Record<string, unknown>
  ): QuestionMutationPatch {
    const sanitized: Record<string, unknown> = {};
    for (const field of PATCHABLE_QUESTION_FIELDS) {
      if (field in rawPatch && rawPatch[field] !== undefined) {
        sanitized[field] = rawPatch[field];
      }
    }
    return sanitized as QuestionMutationPatch;
  }

  /**
   * Enriches a Question with default or overridden governance metadata.
   */
  public static enrichWithGovernanceDefaults(
    question: Question | GovernedQuestion,
    overrides?: GovernanceEnrichmentOverrides
  ): GovernedQuestion {
    const existing = question as Partial<GovernedQuestion>;
    const nowIso = overrides?.nowIso ?? new Date().toISOString();
    return {
      ...question,
      blockId: question.blockId || overrides?.blockId || LEGACY_DEFAULT_BLOCK_ID,
      provenanceScope:
        overrides?.provenanceScope ?? existing.provenanceScope ?? 'seed-bundled',
      editorialStatus:
        overrides?.editorialStatus ?? existing.editorialStatus ?? 'published',
      stemHash:
        existing.stemHash || QuestionCanonicalHasher.computeStemHashSync(question.stem),
      globalRevision: overrides?.globalRevision ?? existing.globalRevision ?? 1,
      authorId:
        (overrides?.authorId ??
          existing.authorId ??
          'usr-curriculum-faculty') as GovernedQuestion['authorId'],
      authorDisplayName:
        overrides?.authorDisplayName ??
        existing.authorDisplayName ??
        'Curriculum Faculty Committee',
      reviewedById:
        overrides?.reviewedById !== undefined
          ? (overrides.reviewedById as GovernedQuestion['reviewedById'])
          : ((existing.reviewedById ?? 'usr-admin-initial') as GovernedQuestion['reviewedById']),
      reviewedByDisplayName:
        overrides?.reviewedByDisplayName !== undefined
          ? overrides.reviewedByDisplayName
          : (existing.reviewedByDisplayName ?? 'Board Administrator'),
      reviewerNotes:
        overrides?.reviewerNotes !== undefined
          ? overrides.reviewerNotes
          : (existing.reviewerNotes ?? 'Official faculty syllabus verified item.'),
      publishedAt: existing.publishedAt ?? nowIso,
      createdAt: existing.createdAt ?? nowIso,
      updatedAt: existing.updatedAt ?? nowIso,
    };
  }

  /**
   * Enriches a list of bundled/seed questions into GovernedQuestion items.
   */
  public static enrichBundledQuestions(
    rawList: readonly (Question | GovernedQuestion)[],
    overrides?: GovernanceEnrichmentOverrides
  ): GovernedQuestion[] {
    const nowIso = overrides?.nowIso ?? new Date().toISOString();
    return rawList.map((q) =>
      this.enrichWithGovernanceDefaults(q, { ...overrides, nowIso })
    );
  }

  /**
   * Filters out quarantined or archived questions for active learner sessions.
   */
  public static filterActiveQuestions(
    list: readonly (Question | GovernedQuestion)[]
  ): Question[] {
    return list.filter(
      (q) =>
        q.status !== 'quarantined' &&
        (q as GovernedQuestion).editorialStatus !== 'archived'
    ) as Question[];
  }
}
