/**
 * Invariant & Property Tests: QDD Mathematical Guarantees
 * Using fast-check to mathematically prove core domain invariants.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { QuestionCanonicalizerV2 } from '../QuestionCanonicalizerV2.ts';
import { ClinicalDiscriminatorExtractor } from '../ClinicalDiscriminatorExtractor.ts';
import { Sha256Hasher } from '../sha256.ts';
import type { Question, Choice } from '../../../model/types.ts';

describe('QDD Engine Core Invariants (fast-check property verification)', () => {
  const canonicalizer = new QuestionCanonicalizerV2();
  const extractor = new ClinicalDiscriminatorExtractor();

  // Helper to create a valid Question object from generated parameters
  function buildQuestion(
    id: string,
    stem: string,
    choicesTexts: [string, string, string, string],
    correctIdx: number
  ): Question {
    const choices: Choice[] = choicesTexts.map((text, i) => ({
      id: ['a', 'b', 'c', 'd'][i] as 'a' | 'b' | 'c' | 'd',
      text,
      isCorrect: i === correctIdx,
      rationale: `Rationale for ${text}`,
    }));

    return {
      id,
      blockId: 'cvs',
      subjectId: 'anatomy',
      chapterId: 'cvs-ana-heart',
      topicId: 'cvs-ana-valves',
      concept: 'Valve Anatomy',
      type: 'single-best-answer',
      stem,
      choices,
      explanation: 'Detailed explanation text for the question.',
      examTip: null,
      mnemonic: null,
      difficulty: 2,
      cognitiveLevel: 'understanding',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [
        {
          chunkId: 'chunk-1',
          sourceName: 'Gross Anatomy',
          location: 'Page 42',
          quote: 'Verbatim evidence supporting the valve anatomy.',
          kind: 'text',
        },
      ],
      status: 'active',
      bankVersion: 1,
    };
  }

  // -------------------------------------------------------------------------
  // Invariant A: Choice Permutation Invariance
  // Shuffling multiple choice order (A-D) MUST yield an IDENTICAL CanonicalItemHash.
  // -------------------------------------------------------------------------
  it('Property A: Choice permutations yield strictly identical CanonicalItemHash', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 80 }),
        fc.tuple(
          fc.string({ minLength: 2, maxLength: 30 }),
          fc.string({ minLength: 2, maxLength: 30 }),
          fc.string({ minLength: 2, maxLength: 30 }),
          fc.string({ minLength: 2, maxLength: 30 })
        ),
        fc.integer({ min: 0, max: 3 }),
        async (stem, choiceTexts, correctIndex) => {
          const qOriginal = buildQuestion('q-orig', stem, choiceTexts, correctIndex);

          // Permute choices: e.g. [3, 0, 2, 1]
          const permutation = [3, 0, 2, 1];
          const permutedTexts: [string, string, string, string] = [
            choiceTexts[permutation[0]],
            choiceTexts[permutation[1]],
            choiceTexts[permutation[2]],
            choiceTexts[permutation[3]],
          ];
          const newCorrectIndex = permutation.indexOf(correctIndex);
          const qPermuted = buildQuestion('q-perm', stem, permutedTexts, newCorrectIndex);

          const canonOriginal = await canonicalizer.canonicalize(qOriginal);
          const canonPermuted = await canonicalizer.canonicalize(qPermuted);

          expect(canonOriginal.itemHash).toBe(canonPermuted.itemHash);
          expect(canonOriginal.stemHash).toBe(canonPermuted.stemHash);
          expect(canonOriginal.answerKeyHash).toBe(canonPermuted.answerKeyHash);
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Invariant B: Negative Qualifier Sensitivity
  // Injecting negation (not, except) MUST trigger a clinical discriminator delta.
  // -------------------------------------------------------------------------
  it('Property B: Injecting negative qualifiers triggers a non-empty discriminator delta', async () => {
    const negators = ['not', 'except', 'never', 'least likely', 'incorrect'];

    await fc.assert(
      fc.property(
        fc.string({ minLength: 15, maxLength: 80 }).filter((s) => !/\b(not|except|never|least|incorrect)\b/i.test(s)),
        fc.constantFrom(...negators),
        (baseStem, negator) => {
          const positiveStem = canonicalizer.normalizeText(`Which factor is associated with ${baseStem}?`);
          const negatedStem = canonicalizer.normalizeText(`Which factor is ${negator} associated with ${baseStem}?`);

          const discsPos = extractor.extract(positiveStem);
          const discsNeg = extractor.extract(negatedStem);

          const delta = ClinicalDiscriminatorExtractor.computeDelta(discsPos, discsNeg);
          expect(delta.length).toBeGreaterThan(0);
          expect(delta.some((d) => d.kind === 'NEGATION')).toBe(true);
        }
      ),
      { numRuns: 40 }
    );
  });

  // -------------------------------------------------------------------------
  // Invariant C: Symmetric PairKey
  // pairKey(A, B) MUST EQUAL pairKey(B, A).
  // -------------------------------------------------------------------------
  it('Property C: PairKey calculation is order-symmetric across any ID inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        async (idA, idB, verA, verB) => {
          const keyAB = await Sha256Hasher.computePairKey(idA, idB, verA, verB);
          const keyBA = await Sha256Hasher.computePairKey(idB, idA, verB, verA);

          expect(keyAB).toBe(keyBA);
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Invariant D: Exact Hash Determinism across Spacing & Formatting Noise
  // Whitespace & quote differences MUST NOT alter stemHash.
  // -------------------------------------------------------------------------
  it('Property D: Formatting noise does not alter canonical stemHash', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9\s]{10,60}$/).map((s) => s.trim()).filter((s) => s.length >= 8),
        async (cleanText) => {
          const stem1 = cleanText.toLowerCase();
          const stem2 = `   ${stem1}   `.replace(/\s+/g, '    ');
          const stem3 = `"${stem1}"`.replace(/"/g, '“');

          const canon1 = canonicalizer.normalizeText(stem1);
          const canon2 = canonicalizer.normalizeText(stem2);
          const canon3 = canonicalizer.normalizeText(stem3);

          const hash1 = await Sha256Hasher.computeStemHash(canon1);
          const hash2 = await Sha256Hasher.computeStemHash(canon2);
          const hash3 = await Sha256Hasher.computeStemHash(canon3);

          expect(hash1).toBe(hash2);
          expect(hash1).toBe(hash3);
          expect(canon1).toBe(canon2);
          expect(canon1).toBe(canon3);
        }
      ),
      { numRuns: 50 }
    );
  });
});
