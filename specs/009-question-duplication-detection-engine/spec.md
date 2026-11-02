# Feature Specification: Question Duplication Detection Engine (QDD)

**Document ID**: `SPEC-009-QUESTION-DUPLICATION-DETECTION-ENGINE`
**Feature Branch**: `009-question-duplication-detection-engine`
**Created**: 2026-11-02
**Status**: Draft (Ready for `/speckit-clarify` → `/speckit-tasks`)
**Supersedes**: Exploratory drafts `APPLE-SPEC-2026-QDD-009/010/011/012` (conversation drafts — see §11 Corrections)
**Depends on**: [SPEC-005 Global Question Bank Governance](../005-global-question-bank-governance/spec.md), [SPEC-002 AI Cognitive Copilot](../002-ai-cognitive-copilot/spec.md) (provider registry), [SPEC-007 Observability](../007-cloudflare-live-observability-and-ai-telemetry-portal/spec.md), [SPEC-008 PostHog](../008-posthog-zero-overhead-behavioral-analytics/spec.md)
**Contracts**: [duplication-detection-ports.ts](./contracts/duplication-detection-ports.ts)
**Plan**: [plan.md](./plan.md)

---

## 0. Executive Board Decision Record

> **CEO** — "Duplicates feel like clutter to a student and like a tax to a faculty author. Learners must never see the same question twice under two IDs. Authors must never be told *'Error: duplicate'* with no explanation. The engine has to show its reasoning, offer a next step, and never get between a student and a question."
>
> **CTO** — "We stay on our current stack: React SPA + one Cloudflare Worker + D1, everything in TypeScript. No Python service and no second cloud. We design for our real scale (212 questions today, ~20k across all blocks over the next 24 months), with a path to 1M that needs no rewrite. Our hard limits are the **Workers Free 10 ms CPU cap**, **10,000 Workers AI neurons/day**, and **Vectorize at 5M stored dimensions**."
>
> **QA Engineering Manager** — "In medicine, one token can flip a question: *'most likely'* vs *'least likely'*, *left* vs *right*, *120 mmHg* vs *180 mmHg*. A false 'duplicate' that archives a real variant is a **content-loss defect**. A missed duplicate is only a **cosmetic defect**. So we tune for precision, nothing auto-deletes, and every threshold is calibrated against a versioned golden set in CI."
>
> **Principal SWE** — "The Apple four-stage funnel is directionally right, but four pieces are missing for our domain. **(1)** An *answer-key fingerprint*: the same stem with a different correct answer is a **CONFLICT**, which is a P2 medical-accuracy alarm and more important than any duplicate. **(2)** A *deterministic clinical-discriminator gate* that catches negation, laterality, and numeric deltas before any model gets a vote. **(3)** A *browser-side advisory tier* that runs on the student's or author's local bank, so feedback while typing takes under 16 ms and costs nothing. **(4)** *Pair-verdict caching plus a daily AI budget guard*, so no pair is paid for twice and the free tier is never exceeded."

**Decision**: APPROVED. Build a six-stage, tiered sieve in TypeScript. Share the pure domain core between the browser and the Worker. The LLM is an arbiter of last resort, not a detector.
**Zero Auto-Acceptance Mandate**: The engine NEVER automatically accepts or publishes any question into the canonical bank. An engine outcome of `ALLOW` (unique) or `REVIEW` (potential duplicate) merely stages the item into the Faculty Review Queue (`pending_review`). Every addition to the canonical bank strictly requires explicit human reviewer approval. Student authors receive full visibility into duplicate evidence on their submissions so they understand any similarity flags. Benchmark calibration is 100% automated via synthetic perturbations of existing questions—no manual faculty labeling required.

---

## 1. Problem Statement

Today, deduplication in Med Quests is a single exact check: `QuestionCanonicalHasher.computeStemHashSync(stem)` plus a unique index on `(chapter_id, stem_hash)` in `global_questions` ([migration 0003](../../src/worker/migrations/0003_global_questions_bank.sql)). It has these known gaps:

| # | Gap | Consequence |
|---|-----|-------------|
| G1 | Only the stem is hashed. Choice sets and answer keys are ignored. | Two items with identical stems but different correct answers are treated as "duplicate" (wrong). Answer-key contradictions are never surfaced. |
| G2 | Scope is per-chapter. | The same question filed under two chapters is never detected. |
| G3 | No paraphrase or near-duplicate detection. | AI ingestion (Ingestion Lab, multi-model parser) produces reworded duplicates that pass the gate. |
| G4 | `computeStemHashSync` is not SHA-256. It is a 128-bit mix with mirrored halves. | Misleading name, lower collision resistance, and no versioning of the normalizer. |
| G5 | No in-batch dedupe in AI ingestion. | One parse run can emit the same question 2–3 times. |
| G6 | No bank-wide audit. | Existing duplicates in the 212-item CVS bank (and future blocks) are invisible. |
| G7 | The error is a bare 409. | No explanation and no next step for authors. Violates P10 (calm) and the CEO's mandate. |

---

## 2. Goals & Non-Goals

### Goals
1. Detect **EXACT**, **NEAR** (paraphrase), and **CONFLICT** (same question, different key) relations with explainable evidence. Surface **SIBLING** (legitimate variant) as information only.
2. Run at **four integration points**: Studio authoring (live), submission/curation (authoritative gate), AI Ingestion Lab (batch), and Global Bank Health Audit (full scan).
3. **$0 at current scale**, with explicit headroom math (§7) and graceful degradation when free quotas run out.
4. **Zero learner-path impact** (P1). The engine never runs during Test/Review sessions.
5. Fully runnable **offline** in development and CI, with deterministic fakes.

### Non-Goals
- Automatic deletion or merging without a human decision. Never allowed.
- Detecting duplicates across *learners' private* `local-custom` questions on the server. Private data stays on the device (P8). Browser-tier checks may run locally.
- Plagiarism detection against external or commercial banks (prohibited by P3).
- Generating rewritten variants of duplicates (P3: no runtime question generation).
- Image or figure similarity (deferred to v2; see §10).

---

## 3. Personas & User Scenarios *(mandatory)*

Personas: **Student-Author** (Studio, local-custom), **Faculty Reviewer** (`faculty-reviewer`), **Platform Admin** (`admin`), **Ingestion Operator** (admin running the AI Question Parser Lab).

### User Story 1 — Authoritative gate on submission & canonical publish (Priority: P1)

When anyone submits a question to the review queue (`POST /api/bank/submissions`) or publishes or edits a canonical item (`POST /api/admin/questions/canonical`), the Worker runs the authoritative check against the whole **block**, not just the chapter.

**Why this priority**: This protects the integrity of the canonical bank that every student syncs. It is the minimum viable value.

**Independent Test**: Seed D1 with the CVS bank. Submit (a) a whitespace/case/choice-shuffled copy, (b) a paraphrase with the same key, (c) the same stem with a different key, and (d) a new question. Assert BLOCK / REVIEW(NEAR) / REVIEW(CONFLICT) / ALLOW respectively.

**Acceptance Scenarios**:
1. **Given** a published item, **When** an author submits a copy that differs only in casing, whitespace, smart quotes, or choice order, **Then** the response is `BLOCK` with relation `EXACT`, a link to the existing item, and no submission row is created.
2. **Given** a published item, **When** an author submits a paraphrase with the same correct answer, **Then** the submission is accepted into the review queue tagged `REVIEW/NEAR`, with the matched item and similarity evidence attached for the reviewer.
3. **Given** a published item, **When** a submission has a near-identical stem but a different correct answer, **Then** it is tagged `REVIEW/CONFLICT` with severity *high*, and the reviewer sees both answer keys side by side.
4. **Given** the same question exists under another chapter in the same block, **When** it is submitted, **Then** it is detected (fixes G2).
5. **Given** Workers AI is unavailable or the daily budget is exhausted, **When** a submission arrives, **Then** Stages 0–2 still run, the verdict has `degraded=true`, and no semantic-only verdict can ever `BLOCK`. The submission is accepted with `REVIEW` if lexical candidates exist, or `ALLOW` otherwise, and is re-queued for a semantic re-check.
6. **Given** a Student-Author inspects their submission history (`GET /api/bank/submissions/my`), **When** an item has been flagged `REVIEW/NEAR`, `REVIEW/CONFLICT`, or `INFORM/SIBLING`, **Then** the author sees the full explainable evidence (matched question preview, similarity score, and discriminator chips) so they understand the reviewer's context.
7. **Given** any question passes deduplication with verdict `ALLOW` (unique), **When** processed by the gateway, **Then** it is placed in `pending_review` status; it is NEVER automatically published or auto-accepted into the canonical bank without explicit human faculty approval (Zero Auto-Acceptance Invariant).

---

### User Story 2 — In-batch + against-bank dedupe for AI Ingestion (Priority: P1)

When the Ingestion Operator parses a source with the AI Question Parser, every parsed item gets a duplication badge before it can be saved. Items are checked against each other within the batch and against the bank.

**Why this priority**: AI ingestion is the largest source of duplicates (G3, G5) and the biggest driver of future bank growth.

**Independent Test**: Feed a fixture batch of 40 items containing 6 planted duplicates (2 in-batch, 4 against the bank). Assert all 6 are flagged, with 0 false flags on the remaining 34.

**Acceptance Scenarios**:
1. **Given** a parse result of N items, **When** results render, **Then** each item shows one badge — `Unique`, `Exact duplicate of #…`, `Likely duplicate`, `Answer conflict`, or `Related variant` — within 2 s for N ≤ 50.
2. **Given** two items in the same batch are duplicates, **When** the operator clicks "Save all unique", **Then** only the first occurrence is kept and the others are listed as skipped, with reasons.
3. **Given** an item flagged `Likely duplicate`, **When** the operator expands it, **Then** a side-by-side diff shows changed tokens and the clinical discriminators that matched or differed.

---

### User Story 3 — Instant, calm feedback while authoring (Priority: P2)

While a Student-Author or Faculty member types a stem in the Question Studio, a quiet inline hint appears if the question resembles one already in their local bank (synced canonical plus their own custom questions).

**Why this priority**: This prevents duplicates at the source, which delights authors and lowers server load. It is advisory only, so it ships after the authoritative gate.

**Independent Test**: With the network disabled, type a known CVS stem into the Studio and assert that a hint appears within 300 ms of the last keystroke.

**Acceptance Scenarios**:
1. **Given** the local bank is loaded, **When** the author pauses typing for 250 ms, **Then** the browser tier (Stages 0–2 + S4) runs in a Web Worker in **< 16 ms of main-thread-free compute**, and the hint appears without layout shift.
2. **Given** a hint is shown, **When** the author clicks it, **Then** a sheet opens with the matched question and three actions: *Open existing*, *This is a different question* (dismiss for this draft), and *Make it a variant* (adds a SIBLING link on submit).
3. **Given** the device is offline, **When** the author types, **Then** the hint still works. No network request is made by the browser tier.
4. **Given** `prefers-reduced-motion`, **When** a hint appears, **Then** it fades without motion. Everything is keyboard-reachable and announced via `aria-live="polite"` (P10).

---

### User Story 4 — Global Bank Health Audit (Priority: P2)

An Admin starts a full audit of a block. The system finds every duplicate cluster and every answer conflict, then presents a triage board with bulk-safe resolutions.

**Why this priority**: This cleans the existing bank (G6) and is required before onboarding new blocks.

**Independent Test**: Run the audit against a 2,000-item synthetic bank with 120 planted clusters. Assert recall ≥ 95% on planted clusters and that the job is resumable after a forced Worker restart.

**Acceptance Scenarios**:
1. **Given** an admin starts an audit, **When** it runs, **Then** progress is shown live (processed/total, clusters found, ETA) and the audit never blocks other admin actions.
2. **Given** the Worker invocation ends (CPU or time limit), **When** the next chunk runs, **Then** the audit resumes from its persisted cursor with no duplicated or lost work.
3. **Given** a cluster, **When** the admin chooses *Archive duplicate* or *Merge into survivor*, **Then** the loser is soft-archived (`editorial_status='archived'`), evidence is merged non-destructively, students' attempts and review cards keep valid foreign keys, `bank_revisions` increments, and an audit-log entry is written.
4. **Given** a CONFLICT cluster, **When** it is opened, **Then** the only primary action is *Fix answer key* (opens the canonical editor). It cannot be bulk-archived.

---

### User Story 5 — Reviewer resolution feeds quality loop (Priority: P3)

Every human decision on an engine verdict (agree, override, or action) is recorded. Overrides automatically become golden-set candidates.

**Why this priority**: Thresholds keep improving with real data. Precision targets stay verifiable.

**Acceptance Scenarios**:
1. **Given** a reviewer marks a `NEAR` verdict as *Keep both — distinct*, **Then** a `ReviewerResolution` is stored, the pair is cached as UNIQUE (never flagged again until either item changes), and the pair is exported to the golden-set candidate file on the next `pnpm qdd:golden:export`.
2. **Given** the admin dashboard, **Then** it shows a 30-day engine precision proxy (`1 − overrides/flags`) per relation.

### Edge Cases

- **Negation flip**: "Which is **NOT** a branch of the RCA?" vs "Which **is** a branch of the RCA?" → SIBLING (S4 discriminator), never NEAR.
- **Laterality / numeric**: left vs right coronary dominance; "BP 120/80" vs "BP 180/110" → SIBLING.
- **Same stem, different choice sets, same key**: NEAR (the distractors differ, but it tests the same fact). Reviewer decides.
- **Same stem, different key**: CONFLICT, even if the choice sets differ.
- **Very short stems** (< 8 tokens, e.g. "Define cardiac output."): lexical similarity is unreliable. Rely on itemHash + semantic + answer key only, and never auto-NEAR.
- **Vignette vs verbatim stem modes** (`QuestionStemMode`): a USMLE vignette rewrite of a verbatim stem with the same key → NEAR (intended relation; the reviewer picks the survivor or links as variant).
- **Arabic/bilingual content**: stems are English today. A non-ASCII-majority stem routes to the multilingual embedding model (plan §R3), or degrades to lexical-only with `degraded=true`.
- **Self-match on edit**: editing a published item must exclude its own ID and its prior versions.
- **Archived items**: excluded from BLOCK decisions, but included as INFORM ("matches an archived question").
- **Concurrent submissions of the same new item**: the D1 unique index on `(block_id, item_hash)` for published rows is the final arbiter. The second writer receives EXACT.
- **Normalizer upgrade**: fingerprints with an old `normalizer_version` are treated as stale. Checks fall back to recompute-on-read for that row and flag `FINGERPRINT_STALE` until the backfill completes.
- **Quota exhaustion mid-batch**: the remaining items are processed lexical-only and marked degraded. The batch never fails as a whole.

---

## 4. Requirements *(mandatory)*

### 4.1 Functional Requirements

**Canonicalization & fingerprints**
- **FR-001**: The system MUST compute a versioned canonical form (`qdd-norm-v2`) of every question. This includes Unicode NFKC, lowercase, whitespace/quote/dash normalization, choice-label stripping, order-invariant sorted choices, and the normalized correct-answer text.
- **FR-002**: The system MUST persist three real SHA-256 fingerprints per question: `stemHash`, `itemHash` (stem + sorted choices + key), and `answerKeyHash`. It must also store a 128-permutation MinHash signature with 32 LSH band keys and the extracted clinical discriminators.
- **FR-003**: Fingerprints MUST be written in the same D1 batch as the question insert/update (no eventual consistency for exact detection).
- **FR-004**: The canonicalizer, MinHasher, and discriminator extractor MUST be pure domain code with zero I/O, identical in browser and Worker (byte-for-byte equal fingerprints, verified by a cross-runtime test).

**Detection pipeline**
- **FR-010**: The engine MUST run stages in order and short-circuit as early as possible: S0 Canonicalize → S1 Exact (itemHash/stemHash) → S2 Lexical LSH → S3 Semantic ANN → S4 Clinical Discriminators → S5 Rerank → S6 LLM Arbiter.
- **FR-011**: S3, S5, and S6 MUST only receive candidates that survived the previous stage. S6 MUST only receive pairs whose fused score falls inside the calibrated ambiguity band.
- **FR-012**: Same stem (or NEAR) with a different `answerKeyHash` MUST yield `CONFLICT` regardless of model output.
- **FR-013**: A discriminator delta (negation, laterality, numeric, demographic, superlative, temporal) MUST cap the relation at `SIBLING` unless a human overrides it. An LLM cannot override S4.
- **FR-014**: `BLOCK` MUST only be emitted for `EXACT` against a **published** item. No probabilistic stage may produce `BLOCK`.
- **FR-015**: Every verdict MUST include evidence: per-candidate signals, the deciding stage, an i18n explanation key, engine/threshold versions, and degradation reasons.
- **FR-016**: Thresholds MUST be loaded from a versioned config (`QddThresholds.version`). Stages MUST NOT hard-code them.
- **FR-017**: Pair verdicts from S5/S6 MUST be cached by `PairKey` (order-independent, content-version-aware) and reused.

**Integration points**
- **FR-020**: `POST /api/bank/submissions` and `POST /api/admin/questions/canonical` (create/update) MUST invoke the authoritative engine with block scope. They return 409 + verdict on BLOCK, and otherwise persist the verdict alongside the submission.
- **FR-021**: The engine MUST expose `POST /api/qdd/check` (single) and `POST /api/qdd/check-batch` (≤ 50 items), restricted to authenticated `faculty-reviewer`/`admin` roles and rate-limited per user.
- **FR-022**: The AI Question Parser Lab MUST display per-item verdict badges and support "Save all unique".
- **FR-023**: The Question Studio MUST run the browser advisory tier in a Web Worker against the local Dexie bank, debounced at 250 ms.
- **FR-024**: Admins MUST be able to start, pause, resume, and cancel a block audit. The audit MUST be chunked and cursor-resumable so that every invocation stays within the Workers Free CPU limit.
- **FR-025**: Resolutions MUST be non-destructive (soft-archive only), increment `bank_revisions`, and write to `question_editorial_audit_log`.

**Resilience, cost, security**
- **FR-030**: Every remote stage MUST have a timeout, a circuit breaker, and a typed degradation reason. Failure MUST degrade conservatively (toward REVIEW/ALLOW), never toward BLOCK.
- **FR-031**: A daily AI budget guard MUST enforce configurable caps on embeddings, reranks, and LLM calls below the free-tier limits, defaulting to 80% of the free allowance.
- **FR-032**: Question text sent to the LLM arbiter MUST be passed as delimited data with an injection-resistant system prompt. Output MUST be validated with Zod, and invalid output is treated as `LLM_UNAVAILABLE`.
- **FR-033**: No learner-private `local-custom` content may be sent to the server by the browser tier.
- **FR-034**: Telemetry (verdict relation, stage, latency, degraded flag, and override) MUST go through the existing observability/PostHog sinks without question text.

### 4.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Browser advisory tier latency (local bank ≤ 20k) | p95 < 16 ms compute in a Web Worker; 0 network |
| NFR-02 | Edge authoritative, exact/lexical path (S0–S2) | p95 < 60 ms server time |
| NFR-03 | Edge authoritative, semantic path (S0–S5) | p95 < 450 ms server time |
| NFR-04 | Edge with LLM arbiter (S6) | p95 < 2.5 s; ≤ 5% of checks reach S6 |
| NFR-05 | Batch check (50 items) | p95 < 2 s end-to-end |
| NFR-06 | CPU per Worker invocation | < 8 ms on the Free plan (2 ms headroom under the 10 ms cap) |
| NFR-07 | Audit throughput | ≥ 500 items/minute on Free; resumable |
| NFR-08 | Cost at ≤ 13k questions & ≤ 300 checks/day | $0.00 |
| NFR-09 | Availability of the authoritative gate when AI is down | 100% (degraded mode) |
| NFR-10 | Type safety | `strict`, no `any`, no `!`, Zod at every boundary (P6) |
| NFR-11 | Domain test coverage | ≥ 95% lines in `src/domain/questionBank/duplication/` (exceeds P9) |
| NFR-12 | Accessibility | WCAG 2.2 AA; all QDD UI keyboard-operable; reduced-motion respected |

### 4.3 Key Entities

- **QuestionFingerprint**: per-question hashes, MinHash/LSH bands, discriminators, embedding model and version. 1:1 with `global_questions`.
- **DuplicationVerdict / DuplicateCandidate**: the explainable result of a check (contracts §5).
- **PairVerdictCache**: memoized reranker/LLM outcome per unordered pair and content version.
- **DuplicateLink**: a persisted human-confirmed relation (`SIBLING` variant link, or `DUPLICATE_OF` after archive).
- **AuditJob / DuplicateCluster**: resumable bank scan and its grouped findings.
- **ReviewerResolution**: human decision on an engine verdict; source of golden-set growth.
- **GoldenPair**: a labeled pair `(a, b, relation, source, addedAt)` in the versioned evaluation set.

---

## 5. Product & UX Specification

**Tone**: helpful collaborator, never an error. Copy lives in `src/domain/i18n/dictionaries/{en,ar}.ts` under `qdd.*`.

| Relation | Badge (EN) | Color token | Primary action | Secondary |
|---|---|---|---|---|
| EXACT | "Already in the bank" | neutral/blue | Open existing | — |
| NEAR | "Very similar question exists" | amber | Compare side-by-side | Keep both · Link as variant |
| CONFLICT | "Same question, different answer" | red (semantic danger) | Review answer keys | — |
| SIBLING | "Related variant" | gray | View related | Dismiss |
| UNIQUE | (no badge; optional ✓ in Ingestion Lab) | green | — | — |

**Interaction rules**
- Inline hints never steal focus or shift layout, and never appear for stems with fewer than 12 characters.
- The comparison sheet shows token-level diff highlighting, matched/different discriminators as chips (e.g. `NOT ↔ —`, `left ↔ right`), both answer keys, and the evidence citations of both items.
- Degraded verdicts show a subtle "Quick check only — full check will finish in review" note. No scary language.
- Every QDD action is reachable by keyboard (`⌘↵` opens compare, `Esc` dismisses), and focus returns to the editor.
- Ingestion Lab: badges render progressively (optimistic "Checking…" shimmer, then the verdict). The list never blocks scrolling or editing.

---

## 6. Success Criteria *(mandatory)*

| ID | Metric | Target | Measured by |
|----|--------|--------|-------------|
| SC-001 | EXACT recall on golden set | 100% | CI `qdd:eval` |
| SC-002 | NEAR precision / recall | ≥ 98% / ≥ 92% | CI `qdd:eval` |
| SC-003 | CONFLICT recall | ≥ 99% | CI `qdd:eval` |
| SC-004 | False-BLOCK rate | 0 (structurally impossible; property-tested) | fast-check property suite |
| SC-005 | SIBLING misclassified as NEAR (discriminator pairs) | ≤ 0.5% | CI `qdd:eval` |
| SC-006 | Duplicate rate of newly published items (30 days post-launch) | < 0.5% | audit job |
| SC-007 | Reviewer override rate on NEAR flags | < 10% | telemetry |
| SC-008 | Share of checks escalated to the LLM | ≤ 5% | telemetry |
| SC-009 | Monthly infra cost at current scale | $0.00 | Cloudflare dashboard |
| SC-010 | Author satisfaction (in-app thumbs on hints) | ≥ 85% positive | PostHog |

**Release gate**: SC-001…SC-005 MUST pass on the golden set before any threshold or model change merges.

---

## 7. Capacity & Cost Envelope (Free Tier)

| Resource | Free allowance | QDD usage model | Headroom |
|---|---|---|---|
| Workers requests | 100k/day | ~1 req per check, ~1 per audit chunk | Huge |
| Workers CPU | 10 ms/invocation | S0–S2 ≈ 1–3 ms; LSH join chunked to ≤ 500 items | Requires chunking (FR-024) |
| D1 | 5M rows read/day, 100k writes/day, 5 GB | Band lookups ≈ 32 index probes/check | Huge |
| Vectorize | 5M stored dims; 30M queried dims/month | `bge-small-en-v1.5` = 384 dims → **~13,000 questions free** | Paid plan beyond ~13k ($5/mo base) |
| Workers AI | 10,000 neurons/day | Embedding short stems is cheap; reranker moderate; LLM is the cost driver | Budget guard (FR-031) |
| LLM arbiter | Workers AI or existing Groq/Gemini free tiers | ≤ 5% of checks | Cached per pair |

> [!NOTE]
> At ~13k+ questions or sustained high check volume, upgrade to Workers Paid ($5/mo). That also lifts the CPU cap to 30 s and removes the need for aggressive audit chunking. The architecture does not change.

---

## 8. Assumptions

- Question stems are English. Bilingual content (SPEC-004) affects the UI, not stems. Arabic stems are handled by the routing rule in plan R3.
- Only `faculty-reviewer` and `admin` can call server QDD endpoints. Student-Authors get the browser tier plus the authoritative check implicitly on submission, with full visibility into their submission's deduplication evidence.
- Zero Auto-Acceptance: No submission or duplicate candidate is ever auto-accepted or published into the canonical bank without explicit human reviewer sign-off.
- The 400-pair seed golden evaluation benchmark is 100% synthetically generated via `scripts/qdd/generate-synthetic-golden.ts` from the existing 212 CVS questions using programmatic perturbations (stem rephrasing, option permutations, negation flips, and distractor answer-key swaps). Zero manual faculty labeling is required to bootstrap the test harness.
- The existing auth/session middleware in `src/worker/index.ts` provides the role.
- The existing `(chapter_id, stem_hash)` unique index stays until the v2 fingerprint backfill is verified. It is then replaced (plan Phase 1 migration).

## 9. Constitution Alignment

| Principle | Alignment |
|---|---|
| P1 Testing & Review First | QDD never runs in learner sessions. Authoring/admin only. |
| P2 Medical Accuracy | CONFLICT detection surfaces answer-key contradictions. No auto-deletion. |
| P3 No Runtime Generation | The LLM classifies pairs only. It never writes or rewrites questions. |
| P4 Zero-Friction | Browser tier < 16 ms. Hints are non-blocking. |
| P6 Type Safety | Branded types, Zod boundaries, no `any`. |
| P7 Clean Architecture | Pure domain core + ports. Infrastructure adapters per runtime. |
| P8 Local-First, Free | Browser tier is offline. $0 at current scale. Private custom questions never leave the device. |
| P9 Test-Backed | ≥ 95% domain coverage, golden-set eval gate, cross-runtime parity test. |
| P10 Accessible & Calm | Calm copy, ARIA live regions, reduced motion. |

> [!WARNING]
> P8 ("no backend, no telemetry") is already superseded in practice by SPECs 003/005/007/008 (Worker + D1 + PostHog). This spec inherits that deviation and does not widen it. An ADR amending P8 is recommended (tracked in plan Complexity Tracking).

## 10. Out of Scope / Future (v2+)

- Figure/image similarity (perceptual hashing of embedded figures).
- Cross-block deduplication (e.g. CVS vs Respiratory share physiology). Requires `scope: global`, which is designed for but disabled.
- A fine-tuned domain cross-encoder trained on accumulated `ReviewerResolution` data, replacing the generic reranker.
- Concept-coverage analytics ("this topic has 14 near-variants, 0 on X").

## 11. Corrections to Earlier Conversation Drafts

| Draft claim | Correction |
|---|---|
| "50M questions, Spark/Ray, MinHash over 50M" | The actual bank is 212 items, with ~20k projected. A Worker + D1 is sufficient, and the design scales to ~1M via Vectorize without changes. |
| Exact hashes in KV | KV is eventually consistent (up to ~60 s) and allows only 1k writes/day on Free. Exact fingerprints live in **D1**, written in the same batch with a unique index. |
| "P95 < 40 ms end-to-end with embeddings" | Embedding + ANN round trips are realistically 100–400 ms. Sub-16 ms is only achievable in the **browser tier**. Targets in §4.2 are honest. |
| 1536-dim `bge-large` / "Apple AFM" models | `bge-large-en-v1.5` is 1024-dim, and "AFM" models are not available to us. The default is `@cf/baai/bge-small-en-v1.5` (384-dim) to fit 13k vectors in the free tier, chosen by a golden-set bake-off (plan R2). |
| Offline LLM fallback compared against a hard-coded string | Removed. When the LLM is unavailable the verdict is `REVIEW` + `degraded`, never a fabricated decision. |
| "Vectorize & Workers AI run locally" | They run only remotely (via `"remote": true` bindings) and consume real free-tier quota. Offline dev and CI use in-memory fakes. |
