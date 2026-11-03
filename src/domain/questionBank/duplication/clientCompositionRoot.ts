/**
 * Client Composition Root: QDD Engine
 * Assembles the prebuilt DuplicationDetectionEngine for browser, client, and UI agent execution.
 * Layer: Domain / QuestionBank / Duplication
 */

import { QuestionCanonicalizerV2 } from './QuestionCanonicalizerV2.ts';
import { MinHasher } from './MinHasher.ts';
import { S1ExactStage } from './stages/S1Exact.ts';
import { S2LexicalLshStage } from './stages/S2LexicalLsh.ts';
import { S4DiscriminatorsStage } from './stages/S4Discriminators.ts';
import { EdgeGatePolicy } from './GatePolicy.ts';
import { DuplicationDetectionEngine } from './DuplicationDetectionEngine.ts';
import { InMemoryFingerprintRepository } from '../../../infrastructure/questionBank/duplication/memory/InMemoryFingerprintRepository.ts';
import type { Question } from '../../model/types.ts';
import type { IDuplicationDetectionEngine } from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

/**
 * Creates and initializes an in-memory instance of the prebuilt DuplicationDetectionEngine
 * populated with canonical bank questions for fast, non-blocking duplicate audits.
 */
export async function createClientQddEngine(
  bankQuestions: readonly Question[] = []
): Promise<IDuplicationDetectionEngine> {
  const repo = new InMemoryFingerprintRepository();
  const canonicalizer = new QuestionCanonicalizerV2();
  const minHasher = new MinHasher();

  if (bankQuestions.length > 0) {
    const canonicals = await Promise.all(bankQuestions.map((q) => canonicalizer.canonicalize(q)));
    for (let i = 0; i < bankQuestions.length; i++) {
      const q = bankQuestions[i];
      const c = canonicals[i];
      const sig = minHasher.signature(c.shingles);
      const bandKeys = minHasher.bandKeys(sig);

      await repo.upsert({
        questionId: q.id,
        blockId: q.blockId || 'cvs',
        chapterId: q.chapterId,
        normalizerVersion: c.normalizerVersion,
        stemHash: c.stemHash,
        itemHash: c.itemHash,
        answerKeyHash: c.answerKeyHash,
        minhash: sig,
        lshBands: bandKeys,
        discriminators: c.discriminators,
        embeddingModel: null,
        embeddedAt: null,
        contentVersion: 1,
      });
    }
  }

  const stages = [
    new S1ExactStage(repo),
    new S2LexicalLshStage(repo, minHasher),
    new S4DiscriminatorsStage(),
  ];

  const policy = new EdgeGatePolicy();

  return new DuplicationDetectionEngine(canonicalizer, stages, policy);
}
