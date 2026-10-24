# Feature Specification: Apple-Grade Bilingual Platform (English & Arabic) & Chat-Scoped AI Language Engine

**Feature Branch**: `004-bilingual-i18n-ai-localization`  
**Created**: 2026-10-25  
**Status**: Ready for Review  
**Contracts**: [i18n-ai-language-ports.ts](file:///Users/mac/Documents/Med%20Quests%20Apps/specs/004-bilingual-i18n-ai-localization/contracts/i18n-ai-language-ports.ts) | **Plan**: [plan.md](file:///Users/mac/Documents/Med%20Quests%20Apps/specs/004-bilingual-i18n-ai-localization/plan.md)

---

## 1. Executive Summary & Architectural Philosophy

As a medical board preparation platform (USMLE / Cardiovascular Block 206), **Med Quests** serves learners who think and converse across both **English (`en`)** and **Arabic (`ar`)**, while preparing for international clinical board exams whose canonical terminology is in English.

Following **Apple Human Interface Guidelines (HIG) for Internationalization & Right-to-Left (RTL) Engineering**, **SOLID Principles**, and **Clean Architecture (Constitution P6–P10)**, this specification establishes a **Dual-Layer Bilingual Architecture**:

1. **Layer 1 — Platform UI Localization & Bi-Directional (LTR/RTL) Engine (`en` | `ar`)**:
   - Zero-dependency, compile-time type-safe localization engine (`< 3 KB` bundle footprint, `< 1 ms` lookup latency).
   - True CSS Logical Properties layout (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `border-s-*`, `text-start`) with zero layout shift (`CLS = 0`).
   - Adaptive Typography pairing **Plus Jakarta Sans / Inter** (`en`) with **IBM Plex Sans Arabic / SF Arabic / Cairo** (`ar`), automatically adjusting line-height and letter-spacing (`letter-spacing: 0` for Arabic script to preserve connected glyphs).
2. **Layer 2 — Chat-Scoped AI Co-Pilot Language Engine (`auto` | `en` | `ar`)**:
   - Persisted in `AiSettings` (`db.aiSettings` in IndexedDB) and exposed both in **Chatbot Settings (`CopilotSettingsModal.tsx`)** and as an instant pill switcher in the **AI Co-Pilot Drawer Header (`AiCopilotDrawer.tsx`)**.
   - **Strictly Scoped to the Chat Pipeline ("In The Chat Only")**:
     - Injected exclusively into `SystemPromptBuilder.withChatLanguageDirective(...)` and `AgenticOrchestrator` during conversational turns.
     - **Zero Tool Schema Contamination**: All 9 autonomous tool names (`analyze_active_question_vignette`, `simulate_hemodynamic_pv_loop`, `calculate_cardiovascular_equation`, etc.), JSON arguments, and enum identifiers remain 100% canonical English so LLM tool invocation never fails validation.
     - **Bilingual Medical Terminology Guardrail**: When responding in Arabic, the AI Co-Pilot teaches in fluent, authoritative Medical Arabic while preserving canonical USMLE English medical terms, hemodynamic abbreviations (`MAP`, `CO`, `SVR`, `EDV`, `ESV`, `P-V Loop`), and Option letters (`Option A–E`) in parentheses (`dir="ltr"` isolated) so the student retains board-exam precision.

---

## 2. User Scenarios & Acceptance Testing

### User Story 1 — Chatbot Settings & In-Chat Language Preference (`auto` | `en` | `ar`) (Priority: P1)

A medical student practicing USMLE Cardiovascular questions wants the **AI Cognitive Co-Pilot** to explain complex hemodynamic concepts in **Arabic** (or automatically match whichever language they type in the chat), even when the clinical question vignette itself remains in standard USMLE English. The student opens **Chatbot Settings (`CopilotSettingsModal`)**, selects their preferred **Co-Pilot Response Language** (`Auto-Detect`, `English`, or `العربية (Arabic)`), or toggles it directly from the Co-Pilot Drawer header.

**Why this priority**: Directly fulfills the core requirement to configure AI language preference in Chatbot Settings and inform the AI Agent *in the chat only* so it responds in the user's preferred language without breaking clinical exam fidelity.

**Acceptance Scenarios**:

1. **Given** the student opens `CopilotSettingsModal`, **When** they view the settings panel, **Then** they see a dedicated **"Co-Pilot Chat Language / لغة المحادثة"** segmented selector with three options:
   - **Auto-Detect (`auto`)**: Mirrors the language of each message typed by the user.
   - **English (`en`)**: Always responds in USMLE Clinical English.
   - **العربية (`ar`)**: Always responds in Medical Arabic (with canonical English medical terms in parentheses).
2. **Given** `chatLanguage` is set to `'ar'` in Chatbot Settings, **When** the student clicks a Quick Power Action (e.g., *"Why Right / لماذا الإجابة صحيحة"*) or types a question in English or Arabic, **Then** `SystemPromptBuilder` injects the Arabic Medical Faculty directive and the AI streams its explanation in fluent Arabic while keeping `Option A`, `Aortic Stenosis`, `MAP`, and P-V Loop parameters intact.
3. **Given** `chatLanguage` is set to `'auto'`, **When** the student types `"اشرح لي لماذا الخيار B خاطئ في هذه الحالة؟"`, **Then** `ScriptDirectionDetector` detects Arabic script (`> 30%` Arabic Unicode characters `\u0600-\u06FF`) in `< 0.1 ms` and instructs the AI Agent to respond in Arabic for that turn; if the next message is in English, the AI seamlessly responds in English.
4. **Given** the AI Agent invokes any of the 9 autonomous tools (e.g., `simulate_hemodynamic_pv_loop` or `calculate_cardiovascular_equation`) while in Arabic chat mode, **When** the tool call is emitted by the LLM, **Then** the tool arguments use canonical English enums (`lesion: "aortic_stenosis"`) and the resulting prose synthesis around the artifact card is streamed in Arabic.

---

### User Story 2 — Bi-Directional (`dir="auto"`) Chat Stream & Medical Formula Isolation (Priority: P1)

When the AI Co-Pilot streams Arabic text containing embedded English medical terms, physiological equations ($MAP = DBP + \frac{1}{3}(SBP - DBP)$), arrows (`→`), and markdown tables inside `CopilotMarkdownView.tsx`, the text must render with right-to-left paragraph flow, properly mirrored callout borders, and isolated left-to-right (`dir="ltr"`) mathematical/code tokens so parentheses and equations never invert or scramble.

**Why this priority**: Without BiDi isolation (`unicode-bidi: isolate`), mixing Arabic prose with English formulas like `CO = HR × SV` or `(Option B: Mitral Regurgitation)` causes visual punctuation inversion in WebKit/Blink browsers.

**Acceptance Scenarios**:

1. **Given** an assistant message or paragraph written in Arabic inside `AiCopilotDrawer`, **When** `CopilotMarkdownView` renders headings, bullet lists, blockquotes, tables, and medical callouts (`BOARD EXAM RULE` / `قاعدة الاختبار`), **Then** each block automatically resolves `dir="auto"` (or `dir="rtl"`), aligning bullets and accent bars to the inline-start (`right` in RTL, `left` in LTR).
2. **Given** inline code badges (`` `MAP = 93 mmHg` ``), hemodynamic equations, or latency badges (`145ms`), **When** rendered inside an Arabic paragraph, **Then** they are wrapped with `dir="ltr" className="inline-block"` so numbers, operators, and units always read left-to-right.
3. **Given** the student clicks a Power Action in English (`en`) and later switches Chat Language to Arabic (`ar`) on the same question, **When** `PowerActionCacheService` looks up the cached response in IndexedDB (`db.aiCache`), **Then** it uses a language-namespaced key (`${questionId}:${actionKey}:${resolvedLanguage}`) so English and Arabic cached responses never overwrite or serve the wrong language.

---

### User Story 3 — Apple-Caliber Bilingual Platform UI (`en` & `ar`) & Zero-Jank RTL Layout (Priority: P2)

A learner switches the platform UI language between **English (`en`)** and **العربية (`ar`)** via the top navigation bar or settings. The entire application shell (`Shell.tsx`), navigation pills, Co-Pilot drawer chrome, and workspace headers transition instantaneously (`< 16 ms`, single animation frame) between LTR and RTL using CSS Logical Properties and Arabic typography metrics.

**Why this priority**: Ensures a cohesive, first-party Apple OS feel across the platform while allowing independent or linked control of Platform UI language and AI Chat language.

**Acceptance Scenarios**:

1. **Given** any page on the platform, **When** the user toggles Platform Language to `العربية (ar)`, **Then** `document.documentElement` updates to `lang="ar" dir="rtl"`, Arabic typography (`letter-spacing: 0`, Arabic font stack) activates automatically via CSS `:root[dir="rtl"]`, and the selection persists in local storage (`mq_locale`).
2. **Given** the platform is in RTL mode (`dir="rtl"`), **When** directional icons (`ArrowRight`, `ChevronRight`, `Send`) render, **Then** they mirror horizontally (`rtl:-scale-x-100`), whereas medical diagrams (P-V Loops), checkmarks (`Check`), and logos remain un-mirrored.
3. **Given** a clinical question in `SessionPlayer.tsx` during USMLE practice, **When** the platform UI chrome is in Arabic, **Then** the USMLE clinical vignette and answer choices remain protected in canonical LTR clinical format (unless bilingual content is explicitly toggled) so board exam simulation integrity (Constitution P2 & P5) is 100% preserved.

---

## 3. Functional Requirements

### 3.1 Domain Layer (`src/domain/i18n/` & `src/domain/ai/`)
- **FR-001 (`AiSettingsSchema` Extension)**: Extend `AiSettingsSchema` in [`src/domain/ai/settings.ts`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/ai/settings.ts) with `chatLanguage: z.enum(['auto', 'en', 'ar']).default('auto')`, preserving backward-compatible Zod parsing for existing IndexedDB records.
- **FR-002 (`ScriptDirectionDetector`)**: Implement a pure, zero-dependency domain utility (`src/domain/i18n/scriptDetector.ts`) that inspects Unicode code points (`\u0600–\u06FF`, `\u0750–\u077F`, `\u08A0–\u08FF`) to classify any string's dominant language (`'ar' | 'en'`) and text direction (`'rtl' | 'ltr'`) in `< 0.1 ms`.
- **FR-003 (`ChatLanguageStrategy` & `SystemPromptBuilder`)**: Add `.withChatLanguageDirective(context: ResolvedChatLanguageContext)` to [`SystemPromptBuilder`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/ai/systemPromptBuilder.ts). This method must inject:
  - Explicit target language rules for the assistant's prose response (`English` vs `Modern Standard Medical Arabic`).
  - Strict instruction that **tool call names, JSON keys, and enum parameters MUST remain in English**.
  - Strict instruction that when responding in Arabic, **canonical English medical terms, option letters (`Option A–E`), and physiological acronyms (`MAP`, `SVR`, `CO`, `EDV`, `ESV`) MUST be included in parentheses** alongside their Arabic explanation.
- **FR-004 (`CopilotMarkdownView` BiDi Callout Recognition)**: Support both English and Arabic medical callout headers in [`CopilotMarkdownView.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/copilot/CopilotMarkdownView.tsx) (e.g., `BOARD EXAM RULE` / `قاعدة الاختبار`, `MEMORY ANCHOR` / `مرساة الذاكرة`, `DISTRACTOR TRAP` / `فخ الخيارات المضللة`, `CORE CONCEPT` / `المفهوم الأساسي`).
- **FR-005 (Language-Aware Power Action Caching)**: Update [`PowerActionCacheService`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/domain/ai/powerActionCacheService.ts) to namespace cache keys by resolved language (`${questionId}:${actionKey}:${resolvedLanguage}`), with backward compatibility for existing keys.

### 3.2 UI & Application Layer (`src/application/stores/` & `src/ui/`)
- **FR-006 (Chatbot Settings UI in `CopilotSettingsModal.tsx`)**: Add a prominent, Apple-styled **Chat Response Language (`Auto` / `English` / `العربية`)** selector inside [`CopilotSettingsModal.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/copilot/CopilotSettingsModal.tsx) and a quick-toggle badge inside the header of [`AiCopilotDrawer.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/copilot/AiCopilotDrawer.tsx).
- **FR-007 (Localized Power Actions & Starter Inquiries)**: Localize the Quick Power Action pills in [`QuickPowerActionsBar.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/copilot/QuickPowerActionsBar.tsx) and starter inquiry prompts in [`AiCopilotDrawer.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/features/copilot/AiCopilotDrawer.tsx) when Arabic chat language or Arabic UI locale is active.
- **FR-008 (Platform Locale Store & CSS Logical Properties)**: Provide `useLocaleStore.ts` (`en` | `ar`) with a header language toggle next to `ThemeToggle.tsx` in [`Shell.tsx`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/ui/app/Shell.tsx), and RTL typography/logical layout rules in [`src/index.css`](file:///Users/mac/Documents/Med%20Quests%20Apps/src/index.css).

---

## 4. Non-Functional & Quality Requirements (Apple Engineering Bar)

- **NFR-001 (Zero Third-Party Bloat)**: No heavy runtime i18n libraries (`i18next` + plugins add ~22 KB gzipped and async loading flicker). Use a zero-dependency, compile-time TypeScript dictionary + `Intl` formatter (`< 3 KB`).
- **NFR-002 (Arabic Typography Optimization)**: When `dir="rtl"` or Arabic text is rendered, disable negative Latin letter-spacing (`letter-spacing: 0 !important`), increase line-height by `+0.12` for Arabic diacritics/ascenders, and use high-legibility Arabic UI fonts (`'IBM Plex Sans Arabic', 'SF Arabic', 'Geeza Pro', 'Cairo', sans-serif`).
- **NFR-003 (Strict Type Safety & Test Coverage)**: Zero `any`, full compile-time key parity between `en` and `ar` dictionaries, and `≥ 90%` unit test coverage on `scriptDetector.ts`, `languagePolicy.ts`, `systemPromptBuilder.ts`, and `powerActionCacheService.ts`.
