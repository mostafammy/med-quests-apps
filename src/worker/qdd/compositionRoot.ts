/**
 * Worker Composition Root: QDD Engine
 * Assembles production dependencies for Cloudflare Worker edge execution.
 */

import { QuestionCanonicalizerV2 } from '../../domain/questionBank/duplication/QuestionCanonicalizerV2.ts';
import { MinHasher } from '../../domain/questionBank/duplication/MinHasher.ts';
import { S1ExactStage } from '../../domain/questionBank/duplication/stages/S1Exact.ts';
import { S2LexicalLshStage } from '../../domain/questionBank/duplication/stages/S2LexicalLsh.ts';
import { S4DiscriminatorsStage } from '../../domain/questionBank/duplication/stages/S4Discriminators.ts';
import { EdgeGatePolicy } from '../../domain/questionBank/duplication/GatePolicy.ts';
import { DuplicationDetectionEngine } from '../../domain/questionBank/duplication/DuplicationDetectionEngine.ts';
import { D1FingerprintRepository } from '../../infrastructure/questionBank/duplication/d1/D1FingerprintRepository.ts';
import type { IDuplicationDetectionEngine } from '../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export function createWorkerQddEngine(db: any): IDuplicationDetectionEngine {
  const repo = new D1FingerprintRepository(db);
  const canonicalizer = new QuestionCanonicalizerV2();
  const minHasher = new MinHasher();

  const stages = [
    new S1ExactStage(repo),
    new S2LexicalLshStage(repo, minHasher),
    new S4DiscriminatorsStage(),
  ];

  const policy = new EdgeGatePolicy();

  return new DuplicationDetectionEngine(canonicalizer, stages, policy);
}
