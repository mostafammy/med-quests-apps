/**
 * Stage 2: Lexical MinHash LSH Blocking
 * Queries inverted 32-band LSH indexes to cluster near-neighbor candidates.
 */

import type {
  DetectionContext,
  IDetectionStage,
  IFingerprintRepository,
  IMinHasher,
  QddStageId,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class S2LexicalLshStage implements IDetectionStage {
  public readonly id: QddStageId = 'S2_LEXICAL_LSH';
  public readonly timeoutMs = 400;
  private readonly repo: IFingerprintRepository;
  private readonly minHasher: IMinHasher;

  constructor(repo: IFingerprintRepository, minHasher: IMinHasher) {
    this.repo = repo;
    this.minHasher = minHasher;
  }

  public async execute(context: DetectionContext): Promise<void> {
    if (context.final) return;

    const { subject, scope, thresholds } = context;

    // 1. Generate subject 128-element MinHash signature and 32 band keys
    const subjectSig = this.minHasher.signature(subject.shingles);
    const bandKeys = this.minHasher.bandKeys(subjectSig);

    // 2. Query candidates sharing at least one LSH bucket
    const lshCandidates = await this.repo.findByLshBands(scope, bandKeys, 25);

    for (const cand of lshCandidates) {
      if (cand.questionId === subject.questionId) continue;

      const jaccard = this.minHasher.estimateJaccard(subjectSig, cand.minhash);

      const existing = context.candidates.get(cand.questionId);
      if (existing) {
        existing.lexicalJaccard = jaccard;
      } else if (jaccard >= thresholds.lexicalCandidateMin) {
        context.candidates.set(cand.questionId, {
          fingerprint: cand,
          canonical: null,
          lexicalJaccard: jaccard,
          semanticCosine: null,
          rerankScore: null,
          relation: null,
          decidedBy: null,
          llm: null,
        });
      }
    }
  }
}
