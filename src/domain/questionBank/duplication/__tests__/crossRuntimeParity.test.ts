/**
 * Test: crossRuntimeParity.test.ts
 * Verifies that Canonicalizer and MinHasher produce identical, deterministic
 * outputs matching across synchronous and asynchronous execution paths.
 */

import { describe, it, expect } from 'vitest';
import { QuestionCanonicalizerV2 } from '../QuestionCanonicalizerV2.ts';
import { MinHasher } from '../MinHasher.ts';
import { ShingleExtractor } from '../shingles.ts';
import { Sha256Hasher } from '../sha256.ts';
import type { Question } from '../../../model/types.ts';

describe('QDD Cross-Runtime Parity & Determinism', () => {
  const canonicalizer = new QuestionCanonicalizerV2();
  const minHasher = new MinHasher();

  const sampleQuestion: Question = {
    id: 'parity-q1',
    blockId: 'cvs',
    subjectId: 'anatomy',
    chapterId: 'cvs-ana-heart',
    topicId: 'cvs-ana-chambers',
    concept: 'Atrial Septal Defect',
    type: 'single-best-answer',
    stem: 'Which embryological defect leads to a secundum atrial septal defect?',
    choices: [
      { id: 'a', text: 'Excessive resorption of septum primum', isCorrect: true, rationale: 'Correct etiology' },
      { id: 'b', text: 'Failure of septum secundum to form', isCorrect: false, rationale: 'Incorrect' },
      { id: 'c', text: 'Defect in endocardial cushions', isCorrect: false, rationale: 'Primum ASD' },
      { id: 'd', text: 'Persistent sinus venosus', isCorrect: false, rationale: 'Sinus venosus ASD' },
    ],
    explanation: 'Secundum ASD is most commonly caused by excessive resorption of septum primum.',
    examTip: null,
    mnemonic: null,
    difficulty: 2,
    cognitiveLevel: 'understanding',
    highYield: true,
    origin: 'authored-grounded',
    evidence: [
      {
        chunkId: 'chunk-asd',
        sourceName: 'Embryology',
        location: 'Slide 14',
        quote: 'Excessive resorption of septum primum leads to ostium secundum defect.',
        kind: 'text',
      },
    ],
    status: 'active',
    bankVersion: 1,
  };

  it('produces identical SHA-256 digests via WebCrypto and fallbackDigest', async () => {
    const text = 'which embryological defect leads to a secundum atrial septal defect?';
    const webCryptoDigest = await Sha256Hasher.digest(text);
    const fallbackDigest = Sha256Hasher.fallbackDigest(text);

    expect(webCryptoDigest).toBe(fallbackDigest);
    expect(webCryptoDigest).toHaveLength(64);
  });

  it('generates deterministic MinHash signatures and band keys', () => {
    const text = canonicalizer.normalizeText(sampleQuestion.stem);
    const shingles = ShingleExtractor.extractShingles(text);

    const sig1 = minHasher.signature(shingles);
    const sig2 = minHasher.signature(shingles);

    expect(sig1).toHaveLength(128);
    expect(sig2).toHaveLength(128);

    for (let i = 0; i < 128; i++) {
      expect(sig1[i]).toBe(sig2[i]);
    }

    const bands1 = minHasher.bandKeys(sig1);
    const bands2 = minHasher.bandKeys(sig2);

    expect(bands1).toHaveLength(32);
    expect(bands1).toEqual(bands2);
    expect(minHasher.estimateJaccard(sig1, sig2)).toBe(1.0);
  });

  it('canonicalizes question with stable, versioned schema', async () => {
    const canon = await canonicalizer.canonicalize(sampleQuestion);

    expect(canon.normalizerVersion).toBe('qdd-norm-v2');
    expect(canon.canonicalStem).toBe(
      'which embryological defect leads to a secundum atrial septal defect?'
    );
    expect(canon.canonicalChoices).toHaveLength(4);
    expect(canon.canonicalCorrectAnswer).toBe('excessive resorption of septum primum');
    expect(canon.stemHash).toHaveLength(64);
    expect(canon.itemHash).toHaveLength(64);
    expect(canon.answerKeyHash).toHaveLength(64);
    expect(canon.shingles.size).toBeGreaterThan(0);
  });
});
