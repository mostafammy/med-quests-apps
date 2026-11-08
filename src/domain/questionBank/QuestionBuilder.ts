/**
 * Builder Pattern: QuestionBuilder
 * Provides a fluent, type-safe construction API for Question, GovernedQuestion,
 * and UI edit drafts.
 *
 * Centralizes default field values so adding a new field to QuestionSchema
 * requires updating only this builder instead of 30+ test files and UI forms.
 */

import {
  QuestionSchema,
  type Choice,
  type ChoiceId,
  type Evidence,
  type Question,
} from '../model/types.ts';
import { LEGACY_DEFAULT_BLOCK_ID } from '../curriculum/ids.ts';
import {
  QuestionNormalizer,
  type GovernanceEnrichmentOverrides,
} from './QuestionNormalizer.ts';
import type {
  GovernedQuestion,
  QuestionMutationPatch,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

export interface CanonicalQuestionEditDraft {
  readonly concept: string;
  readonly stem: string;
  readonly explanation: string;
  readonly examTip: string;
  readonly mnemonic: string;
  readonly difficulty: 1 | 2 | 3;
  readonly cognitiveLevel: Question['cognitiveLevel'];
  readonly highYield: boolean;
  readonly subjectId: string;
  readonly chapterId: string;
  readonly choices: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    rationale: string;
  }>;
  readonly changeReason: string;
}

export class QuestionBuilder {
  private draft: Question;

  private constructor(initial?: Partial<Question>) {
    this.draft = {
      id: 'q-cvs-builder-0001',
      blockId: LEGACY_DEFAULT_BLOCK_ID,
      subjectId: 'physiology',
      chapterId: 'cvs-phys-cardiac-cycle',
      topicId: 'cvs-phys-cardiac-cycle/ventricular-systole',
      concept: ' Frank-Starling Mechanism & Ventricular Preload',
      type: 'single-best-answer',
      stem: 'A 58-year-old patient presents with exertional dyspnea. An increase in end-diastolic volume directly increases stroke volume via which physiological mechanism?',
      choices: [
        {
          id: 'a',
          text: 'Optimal actin-myosin cross-bridge overlap within sarcomeres',
          isCorrect: true,
          rationale:
            'Correct. Stretching myocardial fibers toward optimal length increases sarcomere sensitivity to calcium and cross-bridge tension.',
        },
        {
          id: 'b',
          text: 'Decreased L-type calcium channel conductance during phase 2',
          isCorrect: false,
          rationale:
            'Incorrect. Decreased calcium influx reduces contractility (negative inotropy) rather than mediating preload-dependent stroke volume.',
        },
        {
          id: 'c',
          text: 'Inhibition of sarcoplasmic reticulum SERCA2a reuptake pumps',
          isCorrect: false,
          rationale:
            'Incorrect. SERCA2a inhibition impairs lusitropy and subsequent preload calcium loading.',
        },
        {
          id: 'd',
          text: 'Activation of parasympathetic muscarinic M2 receptors on ventricular myocytes',
          isCorrect: false,
          rationale:
            'Incorrect. Vagal M2 innervation primarily regulates nodal tissue rather than ventricular Frank-Starling length-tension dynamics.',
        },
      ],
      explanation:
        'The Frank-Starling law of the heart states that stroke volume increases in response to an increase in ventricular end-diastolic volume (preload) due to optimal myofilament overlap and enhanced troponin C calcium sensitivity.',
      examTip: 'Preload = End-Diastolic Volume (EDV); Contractility shifts the Frank-Starling curve upward.',
      mnemonic: null,
      difficulty: 2,
      cognitiveLevel: 'understanding',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [
        {
          chunkId: 'chunk-cvs-phys-001',
          sourceName: 'Guyton and Hall Textbook of Medical Physiology 14th Ed',
          location: 'Chapter 9, Page 117',
          quote:
            'Within physiological limits, the heart pumps all the blood that returns to it by the way of the veins.',
          kind: 'text',
        },
      ],
      status: 'active',
      bankVersion: 1,
      ...initial,
    };
  }

  public static aQuestion(initial?: Partial<Question>): QuestionBuilder {
    return new QuestionBuilder(initial);
  }

  public static aValidQuestion(initial?: Partial<Question>): QuestionBuilder {
    return new QuestionBuilder(initial);
  }

  public withId(id: string): this {
    this.draft = { ...this.draft, id };
    return this;
  }

  public withBlockId(blockId: string): this {
    this.draft = { ...this.draft, blockId };
    return this;
  }

  public withSubjectId(subjectId: string): this {
    this.draft = { ...this.draft, subjectId };
    return this;
  }

  public withChapterId(chapterId: string): this {
    this.draft = { ...this.draft, chapterId };
    return this;
  }

  public withTopicId(topicId: string): this {
    this.draft = { ...this.draft, topicId };
    return this;
  }

  public withConcept(concept: string): this {
    this.draft = { ...this.draft, concept };
    return this;
  }

  public withStem(stem: string): this {
    this.draft = { ...this.draft, stem };
    return this;
  }

  public withChoices(choices: Choice[]): this {
    this.draft = { ...this.draft, choices };
    return this;
  }

  public withCorrectChoice(correctId: ChoiceId): this {
    this.draft = {
      ...this.draft,
      choices: this.draft.choices.map((c) => ({
        ...c,
        isCorrect: c.id === correctId,
      })),
    };
    return this;
  }

  public withExplanation(explanation: string): this {
    this.draft = { ...this.draft, explanation };
    return this;
  }

  public withExamTip(examTip: string | null): this {
    this.draft = { ...this.draft, examTip };
    return this;
  }

  public withMnemonic(mnemonic: string | null): this {
    this.draft = { ...this.draft, mnemonic };
    return this;
  }

  public withDifficulty(difficulty: 1 | 2 | 3): this {
    this.draft = { ...this.draft, difficulty };
    return this;
  }

  public withCognitiveLevel(cognitiveLevel: Question['cognitiveLevel']): this {
    this.draft = { ...this.draft, cognitiveLevel };
    return this;
  }

  public withHighYield(highYield: boolean): this {
    this.draft = { ...this.draft, highYield };
    return this;
  }

  public withOrigin(origin: Question['origin']): this {
    this.draft = { ...this.draft, origin };
    return this;
  }

  public withEvidence(evidence: Evidence[]): this {
    this.draft = { ...this.draft, evidence };
    return this;
  }

  public withStatus(status: Question['status']): this {
    this.draft = { ...this.draft, status };
    return this;
  }

  public withBankVersion(bankVersion: number): this {
    this.draft = { ...this.draft, bankVersion };
    return this;
  }

  public withOverrides(overrides: Partial<Question>): this {
    this.draft = { ...this.draft, ...overrides };
    return this;
  }

  public build(): Question {
    return QuestionSchema.parse(this.draft);
  }

  public buildGoverned(overrides?: GovernanceEnrichmentOverrides): GovernedQuestion {
    const valid = this.build();
    return QuestionNormalizer.enrichWithGovernanceDefaults(valid, overrides);
  }

  /**
   * Creates a unified UI edit draft from an existing GovernedQuestion,
   * replacing 12+ individual React useState hooks.
   */
  public static createEditDraft(
    q: GovernedQuestion,
    defaultReason = 'Faculty errata refinement & clinical clarification'
  ): CanonicalQuestionEditDraft {
    return {
      concept: q.concept || '',
      stem: q.stem || '',
      explanation: q.explanation || '',
      examTip: q.examTip || '',
      mnemonic: q.mnemonic || '',
      difficulty: q.difficulty || 2,
      cognitiveLevel: q.cognitiveLevel || 'understanding',
      highYield: q.highYield !== false,
      subjectId: q.subjectId || 'anatomy',
      chapterId: q.chapterId || '',
      choices:
        q.choices && q.choices.length > 0
          ? q.choices.map((c) => ({
              id: c.id,
              text: c.text,
              isCorrect: c.isCorrect,
              rationale: c.rationale || '',
            }))
          : [
              { id: 'a', text: '', isCorrect: true, rationale: '' },
              { id: 'b', text: '', isCorrect: false, rationale: '' },
              { id: 'c', text: '', isCorrect: false, rationale: '' },
              { id: 'd', text: '', isCorrect: false, rationale: '' },
            ],
      changeReason: defaultReason,
    };
  }

  /**
   * Converts a CanonicalQuestionEditDraft into a validated QuestionMutationPatch.
   */
  public static draftToMutationPatch(draft: CanonicalQuestionEditDraft): QuestionMutationPatch {
    return {
      concept: draft.concept.trim(),
      stem: draft.stem.trim(),
      explanation: draft.explanation.trim(),
      examTip: draft.examTip.trim() || null,
      mnemonic: draft.mnemonic.trim() || null,
      difficulty: draft.difficulty,
      cognitiveLevel: draft.cognitiveLevel,
      highYield: draft.highYield,
      subjectId: draft.subjectId,
      chapterId: draft.chapterId,
      choices: draft.choices.map((c) => ({
        id: c.id as ChoiceId,
        text: c.text.trim(),
        isCorrect: c.isCorrect,
        rationale: c.rationale.trim(),
      })),
    };
  }
}
