/**
 * SPEC-010 — Multi-Block Curriculum Architecture
 * Normative port & schema contracts.
 *
 * Layering (Constitution P7):
 *   ui → application → domain ← infrastructure
 * Everything in this file belongs to `src/domain/curriculum/` (pure, framework-free)
 * except where marked `@layer application` or `@layer infrastructure`.
 *
 * Type-safety (Constitution P6): no `any`, no non-null assertions, Zod at every boundary.
 */

import { z } from 'zod';

// ============================================================================
// 1. IDENTITY — branded primitives
// ============================================================================

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** `cvs`, `cns`, `rrs` … lowercase slug, 2–12 chars. */
export type BlockId = Brand<string, 'BlockId'>;
/** Block-LOCAL discipline key (`anatomy`). NOT globally unique — see ADR-010-01. */
export type SubjectKey = Brand<string, 'SubjectKey'>;
/** Globally unique; MUST start with `${blockId}-` (TI-4). */
export type ChapterId = Brand<string, 'ChapterId'>;
/** Globally unique; MUST start with `${chapterId}/` (TI-5). */
export type TopicId = Brand<string, 'TopicId'>;
export type SourceId = Brand<string, 'SourceId'>;

export const BlockIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]{1,11}$/, 'BlockId must be a lowercase slug (2–12 chars)')
  .transform((s) => s as BlockId);

export const SubjectKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,31}$/)
  .transform((s) => s as SubjectKey);

/** The globally unique identity of a subject. */
export interface SubjectRef {
  readonly blockId: BlockId;
  readonly subjectId: SubjectKey;
}

/** Canonical string form for maps/caches: `cns:anatomy`. */
export const subjectRefKey = (ref: SubjectRef): string => `${ref.blockId}:${ref.subjectId}`;

/** The single sanctioned legacy default. Allowed ONLY in the boot resolver & pack normalizer. */
export const LEGACY_DEFAULT_BLOCK_ID = 'cvs' as BlockId;

// ============================================================================
// 2. BLOCK MANIFEST — content/<blockId>/manifest.json
// ============================================================================

export const LocalizedTextSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const BlockLifecycleStatusSchema = z.enum(['draft', 'beta', 'published', 'archived']);
export type BlockLifecycleStatus = z.infer<typeof BlockLifecycleStatusSchema>;

export const AccentTokenSchema = z.enum(['rose', 'violet', 'sky', 'amber', 'emerald', 'indigo', 'teal']);
export type AccentToken = z.infer<typeof AccentTokenSchema>;

/** lucide-react icon names permitted for block glyphs (closed set → no arbitrary imports). */
export const BlockGlyphSchema = z.enum(['heart', 'brain', 'wind', 'droplets', 'utensils', 'bone', 'flask-conical']);
export type BlockGlyph = z.infer<typeof BlockGlyphSchema>;

export const SourceDocumentSchema = z.object({
  id: z.string().min(3),
  subjectId: SubjectKeySchema,
  title: LocalizedTextSchema,
  fileName: z.string().min(1),
  format: z.enum(['PDF', 'PPTX', 'DOCX']),
  extent: z.object({ unit: z.enum(['pages', 'slides', 'lectures']), count: z.number().int().positive() }),
  highlights: z.array(z.string()).max(8).default([]),
});

export const SubjectManifestSchema = z.object({
  id: SubjectKeySchema,
  name: LocalizedTextSchema,
  order: z.number().int().positive(),
});

export const ChapterManifestSchema = z.object({
  id: z.string().min(3),
  subjectId: SubjectKeySchema,
  name: LocalizedTextSchema,
  order: z.number().int().positive(),
  sourceIds: z.array(z.string()).default([]),
});

export const TopicManifestSchema = z.object({
  id: z.string().min(3),
  chapterId: z.string().min(3),
  name: LocalizedTextSchema,
  order: z.number().int().positive(),
});

export const BlockManifestSchema = z.object({
  schemaVersion: z.literal(1),
  block: z.object({
    id: BlockIdSchema,
    code: z.string().min(1),            // "Block 207"
    name: LocalizedTextSchema,           // "Central Nervous System"
    shortName: z.string().min(2).max(6), // "CNS"
    description: LocalizedTextSchema,
    status: BlockLifecycleStatusSchema,
    catalogOrder: z.number().int().nonnegative(),
    presentation: z.object({ glyph: BlockGlyphSchema, accent: AccentTokenSchema }),
    aiProfileId: z.string().min(1),
  }),
  subjects: z.array(SubjectManifestSchema).min(1),
  chapters: z.array(ChapterManifestSchema).min(1),
  topics: z.array(TopicManifestSchema).default([]),
  sources: z.array(SourceDocumentSchema).default([]),
});
export type BlockManifest = z.infer<typeof BlockManifestSchema>;

// ============================================================================
// 3. TAXONOMY INTEGRITY (TI-1 … TI-9)
// ============================================================================

export type TaxonomyInvariantId = 'TI-1' | 'TI-2' | 'TI-3' | 'TI-4' | 'TI-5' | 'TI-6' | 'TI-7' | 'TI-8' | 'TI-9';

export interface TaxonomyViolation {
  readonly invariant: TaxonomyInvariantId;
  readonly blockId: BlockId;
  readonly path: string;     // JSON pointer, e.g. "/chapters/3/subjectId"
  readonly message: string;  // human, actionable
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T; readonly warnings: readonly TaxonomyViolation[] }
  | { readonly ok: false; readonly violations: readonly TaxonomyViolation[] };

export interface ITaxonomyIntegrityValidator {
  /** Structural + referential checks for one pack (TI-1..TI-7, TI-9). */
  validateManifest(raw: unknown): ValidationResult<BlockManifest>;
  /** Cross-pack global uniqueness of chapter/topic IDs (TI-4/TI-5). */
  validateCatalog(manifests: readonly BlockManifest[]): readonly TaxonomyViolation[];
  /** Per-question resolution (TI-8). Unresolvable items are returned for quarantine, never thrown. */
  partitionBank<Q extends QuestionTaxonomyRef>(
    manifest: BlockManifest,
    questions: readonly Q[]
  ): { readonly resolvable: readonly Q[]; readonly orphans: readonly Q[] };
}

export interface QuestionTaxonomyRef {
  readonly id: string;
  readonly blockId: string;
  readonly subjectId: string;
  readonly chapterId: string;
  readonly topicId: string;
}

// ============================================================================
// 4. BLOCK PACK SOURCE (Abstract Factory) — @layer infrastructure implements
// ============================================================================

export interface BlockPackDescriptor {
  readonly blockId: BlockId;
  readonly manifest: BlockManifest;
  /** Stable hash of manifest + bank version; used for cache-busting & D1 drift detection. */
  readonly contentHash: string;
}

export interface IBlockPackSource {
  /** Eager, cheap (≤ 8 KB gz per block). */
  listManifests(): readonly unknown[];
  /** Lazy; resolves to the raw bank array for that block. MUST reject (not hang) on network failure. */
  loadBank(blockId: BlockId, signal?: AbortSignal): Promise<readonly unknown[]>;
}

// ============================================================================
// 5. BLOCK CATALOG (Registry, read-only) & VISIBILITY POLICY
// ============================================================================

export type ViewerRole = 'anonymous' | 'student-free' | 'student-pro' | 'faculty-reviewer' | 'admin';

export interface IBlockVisibilityPolicy {
  isVisible(status: BlockLifecycleStatus, role: ViewerRole): boolean;
  isAuthorable(status: BlockLifecycleStatus, role: ViewerRole): boolean;
}

/** Default policy table (normative):
 *  draft      → visible: admin                         | authorable: admin
 *  beta       → visible: faculty-reviewer, admin       | authorable: faculty-reviewer, admin
 *  published  → visible: everyone                      | authorable: faculty-reviewer, admin
 *  archived   → visible: admin (read-only)             | authorable: nobody
 */

export interface ResolvedTaxonomyNode {
  readonly block: BlockManifest['block'];
  readonly subject: z.infer<typeof SubjectManifestSchema>;
  readonly chapter: z.infer<typeof ChapterManifestSchema>;
  readonly topic: z.infer<typeof TopicManifestSchema> | null;
}

export interface IBlockCatalogReader {
  list(role: ViewerRole): readonly BlockPackDescriptor[];
  get(blockId: BlockId): BlockPackDescriptor | null;
  has(blockId: BlockId): boolean;
  subjects(blockId: BlockId): readonly z.infer<typeof SubjectManifestSchema>[];
  chapters(blockId: BlockId, subjectId?: SubjectKey): readonly z.infer<typeof ChapterManifestSchema>[];
  topics(blockId: BlockId, chapterId?: ChapterId): readonly z.infer<typeof TopicManifestSchema>[];
  resolve(ref: QuestionTaxonomyRef): ResolvedTaxonomyNode | null;
  subscribe(listener: () => void): () => void;
}

/** Admin-only surface (ISP: never handed to learner UI). */
export interface IBlockLifecycleAdmin {
  setStatus(blockId: BlockId, status: BlockLifecycleStatus, actor: { id: string; role: ViewerRole }): Promise<void>;
}

/** Block-parametric successor of CurriculumTaxonomyRegistry (FR-005). */
export interface IDynamicTaxonomyExpansions {
  registerSubject(blockId: BlockId, input: { id: SubjectKey; name: LocalizedText }): SubjectRef;
  registerChapter(
    blockId: BlockId,
    input: { id: ChapterId; subjectId: SubjectKey; name: LocalizedText }
  ): ChapterId;
  reset(blockId: BlockId): void;
}

// ============================================================================
// 6. SCOPED REPOSITORIES + SPECIFICATIONS
// ============================================================================

/** Specification pattern — composable, serializable to Dexie compound-index queries. */
export type ScopeSpecification =
  | { readonly kind: 'in-block'; readonly blockId: BlockId }
  | { readonly kind: 'in-blocks'; readonly blockIds: readonly BlockId[] } // SPEC-011 forward-compat
  | { readonly kind: 'in-subject'; readonly ref: SubjectRef }
  | { readonly kind: 'in-chapter'; readonly blockId: BlockId; readonly chapterId: ChapterId }
  | { readonly kind: 'high-yield' }
  | { readonly kind: 'and'; readonly specs: readonly ScopeSpecification[] };

/**
 * A repository is BOUND to a block at construction. There is intentionally no
 * method that reads across blocks — unscoped reads are unrepresentable (FR-020).
 */
export interface IBlockScopedRepository<T> {
  readonly blockId: BlockId;
  all(): Promise<readonly T[]>;
  count(): Promise<number>;
  find(spec: ScopeSpecification): Promise<readonly T[]>;
  put(items: readonly T[]): Promise<void>;
}

export interface IBlockScopedRepositoryFactory<T> {
  forBlock(blockId: BlockId): IBlockScopedRepository<T>;
}

/** The ONLY cross-block read allowed, and only for learner-global metrics (ADR-010-05). */
export interface ILearnerGlobalActivityReader {
  answeredAtTimestamps(sinceIso: string): Promise<readonly string[]>;
}

// ============================================================================
// 7. METRIC SCOPE POLICY (Strategy) — ADR-010-05
// ============================================================================

export type MetricId =
  | 'accuracy' | 'mastery' | 'coverage' | 'weakTopics' | 'dueReviews' | 'pacing'
  | 'confidenceCalibration' | 'retentionForecast' | 'subjectReadiness'
  | 'streakDays' | 'todayAttempts' | 'dailyGoal';

export type MetricScope = 'block' | 'learner-global';

export interface IMetricScopePolicy {
  scopeOf(metric: MetricId): MetricScope;
}

/** Normative default. */
export const DEFAULT_METRIC_SCOPES: Readonly<Record<MetricId, MetricScope>> = Object.freeze({
  accuracy: 'block',
  mastery: 'block',
  coverage: 'block',
  weakTopics: 'block',
  dueReviews: 'block',
  pacing: 'block',
  confidenceCalibration: 'block',
  retentionForecast: 'block',
  subjectReadiness: 'block',
  streakDays: 'learner-global',
  todayAttempts: 'learner-global',
  dailyGoal: 'learner-global',
});

// ============================================================================
// 8. ACTIVE BLOCK CONTEXT — State machine + Command  (@layer application)
// ============================================================================

export type BlockContextStatus = 'booting' | 'ready' | 'switching' | 'hydrating' | 'rolled-back' | 'error';

export interface ActiveBlockState {
  readonly activeBlockId: BlockId;
  readonly status: BlockContextStatus;
  /** Monotonic; any async result tagged with a stale epoch MUST be discarded (FR-013). */
  readonly epoch: number;
  readonly pendingTargetId: BlockId | null;
  readonly lastError: BlockSwitchError | null;
}

export type BlockSwitchReason = 'user-switcher' | 'deep-link' | 'cross-tab' | 'boot' | 'fallback-unavailable';

export interface SwitchBlockCommand {
  readonly from: BlockId;
  readonly to: BlockId;
  readonly epoch: number;
  readonly reason: BlockSwitchReason;
  readonly issuedAtMs: number;
}

export type BlockSwitchError =
  | { readonly code: 'unknown-block'; readonly blockId: string }
  | { readonly code: 'not-visible'; readonly blockId: BlockId }
  | { readonly code: 'pack-load-failed'; readonly blockId: BlockId; readonly cause: string }
  | { readonly code: 'hydration-failed'; readonly blockId: BlockId; readonly cause: string }
  | { readonly code: 'superseded'; readonly byEpoch: number }
  | { readonly code: 'cancelled-by-user' };

export type BlockSwitchOutcome =
  | { readonly kind: 'committed'; readonly to: BlockId; readonly durationMs: number; readonly cold: boolean }
  | { readonly kind: 'rolled-back'; readonly restored: BlockId; readonly error: BlockSwitchError }
  | { readonly kind: 'superseded'; readonly byEpoch: number }
  | { readonly kind: 'noop' };

/** Guard consulted BEFORE any state mutation (US4 / D7). */
export interface ISessionLeaveGuard {
  /** Resolves true when the user confirms (or no session in progress). */
  confirmLeave(from: BlockId, to: BlockId): Promise<boolean>;
}

/** Participants hydrate in order; each MUST be idempotent and abortable. */
export interface IBlockHydrationParticipant {
  readonly name: 'questions' | 'stats' | 'copilot' | 'memento' | 'analytics';
  prepare(blockId: BlockId, signal: AbortSignal): Promise<unknown>; // no visible side-effects
  commit(prepared: unknown): void;                                   // synchronous, cannot fail
}

export interface ISwitchBlockUseCase {
  execute(to: BlockId, reason: BlockSwitchReason): Promise<BlockSwitchOutcome>;
}

export interface IActiveBlockPreference {
  read(): BlockId | null;
  write(blockId: BlockId): void;
  /** Cross-tab notifications (BroadcastChannel 'medquests_block_context'). */
  subscribe(listener: (blockId: BlockId) => void): () => void;
}

/** FR-011 resolution order, pure & unit-testable. */
export interface IBootBlockResolver {
  resolve(input: {
    readonly deepLink: string | null;
    readonly persisted: string | null;
    readonly visible: readonly BlockPackDescriptor[];
  }): { readonly blockId: BlockId; readonly reason: BlockSwitchReason; readonly notice: 'none' | 'deep-link-invalid' | 'persisted-unavailable' };
}

// ============================================================================
// 9. PER-BLOCK UI MEMENTO
// ============================================================================

export interface BlockSessionMemento {
  readonly blockId: BlockId;
  readonly testHub: { readonly subjectId: string; readonly chapterId: string; readonly count: number | 'all'; readonly highYieldOnly: boolean };
  readonly reviewTab: string | null;
  readonly savedAtIso: string;
}

export interface IBlockMementoStore {
  load(blockId: BlockId): BlockSessionMemento | null;
  save(memento: BlockSessionMemento): void;
}

// ============================================================================
// 10. AI PROFILE (Strategy)
// ============================================================================

export type ToolsetId = 'core' | 'hemodynamics' | 'neuro-localization';

export interface BlockAiProfile {
  readonly id: string;               // 'cvs-faculty-v1', 'cns-faculty-v1'
  readonly personaLabel: string;     // "Socratic Neuroscience Faculty Mentor"
  readonly specialtyLabel: string;   // "Neuroscience & Clinical Neurology"
  readonly boardContext: string;     // "USMLE Step 1 / University Block 207"
  readonly toolsetIds: readonly ToolsetId[];
}

export interface IBlockAiProfileRegistry {
  get(profileId: string): BlockAiProfile;   // falls back to a neutral 'generic-faculty-v1'
  isToolAllowed(profile: BlockAiProfile, toolName: string): boolean;
}

// ============================================================================
// 11. ANALYTICS EVENTS (SPEC-008 extension)
// ============================================================================

export interface BlockAnalyticsEvents {
  'block:switched': {
    from: string; to: string; reason: BlockSwitchReason;
    outcome: BlockSwitchOutcome['kind']; duration_ms: number; cold: boolean;
  };
  'block:pack_rejected': { block_id: string; violation_count: number; first_invariant: TaxonomyInvariantId };
  'block:deep_link_resolved': { requested: string; resolved: string; notice: string };
  'block:leave_guard_shown': { from: string; to: string; confirmed: boolean };
}

// ============================================================================
// 12. EDGE CONTRACT (Worker)
// ============================================================================

/** GET /api/v1/blocks → visible blocks for the caller's role. */
export interface EdgeBlockListResponse {
  readonly blocks: ReadonlyArray<{
    readonly id: string;
    readonly status: BlockLifecycleStatus;
    readonly catalogOrder: number;
    readonly manifestHash: string;
    readonly revision: number;
  }>;
}

/** Every `?block=` handler MUST call this first (FR-051). */
export interface IEdgeBlockGuard {
  requireKnownBlock(raw: string | null): Promise<{ ok: true; blockId: BlockId; status: BlockLifecycleStatus } | { ok: false; response: Response }>;
  requireWritableBlock(blockId: BlockId, role: ViewerRole): Promise<{ ok: true } | { ok: false; response: Response }>;
}
