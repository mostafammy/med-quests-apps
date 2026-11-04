/**
 * SPEC-009 — Question Duplication Detection Engine (QDD)
 * Contracts: Domain types & ports (Clean Architecture, Dependency Inversion)
 *
 * Rules (Constitution P6/P7):
 *  - Zero runtime dependencies. Pure types + interfaces only.
 *  - No `any`, no non-null assertions, no `@ts-ignore`.
 *  - Domain code depends on these ports; infrastructure implements them
 *    (Browser/IndexedDB, Cloudflare D1, Vectorize, Workers AI, Groq, Gemini, in-memory fakes).
 */

import type { Result } from '../../../src/domain/shared/result.ts';
import type { Question } from '../../../src/domain/model/types.ts';

// ============================================================================
// 1. Branded primitives
// ============================================================================

declare const __qddBrand: unique symbol;
export type QddBrand<T, B extends string> = T & { readonly [__qddBrand]: B };

/** SHA-256 hex of the canonical stem only (v2 normalizer). */
export type CanonicalStemHash = QddBrand<string, 'CanonicalStemHash'>;
/** SHA-256 hex of canonical stem + order-invariant choice set + correct-answer text. */
export type CanonicalItemHash = QddBrand<string, 'CanonicalItemHash'>;
/** SHA-256 hex of the normalized correct-answer text (answer-key fingerprint). */
export type AnswerKeyHash = QddBrand<string, 'AnswerKeyHash'>;
/** Order-independent hash of a question pair: sha256(min(idA,idB) + '|' + max(idA,idB) + '|' + versions). */
export type PairKey = QddBrand<string, 'PairKey'>;
export type DuplicateClusterId = QddBrand<string, 'DuplicateClusterId'>;
export type AuditJobId = QddBrand<string, 'AuditJobId'>;

/** Semantic version of the normalizer; bump invalidates all fingerprints (forces backfill). */
export type NormalizerVersion = 'qdd-norm-v2';
/** Pinned embedding model id — the Vectorize index name embeds this so models never mix. */
export type EmbeddingModelId =
  | '@cf/baai/bge-small-en-v1.5'
  | '@cf/baai/bge-base-en-v1.5'
  | '@cf/baai/bge-m3'
  | 'local-hashing-v1';

// ============================================================================
// 2. Verdict taxonomy (the product language of the engine)
// ============================================================================

/**
 * EXACT        — Canonically identical item (whitespace/case/quotes/choice order differences only).
 * NEAR         — Paraphrase that tests the same fact with the same correct answer.
 * CONFLICT     — Same (or near-same) question but a DIFFERENT correct answer. Medical-accuracy alarm (P2).
 * SIBLING      — Same concept/topic, high overlap, but a deterministic clinical discriminator differs
 *                (negation, laterality, numeric value, age/sex, "EXCEPT"). Legitimate variant. Informational.
 * UNIQUE       — Nothing relevant found.
 */
export type DuplicateRelation = 'EXACT' | 'NEAR' | 'CONFLICT' | 'SIBLING' | 'UNIQUE';

/** Policy outcome derived from the relation + context (never decided by an LLM alone). */
export type GateDecision =
  | 'BLOCK' // EXACT against a published item — cannot be submitted/published as new.
  | 'REVIEW' // NEAR / CONFLICT / low-confidence — routed to a human with evidence.
  | 'INFORM' // SIBLING — shown as a hint; never blocks.
  | 'ALLOW'; // UNIQUE.

/** Which pipeline stage produced the final verdict (for explainability & telemetry). */
export type QddStageId =
  | 'S0_CANONICALIZE'
  | 'S1_EXACT'
  | 'S2_LEXICAL_LSH'
  | 'S3_SEMANTIC_ANN'
  | 'S4_DISCRIMINATORS'
  | 'S5_RERANK'
  | 'S6_LLM_ARBITER';

/** Where the check runs. Browser = advisory only. Edge = authoritative. */
export type QddExecutionTier = 'browser-advisory' | 'edge-authoritative' | 'batch-audit';

/** Scope of the comparison corpus. */
export type QddScope =
  | { readonly kind: 'block'; readonly blockId: string }
  | { readonly kind: 'chapter'; readonly blockId: string; readonly chapterId: string }
  | { readonly kind: 'batch-only' };

// ============================================================================
// 3. Canonical representation (Stage 0 output)
// ============================================================================

export type ClinicalDiscriminatorKind =
  | 'NEGATION' // not, except, least likely, false, incorrect
  | 'LATERALITY' // left/right, ipsilateral/contralateral
  | 'NUMERIC' // numbers + units (mmHg, mg, %, weeks, years)
  | 'DEMOGRAPHIC' // age, sex, pregnancy
  | 'SUPERLATIVE' // most common, first-line, most likely, best initial
  | 'TEMPORAL'; // acute/chronic, onset, week-of-gestation

export interface ClinicalDiscriminator {
  readonly kind: ClinicalDiscriminatorKind;
  /** Normalized value, e.g. 'NEGATION:except', 'LATERALITY:left', 'NUMERIC:120|mmhg'. */
  readonly token: string;
}

export interface CanonicalQuestion {
  readonly questionId: string;
  readonly blockId: string;
  readonly chapterId: string;
  readonly topicId: string;
  readonly normalizerVersion: NormalizerVersion;
  /** Canonical stem text (lowercased, unicode-NFKC, whitespace/quotes/punctuation normalized). */
  readonly canonicalStem: string;
  /** Choice texts, canonicalized and sorted (order-invariant). */
  readonly canonicalChoices: readonly string[];
  readonly canonicalCorrectAnswer: string;
  /** Text sent to the embedding model: stem + ' || ' + correct answer. */
  readonly embeddingText: string;
  readonly stemHash: CanonicalStemHash;
  readonly itemHash: CanonicalItemHash;
  readonly answerKeyHash: AnswerKeyHash;
  readonly discriminators: readonly ClinicalDiscriminator[];
  /** Word 3-shingles hashed to uint32 (input to MinHash). */
  readonly shingles: ReadonlySet<number>;
}

// ============================================================================
// 4. Fingerprints (persisted per question)
// ============================================================================

export const MINHASH_PERMUTATIONS = 128 as const;
export const LSH_BANDS = 32 as const;
export const LSH_ROWS_PER_BAND = 4 as const; // 32 x 4 = 128; S-curve midpoint ≈ (1/32)^(1/4) ≈ 0.42

export interface QuestionFingerprint {
  readonly questionId: string;
  readonly blockId: string;
  readonly chapterId: string;
  readonly normalizerVersion: NormalizerVersion;
  readonly stemHash: CanonicalStemHash;
  readonly itemHash: CanonicalItemHash;
  readonly answerKeyHash: AnswerKeyHash;
  /** Optional canonical answer key text for semantic answer-key parity checks. */
  readonly canonicalCorrectAnswer?: string;
  /** 128 x uint32 MinHash signature. */
  readonly minhash: Uint32Array;
  /** 32 band keys derived from the signature (hex). */
  readonly lshBands: readonly string[];
  readonly discriminators: readonly ClinicalDiscriminator[];
  readonly embeddingModel: EmbeddingModelId | null;
  readonly embeddedAt: string | null;
  readonly contentVersion: number;
}

// ============================================================================
// 5. Evidence & verdicts (explainability is a hard requirement)
// ============================================================================

export interface SimilaritySignals {
  /** Estimated Jaccard similarity from MinHash (0..1). */
  readonly lexicalJaccard: number | null;
  /** Cosine similarity from the embedding index (0..1). */
  readonly semanticCosine: number | null;
  /** Cross-encoder relevance (0..1), calibrated. */
  readonly rerankScore: number | null;
  /** True when both items share the same normalized correct answer. */
  readonly sameAnswerKey: boolean;
  /** Discriminators present in one item but not the other. */
  readonly discriminatorDelta: readonly ClinicalDiscriminator[];
  /** Fused calibrated probability that the pair is a NEAR/EXACT duplicate (0..1). */
  readonly fusedScore: number;
}

export interface LlmArbiterVerdict {
  readonly relation: Exclude<DuplicateRelation, 'UNIQUE'> | 'UNIQUE';
  readonly confidence: number;
  /** The single most important differentiating or unifying clinical fact, ≤ 240 chars. */
  readonly rationale: string;
  readonly modelId: string;
  readonly promptVersion: string;
}

export interface DuplicateCandidate {
  readonly matchedQuestionId: string;
  readonly matchedStemPreview: string;
  readonly relation: DuplicateRelation;
  readonly decidedBy: QddStageId;
  readonly signals: SimilaritySignals;
  readonly llm: LlmArbiterVerdict | null;
  /** Human-readable, localized-key explanation (rendered by UI via i18n dictionary). */
  readonly explanationKey: string;
  readonly explanationParams: Readonly<Record<string, string | number>>;
}

export interface DuplicationVerdict {
  readonly questionId: string;
  readonly tier: QddExecutionTier;
  readonly decision: GateDecision;
  /** Strongest relation across all candidates (EXACT > CONFLICT > NEAR > SIBLING > UNIQUE). */
  readonly relation: DuplicateRelation;
  /** Sorted by severity, then fusedScore desc. Max 5. */
  readonly candidates: readonly DuplicateCandidate[];
  readonly stagesExecuted: readonly QddStageId[];
  /** True if any stage degraded (timeout/quota/circuit-open) — verdict is then conservative (REVIEW, never BLOCK). */
  readonly degraded: boolean;
  readonly degradedReasons: readonly QddDegradationReason[];
  readonly latencyMs: number;
  readonly engineVersion: string;
  readonly thresholdsVersion: string;
}

export type QddDegradationReason =
  | 'EMBEDDING_UNAVAILABLE'
  | 'VECTOR_INDEX_UNAVAILABLE'
  | 'RERANKER_UNAVAILABLE'
  | 'LLM_UNAVAILABLE'
  | 'DAILY_AI_BUDGET_EXHAUSTED'
  | 'STAGE_TIMEOUT'
  | 'FINGERPRINT_STALE';

export type QddError =
  | { readonly code: 'INVALID_INPUT'; readonly message: string; readonly fieldPath: string }
  | { readonly code: 'SCOPE_NOT_FOUND'; readonly message: string }
  | { readonly code: 'STORAGE_FAILURE'; readonly message: string }
  | { readonly code: 'UNAUTHORIZED'; readonly message: string };

// ============================================================================
// 6. Thresholds (versioned config — calibrated against the golden set, never hard-coded in stages)
// ============================================================================

export interface QddThresholds {
  readonly version: string;
  /** Min estimated Jaccard for an LSH candidate to survive Stage 2. */
  readonly lexicalCandidateMin: number;
  /** Min cosine for an ANN candidate to survive Stage 3. */
  readonly semanticCandidateMin: number;
  /** fusedScore ≥ this AND sameAnswerKey AND no discriminator delta → NEAR without LLM. */
  readonly nearAutoMin: number;
  /** fusedScore < this → UNIQUE without LLM. */
  readonly uniqueAutoMax: number;
  /** fusedScore ≥ this AND !sameAnswerKey → CONFLICT candidate. */
  readonly conflictMin: number;
  /** LLM confidence below this → REVIEW regardless of LLM relation. */
  readonly llmMinConfidence: number;
  readonly maxCandidatesPerStage: number;
}

// ============================================================================
// 7. Ports (Dependency Inversion) — implemented in src/infrastructure/questionBank/duplication/*
// ============================================================================

/** Stage 0 — pure, deterministic. Shared verbatim by browser and Worker. */
export interface IQuestionCanonicalizer {
  readonly version: NormalizerVersion;
  canonicalize(question: Question): Promise<CanonicalQuestion>;
}

export interface IMinHasher {
  signature(shingles: ReadonlySet<number>): Uint32Array;
  bandKeys(signature: Uint32Array): readonly string[];
  estimateJaccard(a: Uint32Array, b: Uint32Array): number;
}

export interface IClinicalDiscriminatorExtractor {
  extract(canonicalStem: string): readonly ClinicalDiscriminator[];
}

/** Read/write fingerprints. Edge impl = D1; browser impl = in-memory index built from Dexie. */
export interface IFingerprintRepository {
  findById?(questionId: string): Promise<QuestionFingerprint | null>;
  findByItemHash(scope: QddScope, hash: CanonicalItemHash): Promise<readonly QuestionFingerprint[]>;
  findByStemHash(scope: QddScope, hash: CanonicalStemHash): Promise<readonly QuestionFingerprint[]>;
  findByLshBands(scope: QddScope, bandKeys: readonly string[], limit: number): Promise<readonly QuestionFingerprint[]>;
  upsert(fingerprint: QuestionFingerprint): Promise<Result<void, QddError>>;
  remove(questionId: string): Promise<Result<void, QddError>>;
}

export interface IEmbeddingProvider {
  readonly modelId: EmbeddingModelId;
  readonly dimensions: number;
  /** Batched. Implementations MUST respect provider batch limits and timeouts. */
  embed(texts: readonly string[], signal?: AbortSignal): Promise<Result<readonly Float32Array[], QddDegradationReason>>;
}

export interface VectorMatch {
  readonly questionId: string;
  readonly cosine: number;
}

export interface IVectorIndex {
  query(vector: Float32Array, scope: QddScope, topK: number, signal?: AbortSignal): Promise<Result<readonly VectorMatch[], QddDegradationReason>>;
  upsert(items: readonly { readonly questionId: string; readonly vector: Float32Array; readonly blockId: string; readonly chapterId: string }[]): Promise<Result<void, QddDegradationReason>>;
  remove(questionIds: readonly string[]): Promise<Result<void, QddDegradationReason>>;
}

export interface IPairReranker {
  /** Returns calibrated 0..1 scores aligned with `candidates`. */
  score(query: string, candidates: readonly string[], signal?: AbortSignal): Promise<Result<readonly number[], QddDegradationReason>>;
}

export interface ILlmDuplicateArbiter {
  arbitrate(a: CanonicalQuestion, b: CanonicalQuestion, signals: SimilaritySignals, signal?: AbortSignal): Promise<Result<LlmArbiterVerdict, QddDegradationReason>>;
}

/** Caches expensive pair verdicts (reranker + LLM) so no pair is ever paid for twice. */
export interface IPairVerdictCache {
  get(key: PairKey): Promise<LlmArbiterVerdict | null>;
  put(key: PairKey, verdict: LlmArbiterVerdict): Promise<void>;
}

/** Daily free-tier guard (Workers AI neurons, LLM calls). Fails closed → degraded, never errors. */
export interface IAiBudgetGuard {
  tryConsume(resource: 'embedding' | 'rerank' | 'llm', units: number): Promise<boolean>;
}

/** Chain-of-Responsibility link. Each stage may short-circuit by setting `context.final`. */
export interface IDetectionStage {
  readonly id: QddStageId;
  readonly timeoutMs: number;
  execute(context: DetectionContext): Promise<void>;
}

export interface DetectionContext {
  readonly subject: CanonicalQuestion;
  readonly scope: QddScope;
  readonly tier: QddExecutionTier;
  readonly thresholds: QddThresholds;
  readonly signal: AbortSignal;
  candidates: Map<string, MutableCandidate>;
  stagesExecuted: QddStageId[];
  degradedReasons: QddDegradationReason[];
  final: boolean;
}

export interface MutableCandidate {
  readonly fingerprint: QuestionFingerprint;
  canonical: CanonicalQuestion | null;
  lexicalJaccard: number | null;
  semanticCosine: number | null;
  rerankScore: number | null;
  relation: DuplicateRelation | null;
  decidedBy: QddStageId | null;
  llm: LlmArbiterVerdict | null;
}

/** Strategy — converts relation + context into a GateDecision. Policy is swappable per tier. */
export interface IGatePolicy {
  decide(relation: DuplicateRelation, tier: QddExecutionTier, degraded: boolean, llmConfidence: number | null): GateDecision;
}

/** Facade consumed by application layer (stores, Worker routes). */
export interface IDuplicationDetectionEngine {
  check(question: Question, scope: QddScope, tier: QddExecutionTier, signal?: AbortSignal): Promise<Result<DuplicationVerdict, QddError>>;
  /** In-batch + against-bank check for AI ingestion. Preserves input order. */
  checkBatch(questions: readonly Question[], scope: QddScope, signal?: AbortSignal): Promise<Result<readonly DuplicationVerdict[], QddError>>;
}

/** Observer — telemetry sink (PostHog/observability portal). Must never throw or block. */
export interface IQddTelemetrySink {
  onVerdict(verdict: DuplicationVerdict): void;
  onReviewerResolution(resolution: ReviewerResolution): void;
}

// ============================================================================
// 8. Audit & resolution (Global Bank Health Audit)
// ============================================================================

export type AuditJobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface AuditJob {
  readonly id: AuditJobId;
  readonly scope: QddScope;
  readonly status: AuditJobStatus;
  readonly cursor: string | null;
  readonly processed: number;
  readonly total: number;
  readonly clustersFound: number;
  readonly startedBy: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
}

export interface DuplicateCluster {
  readonly id: DuplicateClusterId;
  readonly relation: Exclude<DuplicateRelation, 'UNIQUE'>;
  /** Suggested canonical survivor: published > highest evidence count > oldest. */
  readonly suggestedSurvivorId: string;
  readonly memberIds: readonly string[];
  readonly maxFusedScore: number;
}

export type ResolutionAction =
  | 'KEEP_BOTH_DISTINCT' // false positive → feeds golden set as hard negative
  | 'LINK_AS_VARIANT' // SIBLING relationship recorded; both stay published
  | 'ARCHIVE_DUPLICATE' // soft-archive (editorial_status = 'archived'); attempts/review cards keep FKs
  | 'MERGE_INTO_SURVIVOR' // archive + copy missing evidence/explanations into survivor (non-destructive)
  | 'FIX_ANSWER_KEY'; // CONFLICT resolution — opens canonical editor

export interface ReviewerResolution {
  readonly pairKey: PairKey;
  readonly subjectId: string;
  readonly matchedId: string;
  readonly engineRelation: DuplicateRelation;
  readonly humanRelation: DuplicateRelation;
  readonly action: ResolutionAction;
  readonly reviewerId: string;
  readonly note: string | null;
  readonly resolvedAt: string;
}
