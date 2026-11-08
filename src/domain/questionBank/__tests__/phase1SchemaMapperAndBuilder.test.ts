import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  PATCHABLE_QUESTION_FIELDS,
  QuestionObjectSchema,
  QuestionSchema,
} from '../../model/types.ts';
import { QuestionBuilder } from '../QuestionBuilder.ts';
import { QuestionNormalizer, normalizeBlockId } from '../QuestionNormalizer.ts';
import { QuestionD1Mapper } from '../../../infrastructure/questionBank/QuestionD1Mapper.ts';

describe('Phase 1 Refactoring: Unified Question Schema, Normalizer, Builder & D1 Mapper', () => {
  describe('Single Source of Truth: PATCHABLE_QUESTION_FIELDS', () => {
    it('automatically derives all editable fields from QuestionObjectSchema excluding identity keys', () => {
      const allKeys = Object.keys(QuestionObjectSchema.shape);
      const immutableKeys = ['id', 'blockId', 'status', 'bankVersion'];

      for (const key of allKeys) {
        if (immutableKeys.includes(key)) {
          expect(PATCHABLE_QUESTION_FIELDS).not.toContain(key);
        } else {
          expect(PATCHABLE_QUESTION_FIELDS).toContain(key);
        }
      }
    });

    it('sanitizes mutation patches by stripping immutable and unknown keys', () => {
      const sanitized = QuestionNormalizer.sanitizeMutationPatch({
        id: 'hacked-id',
        blockId: 'hacked-block',
        bankVersion: 999,
        concept: 'Updated Concept',
        cognitiveLevel: 'application',
        unknownField: 'should-be-dropped',
      });

      expect(sanitized).toEqual({
        concept: 'Updated Concept',
        cognitiveLevel: 'application',
      });
    });
  });

  describe('Builder Pattern: QuestionBuilder', () => {
    it('builds a schema-valid Question with default values and fluent overrides', () => {
      const question = QuestionBuilder.aQuestion()
        .withId('q-test-builder-1')
        .withBlockId('cns')
        .withDifficulty(3)
        .withCognitiveLevel('application')
        .withCorrectChoice('c')
        .build();

      expect(QuestionSchema.safeParse(question).success).toBe(true);
      expect(question.id).toBe('q-test-builder-1');
      expect(question.blockId).toBe('cns');
      expect(question.difficulty).toBe(3);
      expect(question.cognitiveLevel).toBe('application');
      expect(question.choices.find((c) => c.isCorrect)?.id).toBe('c');
    });

    it('builds a GovernedQuestion with canonical provenance metadata', () => {
      const governed = QuestionBuilder.aQuestion()
        .withId('q-gov-1')
        .buildGoverned({
          provenanceScope: 'global-canonical',
          globalRevision: 7,
        });

      expect(governed.provenanceScope).toBe('global-canonical');
      expect(governed.editorialStatus).toBe('published');
      expect(governed.globalRevision).toBe(7);
      expect(governed.stemHash).toHaveLength(64);
    });

    it('round-trips a GovernedQuestion through CanonicalQuestionEditDraft and back to QuestionMutationPatch', () => {
      const governed = QuestionBuilder.aQuestion()
        .withConcept('Initial Concept')
        .withExamTip('Initial Tip')
        .buildGoverned();

      const draft = QuestionBuilder.createEditDraft(governed, 'Board errata review');
      expect(draft.concept).toBe('Initial Concept');
      expect(draft.examTip).toBe('Initial Tip');
      expect(draft.changeReason).toBe('Board errata review');

      const patch = QuestionBuilder.draftToMutationPatch({
        ...draft,
        concept: '  Refined Concept  ',
        examTip: '   ',
      });

      expect(patch.concept).toBe('Refined Concept');
      expect(patch.examTip).toBeNull();
    });
  });

  describe('QuestionNormalizer', () => {
    it('repairs loosely-shaped raw objects into strict QuestionSchema compliance', () => {
      const repaired = QuestionNormalizer.repairToQuestionSchema(
        {
          stem: 'Short',
          choices: [
            { id: 'a', text: 'First choice', isCorrect: true },
            { id: 'b', text: 'Second choice', isCorrect: true }, // multiple marked true
          ],
          difficulty: 99,
          cognitiveLevel: 'INVALID_LEVEL',
        },
        'cns'
      );

      const parsed = QuestionSchema.safeParse(repaired);
      expect(parsed.success).toBe(true);
      expect(repaired.blockId).toBe('cns');
      expect(repaired.difficulty).toBe(2);
      expect(repaired.cognitiveLevel).toBe('understanding');
      expect(repaired.choices.filter((c) => c.isCorrect)).toHaveLength(1);
      expect(repaired.evidence.length).toBeGreaterThanOrEqual(1);
    });

    it('normalizes block identifiers consistently', () => {
      expect(normalizeBlockId('CNS-Neuroscience')).toBe('cns');
      expect(normalizeBlockId('Cardiovascular System')).toBe('cvs');
      expect(normalizeBlockId(null, 'cns')).toBe('cns');
    });
  });

  describe('Declarative D1 Data Mapper: QuestionD1Mapper', () => {
    it('executes upsert, canonical update, and domain hydration against real SQLite migration 0003', () => {
      const sqlite = new DatabaseSync(':memory:');
      const mig0003Path = path.resolve(
        process.cwd(),
        'src/worker/migrations/0003_global_questions_bank.sql'
      );
      sqlite.exec(fs.readFileSync(mig0003Path, 'utf8'));

      const initialGoverned = QuestionBuilder.aQuestion()
        .withId('q-d1-mapper-test')
        .withConcept('Original Concept')
        .withDifficulty(1)
        .buildGoverned({
          provenanceScope: 'global-canonical',
          globalRevision: 2,
        });

      // 1. Direct create upsert
      const insertStmt = QuestionD1Mapper.buildUpsertStatement(
        initialGoverned,
        'direct_create'
      );
      sqlite.prepare(insertStmt.sql).run(...(insertStmt.params as any[]));

      const rawRow = sqlite
        .prepare('SELECT * FROM global_questions WHERE id = ?')
        .get('q-d1-mapper-test') as any;
      expect(rawRow).toBeDefined();

      const hydrated = QuestionD1Mapper.toDomain(rawRow);
      expect(hydrated.id).toBe('q-d1-mapper-test');
      expect(hydrated.concept).toBe('Original Concept');
      expect(hydrated.difficulty).toBe(1);
      expect(hydrated.globalRevision).toBe(2);

      // 2. Canonical curator in-place update
      const updatedGoverned = {
        ...hydrated,
        concept: 'Curator Refined Concept',
        difficulty: 3 as const,
        cognitiveLevel: 'application' as const,
        bankVersion: hydrated.bankVersion + 1,
        globalRevision: 3,
      };
      const updateStmt = QuestionD1Mapper.buildCanonicalUpdateStatement(updatedGoverned);
      sqlite.prepare(updateStmt.sql).run(...(updateStmt.params as any[]));

      const updatedRow = sqlite
        .prepare('SELECT * FROM global_questions WHERE id = ?')
        .get('q-d1-mapper-test') as any;
      const rehydrated = QuestionD1Mapper.toDomain(updatedRow);
      expect(rehydrated.concept).toBe('Curator Refined Concept');
      expect(rehydrated.difficulty).toBe(3);
      expect(rehydrated.cognitiveLevel).toBe('application');
      expect(rehydrated.bankVersion).toBe(2);
      expect(rehydrated.globalRevision).toBe(3);
    });
  });
});
