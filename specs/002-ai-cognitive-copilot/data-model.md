# Data Model & Domain Schemas: AI Cognitive Co-Pilot (v2.0)

**Branch**: `002-ai-cognitive-copilot` | **Date**: 2026-10-24 | **Status**: Ready for Implementation

---

## 1. Architectural Overview

Version 2.0 eliminates the local hardcoded offline engine and all superficial UI fluff tools. Instead, it establishes a **Cloud-Native Multi-Provider Agentic Architecture** powered by:
1. **3 Cloud Providers**:
   - **OpenRouter (`openrouter`)**: Default lightweight provider with generous rate limits (default model: `meta-llama/llama-3.1-8b-instruct:free` or `google/gemma-3-12b-it:free`).
   - **Groq Cloud (`groq`)**: Ultra-low latency LPU inference (default model: `llama-3.3-70b-versatile`).
   - **Google Gemini (`gemini`)**: Deep clinical & multimodal reasoning (default model: `gemini-2.5-flash`).
2. **Dedicated OOP `SystemPromptBuilder`**: Dynamically compiles the medical faculty persona, active question context, exam integrity disclosure policy, and autonomous tool-calling protocol on every turn.
3. **Multi-Turn ReAct `AgenticOrchestrator`**: Executes up to 3 reasoning-action turns so when the LLM invokes silent background diagnostic tools (`analyze_active_question_vignette`, `inspect_student_cognitive_telemetry`, `detect_cognitive_bias_trap`), their structured JSON results are fed back into the LLM to synthesize a deeply personalized clinical response.
4. **9 High-Impact Agentic Tools**:
   - **Silent Background Diagnostics (A, B, C)**: Never clutter the user's screen; used autonomously by the agent.
   - **Clinical & Pathophysiological Modeling (D, E, F)**: Pressure-Volume (P-V) loop simulator, Peer Cohort trap analytics, and Cardiovascular physiological equation solver.
   - **Active Memory & Remediation (G, H, I)**: Spaced Repetition Flashcard synthesizer (persisted to `db.srsCards`), Clinical Mnemonic Anchor generator, and 3-Step Targeted Micro-Curriculum prescriber.

---

## 2. Provider & Settings Model (`src/domain/ai/settings.ts`)

```typescript
import { z } from 'zod';

export const CloudProviderIdSchema = z.enum(['openrouter', 'groq', 'gemini']);
export type CloudProviderId = z.infer<typeof CloudProviderIdSchema>;

export const AiSettingsSchema = z.object({
  id: z.literal('default'),
  activeProvider: CloudProviderIdSchema.default('openrouter'),
  openRouterApiKey: z.string().default(''),
  openRouterModel: z.string().default('meta-llama/llama-3.1-8b-instruct:free'),
  groqApiKey: z.string().default(''),
  groqModel: z.string().default('llama-3.3-70b-versatile'),
  geminiApiKey: z.string().default(''),
  geminiModel: z.string().default('gemini-2.5-flash'),
  updatedAt: z.number(),
});

export type AiSettings = z.infer<typeof AiSettingsSchema>;
```

### Automatic Provider Resolution Logic (`CloudEngineRegistry`)
1. If the user's selected `activeProvider` has a non-empty API key, instantiate that provider.
2. Otherwise, automatically inspect the remaining providers in priority order (`groq` → `gemini` → `openrouter`) and select the first provider that has a configured API key.
3. **Zero Auth Blocking**: Cloud BYO API keys are never blocked by guest/unauthenticated session state.

---

## 3. Live Cognitive Telemetry Tracker (`src/domain/ai/telemetry.ts`)

Tracks real-time behavioral signals while the student is solving an active question:

```typescript
import type { ChoiceId } from '../model/types.ts';

export interface ChoiceToggleRecord {
  readonly fromChoice: ChoiceId | null;
  readonly toChoice: ChoiceId;
  readonly timestampMs: number;
}

export interface ActiveQuestionTelemetrySnapshot {
  readonly questionId: string;
  readonly startedAtMs: number;
  readonly timeSpentSeconds: number;
  readonly choiceToggles: readonly ChoiceToggleRecord[];
  readonly stemRereadCount: number;
}
```

---

## 4. Tool Schemas & Domain Contracts (`src/domain/ai/tools.ts`)

### Category 1: Autonomous Background Tools (`visibility: 'silent'`)

| Tool Name | Input Schema (Zod) | Output Contract |
| :--- | :--- | :--- |
| **`analyze_active_question_vignette`** | `z.object({ focusChoiceId: ChoiceIdSchema.optional() })` | `AnalyzeVignetteResult` (`chiefComplaint`, `clinicalAcuteness`, `hemodynamicStatus`, `decisivePivotClues`, `distractorTrapMap`) |
| **`inspect_student_cognitive_telemetry`** | `z.object({ includeHistoricalTopicStats: z.boolean().optional() })` | `StudentTelemetryResult` (`timeSpentSeconds`, `choiceToggles`, `stemRereadCount`, `topicHistoricalAccuracy`, `recentMistakeStreak`) |
| **`detect_cognitive_bias_trap`** | `z.object({ candidateChoiceId: ChoiceIdSchema.optional(), studentReasoningSnippet: z.string().optional() })` | `CognitiveBiasTrapResult` (`detectedBias`, `biasLabel`, `clinicalTrigger`, `overlookedPivotClue`, `socraticCounterPrompt`) |

### Category 2: Clinical & Pathophysiological Modeling Tools (`visibility: 'artifact'`)

| Tool Name | Input Schema (Zod) | Output Contract |
| :--- | :--- | :--- |
| **`simulate_hemodynamic_pv_loop`** | `z.object({ pathology: z.enum(['aortic_stenosis', 'aortic_regurg', 'mitral_stenosis', 'mitral_regurg', 'hcm']), chronicity: z.enum(['acute', 'chronic_compensated', 'chronic_decompensated']) })` | `PvLoopSimulationResult` (`normalParams`, `pathologicParams`, `clinicalSummary`) |
| **`simulate_peer_cohort_difficulty`** | `z.object({ highlightChoiceId: ChoiceIdSchema.optional() })` | `PeerCohortDifficultyResult` (`overallAccuracyPct`, `choiceDistributionPct`, `topTrapChoiceId`, `peerTrapExplanation`) |
| **`calculate_cardiovascular_equation`** | Discriminated union over `equation`: `'map' \| 'fick_co' \| 'svr' \| 'gorlin_ava'` | `CardiovascularEquationResult` (`formulaExpression`, `substitutionSteps`, `computedValue`, `unit`, `referenceRange`, `hemodynamicInterpretation`) |

### Category 3: Active Memory & Adaptive Remediation Tools (`visibility: 'artifact'`)

| Tool Name | Input Schema (Zod) | Output Contract |
| :--- | :--- | :--- |
| **`create_spaced_repetition_anchor`** | `z.object({ frontPrompt: z.string(), backAnswer: z.string(), highYieldTopicId: z.string(), srsInitialIntervalDays: z.literal(1) })` | `SrsAnchorResult` (`cardId`, `frontPrompt`, `backAnswer`, `nextReviewAtIso`) |
| **`formulate_clinical_memory_anchor`** | `z.object({ conceptTitle: z.string(), mnemonicToken: z.string(), expansionMappings: z.array(z.object({ letter: z.string(), meaning: z.string() })), clinicalApplicationRule: z.string() })` | `MnemonicAnchorResult` |
| **`prescribe_targeted_micro_curriculum`** | `z.object({ targetWeaknessTitle: z.string(), twoMinuteMechanismReview: z.string(), drillQuestionCount: z.number().min(1).max(5).default(3), retestInHours: z.number().default(48) })` | `MicroCurriculumResult` (`selectedQuestionIds`, `retestScheduledAtIso`) |

---

## 5. IndexedDB Storage Schema (`src/infrastructure/storage/db.ts`)

Adds `srsCards` table to `MedQuestsDB` (version 3) for `create_spaced_repetition_anchor`:

```typescript
export interface SrsFlashcardRecord {
  readonly id: string;
  readonly questionId: string | null;
  readonly highYieldTopicId: string;
  readonly frontPrompt: string;
  readonly backAnswer: string;
  readonly intervalDays: number;
  readonly nextReviewAt: string; // ISO-8601 timestamp
  readonly createdAt: string;
}
```
