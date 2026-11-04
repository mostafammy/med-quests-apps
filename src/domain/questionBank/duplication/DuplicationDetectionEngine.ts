/**
 * Domain Service: DuplicationDetectionEngine
 * Facade Pattern & Chain of Responsibility
 * Layer: Domain (Pure, Deterministic, 0 I/O)
 */

import { ok, err, type Result } from '../../shared/result.ts';
import { QuestionSchema, type Question } from '../../model/types.ts';
import type {
  DetectionContext,
  DuplicateCandidate,
  DuplicateRelation,
  DuplicationVerdict,
  IDetectionStage,
  IDuplicationDetectionEngine,
  IGatePolicy,
  IQuestionCanonicalizer,
  IQddTelemetrySink,
  MutableCandidate,
  QddError,
  QddExecutionTier,
  QddScope,
  QddThresholds,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import thresholdsJson from './config/thresholds.v1.json' with { type: 'json' };
import { MinHasher } from './MinHasher.ts';
import { ClinicalDiscriminatorExtractor } from './ClinicalDiscriminatorExtractor.ts';
import { isAnswerKeySemanticallyEqual } from './answerKeySemantics.ts';

const RELATION_SEVERITY: Record<DuplicateRelation, number> = {
  EXACT: 5,
  CONFLICT: 4,
  NEAR: 3,
  SIBLING: 2,
  UNIQUE: 1,
};

export class DuplicationDetectionEngine implements IDuplicationDetectionEngine {
  public readonly engineVersion = 'qdd-engine-v2';
  public readonly thresholds: QddThresholds = thresholdsJson as QddThresholds;
  private readonly canonicalizer: IQuestionCanonicalizer;
  private readonly stages: readonly IDetectionStage[];
  private readonly policy: IGatePolicy;
  private readonly telemetry?: IQddTelemetrySink;
  private readonly clock: () => number;

  constructor(
    canonicalizer: IQuestionCanonicalizer,
    stages: readonly IDetectionStage[],
    policy: IGatePolicy,
    telemetry?: IQddTelemetrySink,
    clock: () => number = () => performance.now()
  ) {
    this.canonicalizer = canonicalizer;
    this.stages = stages;
    this.policy = policy;
    this.telemetry = telemetry;
    this.clock = clock;
  }

  public async check(
    question: Question,
    scope: QddScope,
    tier: QddExecutionTier = 'edge-authoritative',
    signal?: AbortSignal
  ): Promise<Result<DuplicationVerdict, QddError>> {
    const parse = QuestionSchema.safeParse(question);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return err({
        code: 'INVALID_INPUT',
        message: issue ? issue.message : 'Invalid question payload',
        fieldPath: issue ? issue.path.join('.') : 'root',
      });
    }

    const startMs = this.clock();
    const canonical = await this.canonicalizer.canonicalize(parse.data);

    const context: DetectionContext = {
      subject: canonical,
      scope,
      tier,
      thresholds: this.thresholds,
      signal: signal || new AbortController().signal,
      candidates: new Map<string, MutableCandidate>(),
      stagesExecuted: [],
      degradedReasons: [],
      final: false,
    };

    // Execute Chain of Responsibility stages in order
    for (const stage of this.stages) {
      if (context.final || context.signal.aborted) break;

      context.stagesExecuted.push(stage.id);
      try {
        await stage.execute(context);
      } catch (stageErr: any) {
        context.degradedReasons.push('STAGE_TIMEOUT');
      }
    }

    const latencyMs = Math.round(this.clock() - startMs);
    const verdict = this.buildVerdict(context, latencyMs);

    this.telemetry?.onVerdict(verdict);
    return ok(verdict);
  }

  public async checkBatch(
    questions: readonly Question[],
    scope: QddScope,
    signal?: AbortSignal
  ): Promise<Result<readonly DuplicationVerdict[], QddError>> {
    if (questions.length === 0) {
      return ok([]);
    }

    // 1. Validate all questions
    for (const q of questions) {
      const parse = QuestionSchema.safeParse(q);
      if (!parse.success) {
        const issue = parse.error.issues[0];
        return err({
          code: 'INVALID_INPUT',
          message: issue ? issue.message : 'Invalid question payload',
          fieldPath: issue ? issue.path.join('.') : 'root',
        });
      }
    }

    // 2. Canonicalize all questions in parallel
    const canonicals = await Promise.all(
      questions.map((q) => this.canonicalizer.canonicalize(q))
    );

    // 3. Parallel bank checks for each question
    const bankResults = await Promise.all(
      questions.map((q) => this.check(q, scope, 'batch-audit', signal))
    );

    for (const res of bankResults) {
      if (!res.ok) return res;
    }

    const mutableVerdicts: DuplicationVerdict[] = bankResults.map(
      (r) => ({ ...(r as { ok: true; value: DuplicationVerdict }).value })
    );

    // 4. Pairwise in-batch MinHash & discriminator analysis
    const minhasher = new MinHasher();
    const signatures = canonicals.map((c) => minhasher.signature(c.shingles));

    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        if (signal?.aborted) break;

        const cA = canonicals[i];
        const cB = canonicals[j];
        const qA = questions[i];
        const qB = questions[j];

        let relation: DuplicateRelation | null = null;
        let decidedBy: any = 'S1_EXACT';
        let jaccard: number | null = null;
        let delta: readonly any[] = [];

        if (cA.itemHash === cB.itemHash) {
          relation = 'EXACT';
          decidedBy = 'S1_EXACT';
          jaccard = 1.0;
        } else if (cA.stemHash === cB.stemHash) {
          const isSameKey =
            cA.answerKeyHash === cB.answerKeyHash ||
            isAnswerKeySemanticallyEqual(cA.canonicalCorrectAnswer, cB.canonicalCorrectAnswer);
          if (isSameKey) {
            relation = 'EXACT';
            decidedBy = 'S1_EXACT';
            jaccard = 1.0;
          } else {
            relation = 'CONFLICT';
            decidedBy = 'S4_DISCRIMINATORS';
            jaccard = 1.0;
          }
        } else {
          jaccard = MinHasher.estimateJaccard(signatures[i], signatures[j]);
          if (jaccard >= this.thresholds.lexicalCandidateMin) {
            delta = ClinicalDiscriminatorExtractor.computeDelta(
              cA.discriminators,
              cB.discriminators
            );
            const isDiffKey =
              cA.answerKeyHash !== cB.answerKeyHash &&
              !isAnswerKeySemanticallyEqual(cA.canonicalCorrectAnswer, cB.canonicalCorrectAnswer);

            if (delta.length > 0) {
              relation = 'SIBLING';
              decidedBy = 'S4_DISCRIMINATORS';
            } else if (isDiffKey && jaccard >= 0.5) {
              relation = 'CONFLICT';
              decidedBy = 'S4_DISCRIMINATORS';
            } else if (jaccard >= this.thresholds.nearAutoMin) {
              relation = 'NEAR';
              decidedBy = 'S4_DISCRIMINATORS';
            } else if (jaccard >= 0.5) {
              relation = 'NEAR';
              decidedBy = 'S4_DISCRIMINATORS';
            }
          }
        }

        if (relation) {
          // If CONFLICT, both i and j must be flagged for review
          if (relation === 'CONFLICT') {
            const candForA: DuplicateCandidate = {
              matchedQuestionId: qB.id,
              matchedStemPreview: qB.stem.slice(0, 100),
              relation: 'CONFLICT',
              decidedBy,
              signals: {
                lexicalJaccard: jaccard,
                semanticCosine: null,
                rerankScore: null,
                sameAnswerKey: false,
                discriminatorDelta: delta,
                fusedScore: jaccard ?? 1.0,
              },
              llm: null,
              explanationKey: 'qdd.explanation.conflict',
              explanationParams: { matchedId: qB.id, batchIndex: j + 1 },
            };

            const existingCandsA = [...mutableVerdicts[i].candidates, candForA];
            const highestRelA =
              RELATION_SEVERITY['CONFLICT'] >
              RELATION_SEVERITY[mutableVerdicts[i].relation]
                ? 'CONFLICT'
                : mutableVerdicts[i].relation;

            mutableVerdicts[i] = {
              ...mutableVerdicts[i],
              relation: highestRelA,
              decision: this.policy.decide(
                highestRelA,
                'batch-audit',
                mutableVerdicts[i].degraded,
                null
              ),
              candidates: existingCandsA
                .sort(
                  (a, b) =>
                    RELATION_SEVERITY[b.relation] -
                    RELATION_SEVERITY[a.relation]
                )
                .slice(0, 5),
            };
          }

          // Candidate for j (pointing to earlier item i)
          const candForB: DuplicateCandidate = {
            matchedQuestionId: qA.id,
            matchedStemPreview: qA.stem.slice(0, 100),
            relation,
            decidedBy,
            signals: {
              lexicalJaccard: jaccard,
              semanticCosine: null,
              rerankScore: null,
              sameAnswerKey: cA.answerKeyHash === cB.answerKeyHash,
              discriminatorDelta: delta,
              fusedScore: relation === 'EXACT' ? 1.0 : (jaccard ?? 0.85),
            },
            llm: null,
            explanationKey: `qdd.explanation.${relation.toLowerCase()}`,
            explanationParams: { matchedId: qA.id, batchIndex: i + 1 },
          };

          const existingCandsB = [...mutableVerdicts[j].candidates, candForB];
          const highestRelB =
            RELATION_SEVERITY[relation] >
            RELATION_SEVERITY[mutableVerdicts[j].relation]
              ? relation
              : mutableVerdicts[j].relation;

          mutableVerdicts[j] = {
            ...mutableVerdicts[j],
            relation: highestRelB,
            decision: this.policy.decide(
              highestRelB,
              'batch-audit',
              mutableVerdicts[j].degraded,
              null
            ),
            candidates: existingCandsB
              .sort(
                (a, b) =>
                  RELATION_SEVERITY[b.relation] -
                  RELATION_SEVERITY[a.relation]
              )
              .slice(0, 5),
          };
        }
      }
    }

    return ok(mutableVerdicts);
  }

  private buildVerdict(context: DetectionContext, latencyMs: number): DuplicationVerdict {
    const candidatesList: DuplicateCandidate[] = [];
    let highestRelation: DuplicateRelation = 'UNIQUE';

    for (const [candId, mutable] of context.candidates.entries()) {
      const rel = mutable.relation || 'NEAR';
      if (RELATION_SEVERITY[rel] > RELATION_SEVERITY[highestRelation]) {
        highestRelation = rel;
      }

      const sameKey =
        context.subject.answerKeyHash === mutable.fingerprint.answerKeyHash ||
        (mutable.fingerprint.canonicalCorrectAnswer && context.subject.canonicalCorrectAnswer
          ? isAnswerKeySemanticallyEqual(
              context.subject.canonicalCorrectAnswer,
              mutable.fingerprint.canonicalCorrectAnswer
            )
          : false);

      candidatesList.push({
        matchedQuestionId: candId,
        matchedStemPreview: mutable.fingerprint.stemHash.slice(0, 16) + '...',
        relation: rel,
        decidedBy: mutable.decidedBy || 'S4_DISCRIMINATORS',
        signals: {
          lexicalJaccard: mutable.lexicalJaccard,
          semanticCosine: mutable.semanticCosine,
          rerankScore: mutable.rerankScore,
          sameAnswerKey: sameKey,
          discriminatorDelta: mutable.fingerprint.discriminators,
          fusedScore: mutable.lexicalJaccard ?? 0.5,
        },
        llm: mutable.llm,
        explanationKey: `qdd.explanation.${rel.toLowerCase()}`,
        explanationParams: { matchedId: candId },
      });
    }

    // Sort candidates by relation severity, then score desc
    candidatesList.sort((a, b) => {
      const diff = RELATION_SEVERITY[b.relation] - RELATION_SEVERITY[a.relation];
      if (diff !== 0) return diff;
      return (b.signals.fusedScore ?? 0) - (a.signals.fusedScore ?? 0);
    });

    const isDegraded = context.degradedReasons.length > 0;
    const gateDecision = this.policy.decide(
      highestRelation,
      context.tier,
      isDegraded,
      candidatesList[0]?.llm?.confidence ?? null
    );

    return {
      questionId: context.subject.questionId,
      tier: context.tier,
      decision: gateDecision,
      relation: highestRelation,
      candidates: candidatesList.slice(0, 5),
      stagesExecuted: context.stagesExecuted,
      degraded: isDegraded,
      degradedReasons: context.degradedReasons,
      latencyMs,
      engineVersion: this.engineVersion,
      thresholdsVersion: context.thresholds.version,
    };
  }
}
