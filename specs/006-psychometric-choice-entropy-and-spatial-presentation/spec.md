# Principal Engineering Specification: Psychometric Choice Entropy Normalization, Stratified Canonical Rebalancing & Spatial-Decoupled Presentation Engine

**Document ID**: `SPEC-006-PSYCHOMETRIC-CHOICE-ENTROPY-AND-SPATIAL-PRESENTATION`  
**Author**: Principal Software Engineer & Executive Architecture Board (Apple Platform Standards)  
**Status**: Architectural Specification & Implementation Plan  
**Target Stack**: TypeScript 5.7 (`strict: true`), React 19, Zustand 5, Dexie.js 4 (IndexedDB), Cloudflare Workers, Cloudflare D1 (SQLite)  
**Contracts Reference**: [choice-entropy-ports.ts](file:///Users/mac/Documents/Med%20Quests%20Apps/specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts)  
**Upstream Governance Reference**: [SPEC-005 Global Question Bank Governance](file:///Users/mac/Documents/Med%20Quests%20Apps/specs/005-global-question-bank-governance/spec.md)

---

## 1. Executive Summary & Root-Cause Forensic Analysis

### 1.1 Empirical Audit of the Canonical Question Bank (`content/cvs/dist/bank.v1.json`)

A statistical and psychometric audit of the 212 canonical Single-Best-Answer (SBA) questions in [`bank.v1.json`](file:///Users/mac/Documents/Med%20Quests%20Apps/content/cvs/dist/bank.v1.json) uncovered a severe positional bias toward choices `a` and `b`:

| Canonical Choice ID | Visual Slot Index | Observed Correct Count ($O_i$) | Expected Uniform Count ($E_i$) | Observed Proportion | Deviation from Uniform ($25\%$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **`a`** | `0` (Top Card) | **90** | $53.0$ | **$42.45\%$** | $+17.45\%$ |
| **`b`** | `1` (2nd Card) | **71** | $53.0$ | **$33.49\%$** | $+8.49\%$ |
| **`c`** | `2` (3rd Card) | **33** | $53.0$ | **$15.57\%$** | $-9.43\%$ |
| **`d`** | `3` (Bottom Card) | **18** | $53.0$ | **$8.49\%$** | $-16.51\%$ |
| **Total ($N$)** | — | **212** | **212.0** | **$100.00\%$** | — |

#### Statistical Proof of Psychometric Defect
1. **Combined `a` + `b` Dominance**:
   $$\frac{90 + 71}{212} = \frac{161}{212} \approx 75.94\%$$
   A test-taker blindly selecting `a` or `b` achieves ~**76% accuracy**—surpassing standard medical school and USMLE Step 1 passing thresholds without reading a single clinical vignette.
2. **Pearson's Chi-Squared ($\chi^2$) Goodness-of-Fit**:
   $$\chi^2 = \sum_{i \in \{a,b,c,d\}} \frac{(O_i - E_i)^2}{E_i} = \frac{(90-53)^2}{53} + \frac{(71-53)^2}{53} + \frac{(33-53)^2}{53} + \frac{(18-53)^2}{53} = 62.604$$
   With degrees of freedom $df = 3$, the critical threshold at $\alpha = 0.001$ is $\chi^2_{0.001} = 16.266$. Our observed $\chi^2 = 62.604$ yields $p < 1.6 \times 10^{-13}$, proving extreme non-random clustering.
3. **Shannon Entropy Deficit**:
   $$H(X) = -\sum_{i=1}^{4} p_i \log_2(p_i) \approx 1.773\text{ bits} \quad (\text{Normalized } H_{\text{norm}} = \frac{1.773}{2.000} = 0.886)$$

### 1.2 Architectural Root Causes Identified in the Codebase

1. **Root Cause 1 — Few-Shot Prompt Anchoring Bias in AI Authoring Templates**:
   - In [`questionAiPromptBuilder.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/questionBank/questionAiPromptBuilder.ts#L27-L80), `GOLD_STANDARD_EXAMPLE_QUESTION` hardcodes `"id": "a", "isCorrect": true`.
   - In [`QuestionStudio.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/studio/QuestionStudio.tsx#L88-L93), `generatePrompt()` hardcodes `"id": "b", "isCorrect": true`.
   - Neither prompt enforces a multi-item choice-distribution invariant, causing autoregressive LLMs and human authors following the template to place the correct answer in slot `a` (42.5%) or `b` (33.5%).
2. **Root Cause 2 — Absence of a Batch Entropy Quality Gate in `QuestionQualityGatePipeline`**:
   - [`qualityGatePipeline.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/questionBank/qualityGatePipeline.ts#L118-L177) validates item-level invariants (`ZodStructureQualityRule`, `SingleCorrectChoiceRule`, `ClinicalEvidenceGroundingRule`), but lacks a macro-level `IBatchQuestionQualityRule` to inspect choice entropy or auto-balance skewed batches before persistence.
3. **Root Cause 3 — Static Array Rendering & Hardcoded Keyboard Coupling in `SessionPlayer.tsx`**:
   - [`SessionPlayer.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/test/SessionPlayer.tsx#L592-L596) iterates directly over `currentQ.choices` in static array order.
   - [`SessionPlayer.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/test/SessionPlayer.tsx#L301-L304) hardcodes `e.key === '1'` $\rightarrow$ `'a'`, `'2'` $\rightarrow$ `'b'`, `'3'` $\rightarrow$ `'c'`, `'4'` $\rightarrow$ `'d'`. If choices are dynamically permuted per session to prevent positional memorization on repeat attempts, hardcoded keyboard bindings select the wrong visual card.
4. **Root Cause 4 — Existing Seeded D1 Rows Require Upsert Promotion**:
   - In [`src/worker/index.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/worker/index.ts#L2104-L2127), `ensureGlobalBankSeeded()` uses `INSERT OR IGNORE` only for missing IDs. Rebalancing existing `bank.v1.json` questions requires a deterministic canonical revision migration so connected D1 instances and student IndexedDB stores converge automatically via [`NonDestructiveBankMergeStrategy`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/questionBank/nonDestructiveMergeStrategy.ts).

---

## 2. SOLID Principles & Object-Oriented Design Patterns

### 2.1 Adherence to SOLID Principles

| Principle | Architectural Implementation in `SPEC-006` |
| :--- | :--- |
| **S — Single Responsibility Principle (SRP)** | Each domain class has a single responsibility: `ChoiceDistributionAnalyzer` computes $\chi^2$, Shannon entropy, and frequency distributions; `ChoicePermutationSafetySpecification` verifies that stems/explanations/rationales contain zero hardcoded letter references; `StratifiedCanonicalRebalancingStrategy` deterministically rebalances question banks to 1:1:1:1 across chapters; `SpatialChoicePresentationEngine` projects canonical choices into visual slots and resolves spatial keyboard events. |
| **O — Open/Closed Principle (OCP)** | Rebalancing algorithms implement [`IChoiceRebalancingStrategy`](file:///Users/mac/Documents/Med%20Quests%20Apps/specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts#L172-L185) (`StratifiedCanonicalRebalancingStrategy`, `RandomSeededRebalancingStrategy`). Presentation modes implement [`ISpatialChoicePresentationStrategy`](file:///Users/mac/Documents/Med%20Quests%20Apps/specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts#L191-L212) (`SessionSeededSpatialPresentationStrategy`, `CanonicalOrderPresentationStrategy`). New strategies plug in without modifying [`SessionPlayer.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/test/SessionPlayer.tsx) or [`QuestionQualityGatePipeline`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/questionBank/qualityGatePipeline.ts). |
| **L — Liskov Substitution Principle (LSP)** | Any implementation of `IDeterministicPrngPort` (`Mulberry32DeterministicPrng`) or `ISpatialChoicePresentationStrategy` honors strict purity, immutability, and bijective slot-to-choice invariants (`0..3` $\leftrightarrow$ `ChoiceId`), allowing seamless substitution in unit tests and production UI. |
| **I — Interface Segregation Principle (ISP)** | Contracts in [`choice-entropy-ports.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts) are segregated into narrow role-specific interfaces: `IDeterministicPrngPort`, `IChoicePermutationSafetySpecification`, `IChoiceRebalancingStrategy`, `ISpatialChoicePresentationStrategy`, and `IBatchQuestionQualityRule`. |
| **D — Dependency Inversion Principle (DIP)** | React components (`SessionPlayer`, `PostTestReport`, `QuestionStudio`) and Zustand stores (`useQuestionStore`) depend strictly on domain abstractions and pure value objects (`SpatialPresentedChoice`, `ChoiceDistributionMetrics`), never on ad-hoc index math or raw PRNG state. |

### 2.2 Gang of Four (GoF) & Domain-Driven Design (DDD) Patterns Applied

1. **Strategy Pattern**:
   - `IChoiceRebalancingStrategy` encapsulates the stratified round-robin / Fisher-Yates slot assignment algorithm used to rebalance canonical banks and Studio batches.
   - `ISpatialChoicePresentationStrategy` encapsulates how choices are ordered on screen (`SessionSeededSpatialPresentationStrategy` vs. `CanonicalOrderPresentationStrategy`).
2. **Specification Pattern**:
   - `ChoicePermutationSafetySpecification` extends [`CompositeSpecification<Question>`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/questionBank/questionSpecifications.ts#L16-L30) to verify that no question contains position-dependent text (e.g., `"Option A"`, `"Choice B"`, `"both A and B"`) before permuting choices.
3. **Value Object Pattern (Immutable DDD)**:
   - `ChoiceDistributionMetrics` and `SpatialPresentedChoice` are deeply immutable value objects with branded scalar types (`ChiSquaredStatistic`, `NormalizedShannonEntropy`, `DeterministicPrngSeed`).
4. **Adapter / View-Model Projector Pattern**:
   - `SpatialChoicePresentationEngine` adapts persistence-layer `Choice` objects (`id: 'a' | 'b' | 'c' | 'd'`) into UI-layer `SpatialPresentedChoice` view-models where `visualBadgeLetter` (`'A' | 'B' | 'C' | 'D'`) and `keyboardShortcutDigit` (`'1' | '2' | '3' | '4'`) always match the visual top-to-bottom card order, while answer grading, telemetry, and AI Copilot context continue to receive the canonical `ChoiceId`.
5. **Chain of Responsibility / Pipeline Pattern**:
   - Extends [`QuestionQualityGatePipeline`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/questionBank/qualityGatePipeline.ts#L118-L177) with item-level `NoHardcodedChoiceLetterReferenceRule` and batch-level `PsychometricChoiceEntropyBatchRule`.

---

## 3. Object-Oriented Domain Architecture (UML Class Diagram)

```mermaid
classDiagram
    class CompositeSpecification~T~ {
        <<abstract>>
        +isSatisfiedBy(candidate: T)* boolean
        +and(other: ISpecification~T~) ISpecification~T~
        +or(other: ISpecification~T~) ISpecification~T~
        +not() ISpecification~T~
    }

    class ChoicePermutationSafetySpecification {
        -readonly RegExp forbiddenPattern
        +isSatisfiedBy(question: Question) boolean
        +inspectViolations(question: Question) ChoiceEntropyDomainError[]
    }

    class IDeterministicPrngPort {
        <<interface>>
        +hashStringToSeed(seedInput: string) DeterministicPrngSeed
        +createGenerator(seed: DeterministicPrngSeed) Function
        +shuffle~T~(items: readonly T[], seedInput: string) readonly T[]
    }

    class Mulberry32DeterministicPrng {
        +hashStringToSeed(seedInput: string) DeterministicPrngSeed
        +createGenerator(seed: DeterministicPrngSeed) Function
        +shuffle~T~(items: readonly T[], seedInput: string) readonly T[]
    }

    class ChoiceDistributionAnalyzer {
        +analyze(questions: readonly Question[]) ChoiceDistributionMetrics
        +computeChiSquared(counts: ChoiceFrequencyMap, total: number) ChiSquaredStatistic
        +computeNormalizedEntropy(counts: ChoiceFrequencyMap, total: number) NormalizedShannonEntropy
    }

    class IChoiceRebalancingStrategy {
        <<interface>>
        +readonly string strategyId
        +rebalance~T extends Question~(questions: readonly T[], seedInput?: string) Result~BankRebalanceReport~T~, ChoiceEntropyDomainError~
    }

    class StratifiedCanonicalRebalancingStrategy {
        +readonly string strategyId
        -readonly IDeterministicPrngPort prng
        -readonly IChoicePermutationSafetySpecification safetySpec
        -readonly ChoiceDistributionAnalyzer analyzer
        +rebalance~T extends Question~(questions: readonly T[], seedInput?: string) Result~BankRebalanceReport~T~, ChoiceEntropyDomainError~
    }

    class ISpatialChoicePresentationStrategy {
        <<interface>>
        +readonly string mode
        +projectChoices(question: Question, sessionId: string) readonly SpatialPresentedChoice[]
        +resolveCanonicalChoiceIdBySlot(choices: readonly SpatialPresentedChoice[], slotIndex: VisualSlotIndex) ChoiceId
    }

    class SessionSeededSpatialPresentationStrategy {
        +readonly string mode
        -readonly IDeterministicPrngPort prng
        -readonly IChoicePermutationSafetySpecification safetySpec
        +projectChoices(question: Question, sessionId: string) readonly SpatialPresentedChoice[]
        +resolveCanonicalChoiceIdBySlot(choices: readonly SpatialPresentedChoice[], slotIndex: VisualSlotIndex) ChoiceId
    }

    CompositeSpecification <|-- ChoicePermutationSafetySpecification
    IDeterministicPrngPort <|.. Mulberry32DeterministicPrng
    IChoiceRebalancingStrategy <|.. StratifiedCanonicalRebalancingStrategy
    ISpatialChoicePresentationStrategy <|.. SessionSeededSpatialPresentationStrategy
    StratifiedCanonicalRebalancingStrategy --> IDeterministicPrngPort
    StratifiedCanonicalRebalancingStrategy --> ChoicePermutationSafetySpecification
    StratifiedCanonicalRebalancingStrategy --> ChoiceDistributionAnalyzer
    SessionSeededSpatialPresentationStrategy --> IDeterministicPrngPort
    SessionSeededSpatialPresentationStrategy --> ChoicePermutationSafetySpecification
```

---

## 4. Deep-Dive Technical Design of the 4 Architectural Pillars

### Pillar 1: Deterministic PRNG & Stratified Canonical Rebalancing (`src/domain/questionBank/choiceEntropyEngine.ts`)

Why **Stratified** Rebalancing instead of global naive shuffling?
If we only balance the bank globally ($53/53/53/53$ across 212 questions), a specific chapter (e.g., `cvs-ana-heart-dev` with 24 questions) could still accidentally end up with 12 `'a'`s and 2 `'d'`s when a student launches a Chapter-Specific Test!

Therefore, `StratifiedCanonicalRebalancingStrategy` partitions questions by `(subjectId, chapterId)` first, and assigns target slots (`'a'`, `'b'`, `'c'`, `'d'`) in a seeded, balanced round-robin cycle across every chapter while maintaining exact global parity:

1. **Safety Pre-Check (`ChoicePermutationSafetySpecification`)**:
   - Scans `stem`, `explanation`, `examTip`, `mnemonic`, and each choice's `rationale` against `/\b(?:option|choice|letter)\s+[a-d]\b|\b(?:all|both|none)\s+of\s+the\s+(?:above|below)\b/i`.
   - Verified on `bank.v1.json`: **0 violations across all 212 questions**.
2. **Stratified Slot Assignment**:
   - Groups questions by `chapterId` (preserving canonical ID ordering).
   - For each group, deals target slots from a balanced cycle `['a', 'b', 'c', 'd']` permuted deterministically via `Mulberry32DeterministicPrng` seeded with `(chapterId, seedInput)`.
   - Across all 212 questions in `bank.v1.json`, this guarantees:
     - **Global Distribution**: Exactly **53 `'a'`** ($25.0\%$), **53 `'b'`** ($25.0\%$), **53 `'c'`** ($25.0\%$), **53 `'d'`** ($25.0\%$).
     - **Global $\chi^2$**: **$0.000$** ($p = 1.000$).
     - **Normalized Shannon Entropy**: **$1.000$** ($2.000\text{ bits}$).
     - **Chapter-Level Balance**: Every single chapter has $\le 1$ count variance between choices `'a'`, `'b'`, `'c'`, and `'d'`.
3. **Canonical Choice Re-Keying**:
   - Within each question, the choices array is permuted so the single choice with `isCorrect: true` lands at `targetSlotIndex` (`0..3`), while the 3 distractors are deterministically shuffled via `Mulberry32DeterministicPrng` seeded with `question.id`.
   - Each choice at index `0..3` has its `id` cleanly re-keyed to `'a'`, `'b'`, `'c'`, `'d'`, keeping its own clinical `text` and `rationale` intact.

---

### Pillar 2: Session-Seeded Spatial Presentation & Keyboard Decoupling (`src/domain/questionBank/spatialChoicePresenter.ts` & `SessionPlayer.tsx`)

Even with a $25\% / 25\% / 25\% / 25\%$ canonical bank, a student who repeats a missed question 3 times should not answer by memorizing *"on the ASD question, the answer is the top box."*

`SessionSeededSpatialPresentationStrategy` solves this with zero visual jitter and full persistence compatibility:

```mermaid
sequenceDiagram
    participant User as Medical Scholar
    participant Player as SessionPlayer.tsx
    participant Presenter as SessionSeededSpatialPresentationStrategy
    participant Store as Persistence / Attempts / AI Copilot

    Player->>Presenter: projectChoices(currentQ, sessionId)
    Note over Presenter: Seed = FNV1a("${sessionId}:${currentQ.id}")<br/>Fisher-Yates shuffle of choices
    Presenter-->>Player: SpatialPresentedChoice[0..3]<br/>Slot 0: Badge 'A', Key '1' -> canonicalId: 'c'<br/>Slot 1: Badge 'B', Key '2' -> canonicalId: 'a'<br/>Slot 2: Badge 'C', Key '3' -> canonicalId: 'd'<br/>Slot 3: Badge 'D', Key '4' -> canonicalId: 'b'
    User->>Player: Presses Keyboard Key '2' (or taps 2nd card 'B')
    Player->>Presenter: resolveCanonicalChoiceIdBySlot(presentedChoices, 1)
    Presenter-->>Player: canonicalChoiceId = 'a'
    Player->>Store: handleSelectAnswer('a')<br/>Record Attempt & Telemetry with canonical 'a'
```

#### Key Architectural Invariants of Spatial Presentation:
1. **Intra-Session Determinism (Zero Layout Shift)**:
   - Because the seed is derived purely from `${sessionId}:${question.id}`, navigating Previous $\leftarrow$ and Next $\rightarrow$ within the same test session produces the **exact same visual choice order** in $O(1)$ time (`0 ms`), with zero React state mutation or layout flicker.
2. **Inter-Session Freshness**:
   - Starting a new practice or exam session generates a fresh `sessionId`, producing a new permutation so repeat practice tests genuine clinical comprehension rather than spatial muscle memory.
3. **Spatial Keyboard Consistency (Apple HIG Compliance)**:
   - Pressing `1`, `2`, `3`, or `4` invokes `resolveCanonicalChoiceIdBySlot(presentedChoices, slotIndex)` where `slotIndex = Number(e.key) - 1`.
   - Pressing `1` **always** selects the 1st card at the top of the screen (labeled `A`), regardless of whether its canonical ID in `bank.v1.json` is `'a'`, `'b'`, `'c'`, or `'d'`.
4. **Banner & Rationale Feedback Alignment**:
   - When an answer is committed in Practice Mode, the feedback banner in [`SessionPlayer.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/test/SessionPlayer.tsx#L718) (`Incorrect — Key is {key}`) displays the `visualBadgeLetter` (`A`, `B`, `C`, or `D`) of the correct `SpatialPresentedChoice` on screen, eliminating any mismatch between badge letters and banner text.

---

### Pillar 3: Quality Gate Pipeline & Studio Auto-Balancer (`src/domain/questionBank/qualityGatePipeline.ts` & `QuestionStudio.tsx`)

To prevent skewed batches from ever entering the local or global bank again:

1. **Item-Level Rule — `NoHardcodedChoiceLetterReferenceRule`**:
   - Added to `QuestionQualityGatePipeline`. Rejects questions whose `stem`, `explanation`, or `rationale` hardcode positional phrases like `"Option A is correct"` or `"All of the above"`, ensuring every question in the system is 100% safe for spatial shuffling.
2. **Batch-Level Analyzer & Auto-Rebalancer in `useQuestionStore.ingestQuestions()` & `submitQuestionsForGlobalReview()`**:
   - Whenever a user or faculty member ingests a JSON array of questions in `QuestionStudio` or `QuestionBankGovernancePanel`, the pipeline automatically runs `StratifiedCanonicalRebalancingStrategy` (or offers one-click auto-balancing) and displays a live **Psychometric Choice Entropy Telemetry Pill** (`A: 25% · B: 25% · C: 25% · D: 25% · Entropy: 1.00`).
3. **De-Biased AI Prompt Builder (`questionAiPromptBuilder.ts` & `QuestionStudio.tsx`)**:
   - Updates `QuestionAiPromptBuilder` and `QuestionStudio` prompts with explicit **Psychometric Choice Distribution Invariants**:
     - Instructs the LLM to distribute `isCorrect: true` uniformly across `'a'`, `'b'`, `'c'`, and `'d'` ($25\%$ each across the generated batch).
     - Prohibits positional references (`"All of the above"`, `"Both A and B"`).
     - Uses `'c'` in the 1-shot example and explicitly annotates that correct choices must cycle evenly across `'a'`, `'b'`, `'c'`, and `'d'`.

---

### Pillar 4: Non-Destructive Edge & Client Convergence (`src/worker/index.ts` & `useQuestionStore.ts`)

How do existing users and deployed Cloudflare D1 databases receive the rebalanced 212 canonical questions seamlessly?

1. **Canonical `bankVersion` Bump (`1` $\rightarrow$ `2`) in `content/cvs/dist/bank.v1.json`**:
   - Running the deterministic rebalance updates `content/cvs/dist/bank.v1.json` with balanced choices and increments `bankVersion: 2` on rebalanced items.
2. **Upsert Reconciliation in Worker Seed (`ensureGlobalBankSeeded` in `src/worker/index.ts`)**:
   - Currently, [`ensureGlobalBankSeeded`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/worker/index.ts#L2104-L2127) only inserts missing IDs (`INSERT OR IGNORE`).
   - We upgrade `ensureGlobalBankSeeded` so that if a bundled seed item has a higher `bankVersion` than the unedited seed row in D1 (`global_questions.bank_version < seeded.bankVersion` and `author_id = 'usr-curriculum-faculty'`), D1 atomically updates `choices_json`, `bank_version`, and increments `bank_revisions.revision_number`.
   - Any question manually edited by faculty (`bank_version > seeded.bankVersion` or custom `author_id`) is strictly preserved!
3. **Client IndexedDB Hydration & Non-Destructive Merge (`useQuestionStore.ts`)**:
   - In [`useQuestionStore.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/application/stores/useQuestionStore.ts#L120-L165), when `loadQuestions()` hydrates from IndexedDB, it reconciles bundled `seed-bundled` rows whose `bankVersion` in `defaultCvsBank` was upgraded (`v1` $\rightarrow$ `v2`), while preserving all `local-custom` questions, student `attempts`, `reviewCards`, `bookmarks`, and `notes`.

---

## 5. Step-by-Step Modular Implementation Plan

### Phase 1: Pure Domain Engine & Contracts (`src/domain/questionBank/`)
1. **Contracts**:
   - [`specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts) *(Completed)*
2. **Deterministic PRNG & Psychometric Choice Entropy Engine**:
   - Create `src/domain/questionBank/choiceEntropyEngine.ts`:
     - `Mulberry32DeterministicPrng` implementing `IDeterministicPrngPort` (FNV-1a string hashing + Mulberry32 PRNG + pure Fisher-Yates shuffle).
     - `ChoicePermutationSafetySpecification` extending `CompositeSpecification<Question>` and implementing `IChoicePermutationSafetySpecification`.
     - `ChoiceDistributionAnalyzer` computing `ChoiceDistributionMetrics` ($\chi^2$, $p$-value approximation, normalized Shannon entropy, dominant slot, combined A+B ratio, severity classification).
     - `StratifiedCanonicalRebalancingStrategy` implementing `IChoiceRebalancingStrategy` (stratified by `chapterId`, deterministic distractor ordering, canonical ID re-keying `'a'..'d'`).
3. **Spatial Choice Presentation Engine**:
   - Create `src/domain/questionBank/spatialChoicePresenter.ts`:
     - `SessionSeededSpatialPresentationStrategy` implementing `ISpatialChoicePresentationStrategy`.
     - `CanonicalOrderPresentationStrategy` implementing `ISpatialChoicePresentationStrategy`.
4. **Quality Gate & AI Prompt Hardening**:
   - Update [`src/domain/questionBank/qualityGatePipeline.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/questionBank/qualityGatePipeline.ts) to include `NoHardcodedChoiceLetterReferenceRule` and batch entropy reporting.
   - Update [`src/domain/questionBank/questionAiPromptBuilder.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/questionBank/questionAiPromptBuilder.ts) to enforce uniform choice distribution (`25%` A, B, C, D) and de-bias the 1-shot example.

### Phase 2: Canonical Bank Rebalancing & Edge D1 Reconciliation
5. **Rebalance `content/cvs/dist/bank.v1.json`**:
   - Execute `StratifiedCanonicalRebalancingStrategy` on `content/cvs/dist/bank.v1.json` with deterministic seed `'medquests-cvs-canonical-v2'`.
   - Verify exact `53 / 53 / 53 / 53` ($25.0\%$ each) distribution across all 212 questions and bump `bankVersion` to `2`.
6. **Upgrade Edge D1 Seed & Client Hydration**:
   - Update `ensureGlobalBankSeeded` in [`src/worker/index.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/worker/index.ts#L2101-L2160) to upgrade unedited `seed-bundled` rows when `seeded.bankVersion > db.bank_version`.
   - Update `loadQuestions` in [`src/application/stores/useQuestionStore.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/application/stores/useQuestionStore.ts) so local `seed-bundled` questions seamlessly upgrade to the rebalanced `bankVersion: 2` definitions on load, and auto-rebalance skewed batches during `ingestQuestions`.

### Phase 3: Spatial UI & Keyboard Integration (`src/ui/features/`)
7. **Upgrade `SessionPlayer.tsx`**:
   - Integrate `SessionSeededSpatialPresentationStrategy` in [`src/ui/features/test/SessionPlayer.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/test/SessionPlayer.tsx) using a stable per-session seed (`sessionId`).
   - Bind keyboard shortcuts `1`–`4` via `resolveCanonicalChoiceIdBySlot(presentedChoices, slotIndex)` so pressing `1`–`4` always selects visual cards `A`–`D` from top to bottom.
   - Render `choice.visualBadgeLetter` (`A`–`D`) on the card badges and in the practice feedback banner.
8. **Upgrade `QuestionStudio.tsx`**:
   - De-bias the inline `generatePrompt()` template in [`src/ui/features/studio/QuestionStudio.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/studio/QuestionStudio.tsx#L60-L115) and display live choice distribution telemetry in Studio.

### Phase 4: Verification & Automated Psychometric Regression Suite
9. **Comprehensive Vitest Suite (`src/domain/questionBank/__tests__/choiceEntropyAndSpatialPresentation.test.ts`)**:
   - **Test 1 (Canonical Bank Invariant Gate)**: Asserts `content/cvs/dist/bank.v1.json` has $\chi^2 < 1.0$, normalized Shannon entropy $\ge 0.99$, and exact $53/53/53/53$ counts across `'a'`, `'b'`, `'c'`, `'d'`.
   - **Test 2 (Chapter-Stratified Uniformity)**: Asserts every individual chapter in `bank.v1.json` has a balanced choice distribution without localized A/B clustering.
   - **Test 3 (Clinical Rationale & Answer Preservation)**: Proves that for all 212 questions, the exact same medical choice text that had `isCorrect: true` before rebalancing still has `isCorrect: true` and retains its exact `rationale`.
   - **Test 4 (Spatial Presentation & Keyboard Mapping)**: Verifies intra-session idempotence, inter-session permutation variance, and bijective mapping between keys `1`–`4`, badges `A`–`D`, and canonical `ChoiceId`s.
   - **Test 5 (Safety Specification Guard)**: Verifies detection of hardcoded `"Option A"` / `"All of the above"` strings.
   - Run full project test suite (`pnpm test`) and production typecheck/build (`pnpm build`) to guarantee zero regressions.
