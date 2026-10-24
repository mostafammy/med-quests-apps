# Feature Specification: Cloud-Native Agentic Co-Pilot & Autonomous Clinical Toolset (v2.0)

**Feature Branch**: `002-ai-cognitive-copilot`  
**Created**: 2026-10-24  
**Status**: Approved for Implementation  
**Contracts**: [ai-copilot-ports.ts](contracts/ai-copilot-ports.ts) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md)

---

## 1. Problem Statement & Root-Cause Diagnosis

1. **Why Cloud Keys Were Failing Previously**:
   - In `useCopilotStore.ts`, cloud streaming was gated behind `authState.status === 'authenticated-active' && Boolean(authState.entitlements.ai_cloud_streaming_quota)`. In standard local/guest study sessions, this condition evaluated to `false`, causing `resolveAiEngine()` to silently ignore the user's configured Groq or Google Gemini API key and fall back to a static offline script.
   - Furthermore, the cloud engines (`groqEngine.ts` and `geminiEngine.ts`) only executed a **single HTTP turn**. Whenever the model emitted a tool call (`tool_calls`), the stream ended without executing the tool and feeding its output back to the LLM to synthesize the final explanation.
2. **Why Prior Tools & UI Felt Superficial**:
   - The previous 11 tools were noisy UI gimmicks (manual text highlighters, static tables, capabilities popups, and cluttered quick-intent pill bars) rather than genuine clinical and cognitive instruments.

---

## 2. Core Architectural Goals (v2.0)

1. **Remove Offline Engine & Standardize on 3 Cloud Providers**:
   - Remove `OfflineTutorEngine` completely.
   - Support **OpenRouter (`openrouter`)** as the default high-limit lightweight model provider (`meta-llama/llama-3.1-8b-instruct:free`), alongside **Groq Cloud (`groq` — `llama-3.3-70b-versatile`)** and **Google Gemini (`gemini` — `gemini-2.5-flash`)**.
   - Any configured API key works immediately regardless of guest/authentication state.
2. **Authoritative `SystemPromptBuilder`**:
   - Every turn is governed by a structured, context-aware System Prompt compiled by `SystemPromptBuilder`, embedding the active cardiovascular question, learner mastery history, exam integrity disclosure state, and tool orchestration rules.
3. **Multi-Turn ReAct `AgenticOrchestrator`**:
   - Supports multi-turn tool calling: Model invokes background diagnostic tools → Orchestrator executes them silently → Orchestrator sends structured JSON tool results back to the Model → Model streams a deeply grounded Socratic or pathophysiological response.
4. **Minimalist, High-Craft Clinical UI**:
   - Strip away all UI fluff (no capabilities modal, no quick-intent pill clutter, no raw tool-receipt badges for background diagnostics).
   - Keep the chat stream clean, fast, and focused, rendering sleek inline clinical visualizations only when modeling or memory tools are invoked.

---

## 3. Functional Requirements: The 9 Agentic Tools (A–I)

### Category 1: Autonomous Background Tools (Invisible to User)

*The user never sees raw tool cards for these; the Agent invokes them autonomously to build situational awareness.*

- **FR-A (`analyze_active_question_vignette`)**:
  - Deconstructs the active clinical vignette into a structured diagnostic graph (`chiefComplaint`, `clinicalAcuteness`, `hemodynamicStatus`, `decisivePivotClues`, `distractorTrapMap`).
  - Autonomously triggered whenever the student asks for help, hints, or rationale.
- **FR-B (`inspect_student_cognitive_telemetry`)**:
  - Reads live behavioral signals from `QuestionTelemetryTracker` (`timeSpentSeconds`, `choiceToggles`, `stemRereadCount`, `topicHistoricalAccuracy`, `recentMistakeStreak`).
  - Autonomously triggered when the student is stuck, hesitating, or switching between choices.
- **FR-C (`detect_cognitive_bias_trap`)**:
  - Evaluates the student's selected/candidate option against the vignette to identify classic diagnostic pitfalls:
    - **Anchoring Bias**: Fixating on an initial symptom while ignoring a contradictory finding.
    - **Premature Closure**: Selecting the first plausible diagnosis without ruling out mimics.
    - **Availability Heuristic**: Choosing a recently seen pathology despite demographic/clinical mismatch.
    - **Framing Effect**: Being misled by presentation framing.

### Category 2: Clinical & Pathophysiological Modeling Tools

- **FR-D (`simulate_hemodynamic_pv_loop`)**:
  - Dynamically simulates and renders cardiac Pressure-Volume (P-V) loops for `aortic_stenosis`, `aortic_regurg`, `mitral_stenosis`, `mitral_regurg`, and `hcm` across `acute`, `chronic_compensated`, and `chronic_decompensated` states.
  - Renders a clean interactive SVG comparing the normal P-V loop against the pathological loop (preload, afterload, stroke volume, ESV, EDV).
- **FR-E (`simulate_peer_cohort_difficulty`)**:
  - Computes and displays peer cohort trap statistics for the active question (percentage of students selecting each choice and why the #1 distractor traps learners).
- **FR-F (`calculate_cardiovascular_equation`)**:
  - Autonomously computes and formats clinical calculations with step-by-step variable substitution:
    - Mean Arterial Pressure: $MAP = DBP + \frac{1}{3}(SBP - DBP)$
    - Cardiac Output (Fick Principle): $CO = \frac{VO_2}{C_aO_2 - C_vO_2}$
    - Systemic Vascular Resistance: $SVR = 80 \times \frac{MAP - CVP}{CO}$
    - Gorlin Aortic/Mitral Valve Area: $AVA = \frac{CO}{44.3 \times HR \times SEP \times \sqrt{\Delta P}}$

### Category 3: Active Memory & Adaptive Remediation Tools

- **FR-G (`create_spaced_repetition_anchor`)**:
  - Compiles an active-recall flashcard (`frontPrompt`, `backAnswer`, `highYieldTopicId`, `srsInitialIntervalDays: 1`) and saves it directly into IndexedDB (`db.srsCards`).
- **FR-H (`formulate_clinical_memory_anchor`)**:
  - Synthesizes a structured clinical mnemonic hook anchored to the specific pathophysiology tested.
- **FR-I (`prescribe_targeted_micro_curriculum`)**:
  - Prescribes a 3-step remediation plan when a blind spot is identified:
    1. 2-minute review of the core pathophysiological mechanism.
    2. 3 targeted board-style drill questions selected from the verified question bank.
    3. Scheduled 48-hour Spaced Repetition re-test.

---

## 4. Success Criteria

- **SC-001 (Provider Reliability)**: Entering a valid OpenRouter, Groq, or Google Gemini API key immediately enables real multi-turn cloud streaming with zero interference from guest authentication state.
- **SC-002 (Silent Background Intelligence)**: Tools A, B, and C execute in `< 15ms` locally, feed structured diagnostic JSON back to the LLM in Turn 1, and produce zero visual clutter in the chat stream.
- **SC-003 (Mathematical & Physiological Precision)**: Tool D (`simulate_hemodynamic_pv_loop`) and Tool F (`calculate_cardiovascular_equation`) produce 100% deterministic, physiologically accurate values verified by unit tests.
- **SC-004 (Type Safety)**: Zero `any` types across all domain, provider, and tool modules; passes `tsc -b && vite build` and `vitest run` cleanly.
