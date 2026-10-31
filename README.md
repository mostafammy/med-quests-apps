# Med Quests Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2.7-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20Hexagonal-orange)](#system-architecture)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

A high-performance, local-first medical exam preparation platform engineered for medical students tackling high-stakes university block exams and USMLE Step 1/Step 2 board certifications. 

Engineered with **Apple Human Interface Guidelines (HIG)** aesthetic fidelity, strict **SOLID Principles**, **Clean / Hexagonal Architecture**, and an intelligent **Bilingual (English & Arabic) AI Agentic Copilot** with runtime tool isolation and BiDi script detection.

---

## Table of Contents

1. [Product Vision & Medical Exam Fidelity](#product-vision--medical-exam-fidelity)
2. [System Architecture & Hexagonal Boundaries](#system-architecture--hexagonal-boundaries)
3. [Deep Dive: Bilingual Architecture & Chat-Scoped AI Localization](#deep-dive-bilingual-architecture--chat-scoped-ai-localization)
   - [The Core Challenge: "In The Chat Only" Isolation](#1-the-core-challenge-in-the-chat-only-isolation)
   - [SOLID Principles Engineering Realization](#2-solid-principles-engineering-realization)
   - [Gang of Four (GoF) Design Patterns](#3-gang-of-four-gof-design-patterns)
   - [Architectural Topology & Dataflow (Diagram)](#4-architectural-topology--dataflow)
   - [Class Hierarchy & Port Contracts (Diagram)](#5-class-hierarchy--port-contracts)
   - [Chat-Scoped Agentic Turn Sequence (Diagram)](#6-chat-scoped-agentic-turn-sequence)
   - [BiDi Presentation & Arabic Typography Rules](#7-bidi-presentation--arabic-typography-rules)
4. [Deep Dive: Distributed Global Question Bank, Delta Sync & Editorial Governance (SPEC-005)](#deep-dive-distributed-global-question-bank-delta-sync--editorial-governance-spec-005)
   - [The Core Challenge: Scaling Isolated IndexedDB to Global Cohorts](#1-the-core-challenge-scaling-isolated-indexeddb-to-global-cohorts)
   - [The Four Decoupled Data Streams (Diagram)](#2-the-four-decoupled-data-streams)
   - [Deterministic Clinical Quality Gate Pipeline (Diagram)](#21-deterministic-clinical-quality-gate-pipeline)
   - [SOLID Principles & Software Engineering Patterns](#3-solid-principles--software-engineering-patterns)
   - [Question Editorial Lifecycle State Machine (Diagram)](#31-question-editorial-lifecycle-state-machine-state-pattern)
   - [System Topology & Edge Cloud Infrastructure (Diagram)](#4-system-topology--edge-cloud-infrastructure)
   - [Class Hierarchy & Domain Contracts (Diagram)](#5-class-hierarchy--domain-contracts)
   - [Non-Destructive Downstream Delta-Sync Protocol (Diagram)](#6-non-destructive-downstream-delta-sync-protocol)
   - [Conflict-Free Downstream Merge & Semantic Deduplication Decision Tree (Diagram)](#61-conflict-free-downstream-merge--semantic-deduplication-decision-tree)
   - [When Exactly Do Other Users Sync? Lifecycle Triggers & 5-Minute Stale Cache Resolution (Diagram)](#62-when-exactly-do-other-users-sync-lifecycle-triggers--5-minute-stale-cache-resolution)
   - [Author Ingest vs. Faculty Review Workflow Sequence (Diagram)](#7-author-ingest-vs-faculty-review-workflow-sequence)
   - [Role-Based Access Control (RBAC) & Governance Cockpit (Diagram)](#8-role-based-access-control-rbac--governance-cockpit)
5. [Deep Dive: Multi-Model AI Agentic Copilot, Real-Time Thinking & Two-Tier Telemetry](#deep-dive-multi-model-ai-agentic-copilot-real-time-thinking--two-tier-telemetry)
   - [Multi-Model Inference & Simple-Terms Model Catalog](#1-multi-model-inference--simple-terms-model-catalog)
   - [Fallback Routing & Rate-Limit Resilience](#2-fallback-routing--rate-limit-resilience)
   - [Real-Time Chain-of-Thought Stream Filter (ThinkTagStreamFilter)](#3-real-time-chain-of-thought-stream-filter-thinktagstreamfilter)
   - [Collapsible Reasoning Accordion UI](#4-collapsible-reasoning-accordion-ui)
   - [Two-Tier Generation Telemetry Architecture (Memory Staging → IndexedDB v6)](#5-two-tier-generation-telemetry-architecture-memory-staging--indexeddb-v6)
   - [Model Benchmark Insights Cockpit & Speed Leaderboard](#6-model-benchmark-insights-cockpit--speed-leaderboard)
   - [Quick Power Actions with Namespaced 0ms Caching](#7-quick-power-actions-with-namespaced-0ms-caching)
   - [Rich Clinical Markdown, Tables & KaTeX Equations](#8-rich-clinical-markdown-tables--katex-equations)
   - [Pedagogical Anti-Refusal Policy & Direct Socratic Guidance](#9-pedagogical-anti-refusal-policy--direct-socratic-guidance)
6. [Deep Dive: Continuous Question Bank Mastery, Anti-Repetition Engine & Liquid Progress](#deep-dive-continuous-question-bank-mastery-anti-repetition-engine--liquid-progress)
   - [The Core Challenge: Eradicating Duplicate Fatigue in Longitudinal Study](#1-the-core-challenge-eradicating-duplicate-fatigue-in-longitudinal-study)
   - [Progressive Solving Lifecycle Dataflow (Diagram)](#2-progressive-solving-lifecycle-dataflow)
   - [SOLID Realization & Mathematical Scope Calculation](#3-solid-realization--mathematical-scope-calculation)
   - [Liquid Glassmorphic Mastery UI & Tri-Color Progress Bar](#4-liquid-glassmorphic-mastery-ui--tri-color-progress-bar)
   - [Deterministic Pool Slicing & Execution Safety in SessionPlayer](#5-deterministic-pool-slicing--execution-safety-in-sessionplayer)
7. [Deep Dive: Edge Identity Lockdown & Primary Communication Channel (Cloudflare D1 + Google OAuth)](#deep-dive-edge-identity-lockdown--primary-communication-channel-cloudflare-d1--google-oauth)
   - [Production Security Gating & High-Conversion Funnel](#1-production-security-gating--high-conversion-funnel)
   - [Edge Identity & Phone Number Ingestion Topology (Diagram)](#2-edge-identity--phone-number-ingestion-topology)
   - [Cloudflare D1 Schema & Edge API Implementation](#3-cloudflare-d1-schema--edge-api-implementation)
   - [Authoritative Super Admin Boundary](#4-authoritative-super-admin-boundary)
8. [Deep Dive: Psychometric Choice Entropy, Stratified Canonical Rebalancing & Spatial-Decoupled Presentation Engine (SPEC-006)](#deep-dive-psychometric-choice-entropy-stratified-canonical-rebalancing--spatial-decoupled-presentation-engine-spec-006)
   - [The Core Defect: Uncovering the 76% A+B Positional Bias](#1-the-core-defect-uncovering-the-76-ab-positional-bias)
   - [The Three Root Causes Forensics](#2-the-three-root-causes-forensics)
   - [SOLID Principles & Clean Architecture Realization](#3-solid-principles--clean-architecture-realization)
   - [Stratified Canonical Rebalancing Strategy (Diagram)](#4-stratified-canonical-rebalancing-strategy)
   - [Session-Seeded Spatial Presentation & Keyboard Decoupling (Diagram)](#5-session-seeded-spatial-presentation--keyboard-decoupling)
   - [Continuous Quality Gate & Studio Auto-Balancer Pipeline (Diagram)](#6-continuous-quality-gate--studio-auto-balancer-pipeline)
   - [Edge D1 Seed & IndexedDB Non-Destructive Upgrade Flow (Diagram)](#7-edge-d1-seed--indexeddb-non-destructive-upgrade-flow)
   - [Mathematical & Psychometric Proof of Uniformity](#8-mathematical--psychometric-proof-of-uniformity)
9. [Local-First Persistence & Storage Topology](#local-first-persistence--storage-topology)
10. [Repository Structure](#repository-structure)
11. [Quality Engineering & Verification Matrix](#quality-engineering--verification-matrix)
12. [Getting Started](#getting-started)
13. [Normative Specification & Documentation](#normative-specification--documentation)

---

## Product Vision & Medical Exam Fidelity

Medical board exams (USMLE Step 1/Step 2, IFOM, university block systems) test diagnostic acumen, pathophysiological causal chains, and rapid clinical decision-making. 

```
TEST → ANSWER → IMMEDIATE RESULT → UNDERSTAND MISTAKE → IDENTIFY WEAKNESS → REVIEW CURRICULUM → RETEST
```

- **Zero-Friction Ergonomics:** Spatial keyboard navigation (`1–5` for single-strike answer submission, `←`/`→` for navigation, `↑`/`↓` for option scrolling), rendering immediate sub-50ms feedback.
- **Cognitive Remediation:** Rather than simple answer reveals, the system orchestrates Socratic dialogue, Hemodynamic Pressure-Volume (P-V) loop simulations, and memory anchor contrast cards.
- **USMLE Linguistic Fidelity:** Clinical entities (e.g., *Aortic Stenosis*, *Pulsus parvus et tardus*, *MAP*, *Option A*) preserve canonical English nomenclature even during Arabic Socratic debriefs to ensure board exam readiness.

---

## System Architecture & Hexagonal Boundaries

The application is structured under strict **Clean / Hexagonal Architecture (Ports and Adapters)** to decouple medical domain algorithms from UI chrome and LLM infrastructure.

```mermaid
graph TB
    subgraph Presentation_Layer ["Presentation Layer (React 19 + Tailwind v4 + Apple HIG)"]
        UI_Shell["Shell & Header (LocaleToggle, Theme)"]
        UI_Session["Session Player (Keyboard Engine, Vignettes)"]
        UI_Copilot["AI Copilot Drawer (BiDi Chat, Markdown)"]
        UI_Settings["CopilotSettingsModal (Segmented Cards)"]
        UI_Report["Post-Test Report & Psychometrics"]
    end

    subgraph Application_Layer ["Application Layer (Zustand State Mesh)"]
        Store_Locale["useLocaleStore (UI Platform Locale)"]
        Store_AiSettings["useAiSettingsStore (Chat Language & API Keys)"]
        Store_Copilot["useCopilotStore (Turn Dispatcher & Event Stream)"]
        Store_Session["useSessionStore (Question State & Telemetry)"]
    end

    subgraph Domain_Layer ["Pure Domain Layer (Zero External Dependencies)"]
        Domain_i18n["i18n Types & Translation Dictionaries (en, ar)"]
        Domain_Script["ScriptDetector (Unicode BiDi Engine)"]
        Domain_Policy["ChatLanguagePolicy (Strategy & Directive Builder)"]
        Domain_Prompt["SystemPromptBuilder (Fluent Prompt Builder)"]
        Domain_Power["PowerActions & Bilingual Clinical Prompts"]
        Domain_Cache["PowerActionCacheService (Namespaced Storage)"]
        Domain_Tools["Clinical Tool Definitions (Zod Schemas)"]
    end

    subgraph Infrastructure_Layer ["Infrastructure & Gateway Layer"]
        Infra_Orch["AgenticOrchestrator (Multi-Provider Stream)"]
        Infra_Engines["EngineRegistry (Groq, Gemini, OpenRouter)"]
        Infra_Storage["IndexedDB Gateway (Dexie.js: Sessions, Cache)"]
        Infra_Sim["Hemodynamic Simulation Engine (P-V Loops)"]
    end

    Presentation_Layer --> Application_Layer
    Application_Layer --> Domain_Layer
    Infrastructure_Layer --> Domain_Layer
    Application_Layer --> Infrastructure_Layer
```

---

## Deep Dive: Bilingual Architecture & Chat-Scoped AI Localization

### 1. The Core Challenge: "In The Chat Only" Isolation

In high-stakes clinical education, naive whole-app translation breaks clinical fidelity. Medical students frequently require **an English USMLE vignette accompanied by an Arabic Socratic tutor**, or vice versa. 

Furthermore, LLM function calling creates an acute engineering hazard:
- **Machine Contract vs Human Prose:** Function-calling tools (`simulate_hemodynamic_pv_loop`, `calculate_cardiovascular_equation`) require exact ASCII string keys and JSON schemas. Injecting language directives into the tool declarations causes LLMs to translate parameter names into Arabic (e.g., `{"lesion": "aortic_stenosis"}` becomes `{"الآفة": "تضيق_الأبهر"}`), silently failing JSON schema validation.
- **The Solution:** The AI Agent is made bilingual **strictly within the chat conversational orchestration pipeline**. The UI platform chrome and the AI conversation maintain independent, decoupled state lifecycles.

---

### 2. SOLID Principles Engineering Realization

| Principle | Architectural Implementation | Code Reference |
| :--- | :--- | :--- |
| **S — Single Responsibility (SRP)** | Segregated Unicode script analysis (`ScriptDetector`), language policy resolution (`ChatLanguagePolicy`), UI state (`useLocaleStore`), and namespaced caching (`PowerActionCacheService`). | [`scriptDetector.ts`](src/domain/i18n/scriptDetector.ts)<br>[`languagePolicy.ts`](src/domain/ai/languagePolicy.ts) |
| **O — Open/Closed (OCP)** | `SystemPromptBuilder` is extended via `.withChatLanguageDirective(ctx)` without altering core prompt logic. New languages are added by registering dictionaries satisfying `TranslationDictionary` without UI refactoring. | [`systemPromptBuilder.ts`](src/domain/ai/systemPromptBuilder.ts) |
| **L — Liskov Substitution (LSP)** | `enDictionary` and `arDictionary` implement the identical compile-time TypeScript interface `TranslationDictionary`. Any omitted translation key triggers a compilation error (`tsc -b`). | [`dictionaries/en.ts`](src/domain/i18n/dictionaries/en.ts)<br>[`dictionaries/ar.ts`](src/domain/i18n/dictionaries/ar.ts) |
| **I — Interface Segregation (ISP)** | UI chrome consumes `PlatformLocale` (`'en' \| 'ar'`) and `useDirection()`, while AI chat consumes `AiChatLanguagePreference` (`'auto' \| 'en' \| 'ar'`). Components only depend on the interfaces they require. | [`types.ts`](src/domain/i18n/types.ts) |
| **D — Dependency Inversion (DIP)** | High-level orchestrators (`AgenticOrchestrator`) depend upon pure domain contracts (`ResolvedChatLanguageContext`) rather than concrete UI state or browser globals (`navigator.language`). | [`agenticOrchestrator.ts`](src/infrastructure/ai/agenticOrchestrator.ts) |

---

### 3. Gang of Four (GoF) Design Patterns

1. **Strategy Pattern (`ChatLanguagePolicy`)**:
   - `AutoDetectLanguageStrategy`: Computes Arabic Unicode script ratio (`\u0600-\u06FF`). If script density $\ge 25\%$, dynamically resolves turn language to `'ar'`; otherwise defaults to `'en'`.
   - `ExplicitArabicStrategy` / `ExplicitEnglishStrategy`: Enforces deterministic output regardless of user message language.
2. **Builder Pattern (`SystemPromptBuilder`)**:
   - Stepwise fluent assembly of role personas, active telemetry, tool calling rules, and the isolated `CHAT LANGUAGE & BILINGUAL MEDICAL TERMINOLOGY DIRECTIVE`.
3. **Namespaced Flyweight Cache Pattern (`PowerActionCacheService`)**:
   - Partitions cached Socratic answers by question ID, action key, and resolved language:
     $$\text{CacheKey} = \text{questionId} : \text{actionKey} : \text{lang}$$
   - Precludes cross-lingual cache poisoning when toggling between English and Arabic.
4. **Adapter Pattern (`DomDirectionAdapter`)**:
   - Instantaneous synchronous synchronization of `<html dir="ltr|rtl" lang="en|ar">` and font variables to eliminate Flash of Unstyled Content (FOUC).

---

### 4. Architectural Topology & Dataflow

```mermaid
flowchart TD
    subgraph UI_Presentation ["Presentation Layer (Apple Glassmorphism)"]
        User(["Medical Student"])
        Toggle["LocaleToggle (Header)"]
        Modal["CopilotSettingsModal (Apple Segmented Cards)"]
        Pill["Drawer Quick-Pill (AUTO / EN / ع)"]
        ChatInput["BiDi Chat Input (dir='auto')"]
        MarkdownView["CopilotMarkdownView (Dynamic BiDi Blocks)"]
    end

    subgraph State_Mesh ["Application Stores"]
        LocaleStore["useLocaleStore<br>• locale: 'en' | 'ar'<br>• dir: 'ltr' | 'rtl'"]
        AiSettingsStore["useAiSettingsStore<br>• chatLanguage: 'auto' | 'en' | 'ar'"]
        CopilotStore["useCopilotStore<br>• Event Stream & Cache Dispatcher"]
    end

    subgraph Pure_Domain ["Domain Layer (Ports & Policies)"]
        Detector["ScriptDetector<br>• Unicode code points (0x0600 - 0x06FF)<br>• Ratio analysis & dominant script"]
        Policy["ChatLanguagePolicy<br>• resolveChatLanguageContext()<br>• buildChatLanguageDirective()"]
        PromptGen["SystemPromptBuilder<br>• withChatLanguageDirective()"]
        CacheSvc["PowerActionCacheService<br>• ${qid}:${action}:${lang}"]
    end

    subgraph Infrastructure ["Execution & LLM Infrastructure"]
        Orchestrator["AgenticOrchestrator<br>• Multi-turn streaming gateway"]
        CloudLLM["Cloud LLM Engine<br>• Groq / Gemini / OpenRouter"]
        ToolsReg["Clinical Tool Registry<br>• STRICT English JSON Schemas"]
    end

    User -->|Toggle UI Language| Toggle
    Toggle -->|Syncs| LocaleStore
    LocaleStore -->|Sets DOM Attributes| HTML["&lt;html dir='...' lang='...'&gt;"]

    User -->|Set Chat Preference| Modal
    User -->|Quick Switch| Pill
    Modal -->|Persists| AiSettingsStore
    Pill -->|Updates| AiSettingsStore

    User -->|Submits Message / Power Action| ChatInput
    ChatInput -->|Dispatches| CopilotStore
    CopilotStore -->|Fetches Settings| AiSettingsStore
    CopilotStore -->|Inspects Text| Detector
    CopilotStore -->|Resolves Context| Policy
    Policy -->|Builds Directive| PromptGen

    CopilotStore -->|Checks Cached Responses| CacheSvc
    CacheSvc -.->|Hit 0ms| MarkdownView

    CopilotStore -->|Executes Agent Turn| Orchestrator
    PromptGen -->|Injects System Directive| Orchestrator
    ToolsReg -->|Injects Canonical Tool Schemas| Orchestrator

    Orchestrator -->|Streams Prompt + Tool Specs| CloudLLM
    CloudLLM -->|Invokes Tool with English Args| Orchestrator
    Orchestrator -->|Executes Clinical Tool| ToolsReg
    ToolsReg -->|Returns Simulation Result| Orchestrator
    Orchestrator -->|Sends Result to LLM| CloudLLM
    CloudLLM -->|Streams Localized Socratic Prose| Orchestrator
    Orchestrator -->|Yields Deltas| CopilotStore
    CopilotStore -->|Renders Blocks with BiDi Isolation| MarkdownView
```

---

### 5. Class Hierarchy & Port Contracts

```mermaid
classDiagram
    class PlatformLocale {
        <<enumeration>>
        en
        ar
    }

    class AiChatLanguagePreference {
        <<enumeration>>
        auto
        en
        ar
    }

    class ResolvedChatLanguageContext {
        +PlatformLocale resolvedLanguage
        +Direction direction
        +boolean isRtl
        +boolean preserveEnglishMedicalTerms
        +string confidenceReason
    }

    class ScriptDetector {
        +containsArabic(text: string) boolean
        +detectDominantLanguage(text: string) PlatformLocale
        +detectTextDirection(text: string) Direction
        +detectScriptComposition(text: string) ScriptComposition
    }

    class ChatLanguagePolicy {
        +resolveChatLanguageContext(pref: AiChatLanguagePreference, messageText: string, platformLocale: PlatformLocale) ResolvedChatLanguageContext
        +buildChatLanguageDirective(context: ResolvedChatLanguageContext) string
    }

    class SystemPromptBuilder {
        -string[] sections
        +withRolePersona() this
        +withSafeContext(context) this
        +withTelemetrySnapshot(telemetry) this
        +withToolProtocols(tools) this
        +withChatLanguageDirective(ctx: ResolvedChatLanguageContext) this
        +build() string
    }

    class PowerActionCacheService {
        +buildCacheKey(questionId: string, actionKey: string, lang: PlatformLocale) string
        +get(questionId: string, actionKey: string, lang: PlatformLocale) Promise~CacheEntry~
        +set(questionId: string, actionKey: string, lang: PlatformLocale, entry: CacheEntry) Promise~void~
    }

    class AgenticOrchestrator {
        +runAgentTurn(request: OrchestrationRequest) AsyncIterable~AgentEvent~
    }

    ChatLanguagePolicy ..> ScriptDetector : delegates Unicode inspection
    ChatLanguagePolicy ..> ResolvedChatLanguageContext : produces
    SystemPromptBuilder ..> ResolvedChatLanguageContext : consumes
    AgenticOrchestrator ..> SystemPromptBuilder : assembles prompt
    AgenticOrchestrator ..> ChatLanguagePolicy : resolves turn language
    PowerActionCacheService ..> PlatformLocale : namespaces keys
```

---

### 6. Chat-Scoped Agentic Turn Sequence

The following sequence details how an Arabic-speaking medical student interacts with the AI Copilot. Notice how **tool execution is completely quarantined in canonical English**, preventing LLM hallucinations, while the resulting Socratic response is synthesized in fluent Arabic with USMLE term retention.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Medical Student
    participant UI as AiCopilotDrawer / Settings
    participant Store as useCopilotStore
    participant Policy as ChatLanguagePolicy
    participant Builder as SystemPromptBuilder
    participant Orch as AgenticOrchestrator
    participant LLM as Cloud LLM (Groq / Gemini)
    participant Sim as Hemodynamic Tool Engine

    Note over Student, UI: Student studies English vignette on Aortic Stenosis (AS)
    Student->>UI: Selects Chat Language "العربية" (or types in Arabic)
    UI->>Store: sendUserMessage("اشرح لي تأثير تضيق الصمام الأبهري على منحنى الضغط والحجم")
    
    Store->>Policy: resolveChatLanguageContext(pref: 'ar', text)
    Policy-->>Store: ResolvedChatLanguageContext { lang: 'ar', dir: 'rtl', preserveEnglish: true }
    
    Store->>Builder: new SystemPromptBuilder()...withChatLanguageDirective(context).build()
    Builder-->>Store: Prompt with [CHAT LANGUAGE & MEDICAL TERMINOLOGY DIRECTIVE]
    
    Store->>Orch: runAgentTurn(prompt, canonicalEnglishTools)
    Orch->>LLM: Stream turn (System Prompt + Canonical English Tool Declarations)

    Note over LLM, Orch: LLM identifies need for hemodynamics simulation
    LLM-->>Orch: Tool Call: simulate_hemodynamic_pv_loop({ lesion: "aortic_stenosis", state: "decompensated" })
    
    Note over Orch, Sim: Tool executes strictly in English ASCII
    Orch->>Sim: computePvLoopMetrics("aortic_stenosis", "decompensated")
    Sim-->>Orch: { lvedp: 28, map: 65, strokeVolume: 42, pvr: 1800 }
    
    Orch->>LLM: Feed tool result JSON back to LLM context
    
    Note over LLM: LLM synthesizes Arabic Socratic guidance while preserving English terms
    LLM-->>Orch: Stream: "يؤدي تضيق الصمام الأبهري (Aortic Stenosis) إلى زيادة ملحوظة في ضغط البطين الأيسر..."
    Orch-->>Store: Yield delta chunks
    Store-->>UI: Render markdown blocks with dir="rtl" + isolated LTR formulas
```

---

### 7. BiDi Presentation & Arabic Typography Rules

Rendering Arabic alongside complex medical formulas requires strict CSS and Unicode handling:

1. **Glyph Ligature Joining Protection:**
   Tailwind's default negative letter spacing (`tracking-tight`) breaks Arabic cursive ligatures. The platform enforces:
   ```css
   :root[dir="rtl"] {
     letter-spacing: 0 !important;
     line-height: 1.65;
     font-family: var(--font-arabic), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
   }
   ```
2. **Formula & Code Isolation:**
   Hemodynamic equations (e.g. $\text{MAP} = \text{DBP} + \frac{1}{3}(\text{SBP} - \text{DBP})$) and code fragments must never inherit RTL sentence direction. The markdown engine wraps them in `.ltr-isolate` with `unicode-bidi: isolate; dir="ltr";`.
3. **CSS Logical Properties:**
   All components use bidirectional logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `border-s-*`) instead of physical coordinates (`pl-*`, `pr-*`, `border-l-*`).

---

## Deep Dive: Distributed Global Question Bank, Delta Sync & Editorial Governance (SPEC-005)

### 1. The Core Challenge: Scaling Isolated IndexedDB to Global Cohorts

Historically, the Question Authoring Studio operated purely inside client-side IndexedDB. When an author generated or pasted a JSON batch of clinical questions, it was written solely to their local browser database (`db.questions`). 

While this delivered an instantaneous $0\text{ms}$ write and enabled 100% offline study, it created an **isolated walled garden**:
- No mechanism existed to share high-yield authored items with peer scholars across universities.
- Allowing unrestricted writes directly into a shared global database would corrupt curriculum integrity through hallucinated distractors, incorrect dosages, and duplicate items.
- Naive cloud database syncs risk overwriting or deleting an author's private questions, bookmarks, or historical test attempts.

To solve this, Med Quests implements the **Apple CloudKit Public vs. Private Database Architecture**, separating local student sandboxing from authoritative cloud distribution.

---

### 2. The Four Decoupled Data Streams

```mermaid
flowchart TB
    subgraph Cloud ["Cloudflare Edge & Storage Tier (Authoritative Cloud)"]
        CanonicalBank[("Canonical Global Question Bank (D1)<br/>• Monotonic Block Revisions (Rev #1, #2...)<br/>• Verified, Immutable Clinical Items<br/>• Strictly READ-ONLY to Students")]
        ReviewQueue[("Editorial Review Queue (D1 Staging)<br/>• Deduplicated Stems via SHA-256<br/>• Pending Faculty Triage")]
        AuditLog[("Immutable Editorial Audit Log (D1)<br/>• Revision After / Actor / Timestamp")]
    end

    subgraph Client ["Scholar Browser Client (Dexie.js v5 Offline Cache)"]
        LocalSandbox["Personal Local Sandbox<br/>• 0ms Private Writes (provenanceScope: 'local-custom')<br/>• Immediate Practice with No Network Waiting"]
        SyncCursor["Bank Revision Watermark Cursor<br/>• ETag Tracking (W/rev-X)<br/>• Non-Destructive Delta Ingestion Engine"]
    end

    subgraph Cockpit ["Admin & Faculty Review Cockpit (/admin)"]
        Inspector["Curriculum Review Queue<br/>• Split-Pane Clinical Inspector<br/>• Approve / Request Changes / Reject"]
        Curator["Canonical Bank Curator<br/>• Errata Fixes & Version Bumps<br/>• Soft Retirement (Tombstones)"]
    end

    LocalSandbox -- "Stream 1: Save Privately (0ms)" --> LocalSandbox
    LocalSandbox -- "Stream 2: Propose for Review (POST /api/bank/submissions)" --> ReviewQueue
    CanonicalBank -- "Stream 3: Downstream Delta-Sync (GET /api/bank/sync)" --> SyncCursor
    SyncCursor -- "Merge without Overwriting" --> LocalSandbox
    Inspector -- "Stream 4: Triage Decision (POST /api/admin/questions/:id/review)" --> CanonicalBank
    Inspector -.-> AuditLog
    Curator -- "Stream 4: Direct CRUD & Version Bumps" --> CanonicalBank
```

1. **Stream 1 — Private Local Sandbox (`0 ms`, Student-Owned)**:
   Authors paste JSON in [`QuestionStudio.tsx`](src/ui/features/studio/QuestionStudio.tsx) and click **"Save to My Device (Private)"**. Questions are validated via Zod and written immediately to Dexie (`provenanceScope: 'local-custom'`). Students can practice on them instantly—offline or online—with zero network blocking.
2. **Stream 2 — Guarded Editorial Review Pipeline (Staging $\rightarrow$ Faculty Moderation)**:
   Authors click **"Add Locally & Submit for Global Review"**. Questions are committed locally for immediate study **and** submitted to the Global Staging Queue (`editorialStatus: 'pending_review'`). Items undergo deterministic quality gating (Zod schema, verbatim evidence grounding check, and SHA-256 stem deduplication) before entering faculty triage.
3. **Stream 3 — Unidirectional Downstream Delta-Sync (`GET /api/bank/sync`)**:
   Learners synchronize with the canonical bank on app boot or via the **"Sync Global Bank"** button. The client sends `If-None-Match: "W/rev-X"`. If no new questions were published, the edge returns `304 Not Modified` ($0\text{ bytes}$). Incoming canonical items merge non-destructively into IndexedDB **without ever overwriting `local-custom` items**.
4. **Stream 4 — Direct Canonical Bank Curation (Admin & Faculty CRUD)**:
   Faculty Reviewers and Admins access a dedicated cockpit to review submissions, inline-edit errata, create canonical questions directly (bumping `bankVersion` and the block's `BankRevisionNumber`), and soft-retire (`archived`) obsolete questions without breaking historical student [`Attempt`](src/domain/model/types.ts) foreign keys.

---

### 2.1 Deterministic Clinical Quality Gate Pipeline

Before any item enters the local database or reaches the faculty review queue, it must traverse the multi-stage quality pipeline:

```mermaid
flowchart LR
    RawJSON["Raw Question JSON Batch"] --> Rule1["Rule 1: ZodStructureQualityRule<br/>(Field Presence, Choices Length, Schema)"]
    Rule1 --> Rule2["Rule 2: SingleCorrectChoiceRule<br/>(Exactly 1 Correct, 3 Distractors with Rationales)"]
    Rule2 --> Rule3["Rule 3: ClinicalEvidenceGroundingRule<br/>(Verbatim Quote >= 10 Chars, Slide/Page Citation)"]
    Rule3 --> Hasher["QuestionCanonicalHasher<br/>(Text Normalization & SHA-256 Fingerprint)"]
    Hasher --> Dedup["BatchDuplicateStemRule<br/>(Intra-Batch Collision Guard)"]
    Dedup --> ValidOutput["Quality-Gated Questions & Stem Hashes"]
```

---

### 3. SOLID Principles & Software Engineering Patterns

| Principle / Pattern | Concrete Engineering Implementation |
| :--- | :--- |
| **S — Single Responsibility (SRP)** | Dedicated domain classes: [`QuestionCanonicalHasher`](src/domain/questionBank/canonicalHasher.ts) handles stem normalization and SHA-256 fingerprinting; [`QuestionQualityGatePipeline`](src/domain/questionBank/qualityGatePipeline.ts) validates clinical grounding; [`QuestionEditorialStateMachine`](src/domain/questionBank/editorialStateMachine.ts) encapsulates lifecycle transitions; [`NonDestructiveBankMergeStrategy`](src/domain/questionBank/nonDestructiveMergeStrategy.ts) executes conflict-free downstream merges. |
| **O — Open/Closed (OCP)** | Ingestion validation rules implement [`IQuestionQualityRule`](specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts) (`ZodStructureQualityRule`, `SingleCorrectChoiceRule`, `ClinicalEvidenceGroundingRule`). Adding new USMLE board validation rules requires zero modifications to the ingestion pipeline. Similarly, search queries compose via [`ISpecification<T>`](src/domain/questionBank/questionSpecifications.ts). |
| **L — Liskov Substitution (LSP)** | [`EdgeQuestionBankGateway`](src/infrastructure/questionBank/edgeQuestionBankGateway.ts) seamlessly switches between remote Cloudflare Worker endpoints and an offline local simulator while honoring identical pre/post-conditions and `Result<T, QuestionBankDomainError>` invariants. |
| **I — Interface Segregation (ISP)** | Capabilities are split into four narrow, role-aligned contracts in [`question-bank-governance-ports.ts`](specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts): `IDownstreamBankSyncPort` (student read-only sync), `IStudioProposalSubmissionPort` (author proposals), `IFacultyReviewQueuePort` (triage), and `ICanonicalBankCuratorPort` (canonical CRUD). |
| **D — Dependency Inversion (DIP)** | Application stores ([`useQuestionStore`](src/application/stores/useQuestionStore.ts), [`useBankGovernanceStore`](src/application/stores/useBankGovernanceStore.ts)) and UI views depend strictly on abstract domain ports and immutable Value Objects—never directly on `fetch()`, SQL queries, or storage primitives. |
| **Nominal Branded Types** | `BankRevisionNumber`, `StemSha256Hash`, `SubmissionTicketId`, and `EditorialAuditEventId` eliminate primitive obsession at compile-time. |

---

### 3.1 Question Editorial Lifecycle State Machine (State Pattern)

The lifecycle of every question is strictly governed by [`QuestionEditorialStateMachine`](src/domain/questionBank/editorialStateMachine.ts):

```mermaid
stateDiagram-v2
    [*] --> local_draft : Authored in Studio (IndexedDB Private)
    local_draft --> pending_review : Author Submits for Global Review
    pending_review --> published : Faculty/Admin Approves (Rev++)
    pending_review --> changes_requested : Faculty/Admin Requests Edits
    pending_review --> rejected : Faculty/Admin Rejects
    changes_requested --> pending_review : Author Revises & Resubmits
    published --> published : Faculty/Admin Edits Errata (bankVersion++, Rev++)
    published --> archived : Admin Archives (Soft Tombstone, Rev++)
    archived --> published : Admin Restores Question (Rev++)
```

---

### 4. System Topology & Edge Cloud Infrastructure

```mermaid
flowchart TB
    subgraph Client ["Browser Client (Offline-First)"]
        UI_Studio["QuestionStudio (/studio)"]
        UI_Admin["QuestionBankGovernancePanel (/admin)"]
        Store_Q["useQuestionStore (Zustand)"]
        Store_Gov["useBankGovernanceStore (Zustand)"]
        IDB["Dexie.js IndexedDB v5 (questions, bankSyncMeta)"]
    end

    subgraph Edge ["Cloudflare Workers Edge Network (~2ms)"]
        Worker["Cloudflare Worker Router (src/worker/index.ts)"]
        KV["Workers KV Cache (bank_rev:cvs, sess:*)"]
        D1[("Cloudflare D1 SQLite Database")]
    end

    UI_Studio --> Store_Q
    UI_Admin --> Store_Gov
    Store_Q --> IDB
    Store_Q -- "GET /api/bank/sync (ETag)" --> Worker
    Store_Q -- "POST /api/bank/submissions" --> Worker
    Store_Gov -- "POST /api/admin/questions/:id/review" --> Worker
    Store_Gov -- "GET /api/admin/questions/catalog" --> Worker

    Worker --> KV
    Worker --> D1
```

---

### 5. Class Hierarchy & Domain Contracts

```mermaid
classDiagram
    class GovernedQuestion {
        +QuestionId id
        +QuestionProvenanceScope provenanceScope
        +QuestionEditorialStatus editorialStatus
        +StemSha256Hash stemHash
        +number globalRevision
        +number bankVersion
    }

    class QuestionCanonicalHasher {
        +normalizeStemText(stem: string) string
        +computeStemHashSync(stem: string) StemSha256Hash
        +computeStemHashAsync(stem: string) Promise~StemSha256Hash~
    }

    class IQuestionQualityRule {
        <<interface>>
        +string ruleId
        +validate(question: Question, index: number) Result
    }

    class QuestionQualityGatePipeline {
        -readonly IQuestionQualityRule[] rules
        +validateBatch(questions: Question[]) BatchQualityGateResult
    }

    class QuestionEditorialStateMachine {
        +canTransition(fromStatus, decision) boolean
        +transition(submission, command, nextRev) Result
    }

    class IQuestionMergeStrategy {
        <<interface>>
        +mergeGlobalDeltaIntoLocal(params) MergeOutcome
    }

    class NonDestructiveBankMergeStrategy {
        +mergeGlobalDeltaIntoLocal(params) MergeOutcome
    }

    class ISpecification~T~ {
        <<interface>>
        +isSatisfiedBy(candidate: T) boolean
        +and(other) ISpecification~T~
        +or(other) ISpecification~T~
        +not() ISpecification~T~
    }

    class EdgeQuestionBankGateway {
        +fetchDeltaSync(blockId, cursor) Promise~Result~
        +submitQuestionsForGlobalReview(params) Promise~Result~
        +listReviewQueue(blockId) Promise~Result~
        +submitReviewDecision(command) Promise~Result~
        +listGlobalBankCatalog(blockId) Promise~Result~
        +createCanonicalQuestions(params) Promise~Result~
        +updateCanonicalQuestion(params) Promise~Result~
        +setCanonicalArchiveStatus(params) Promise~Result~
    }

    QuestionQualityGatePipeline o-- IQuestionQualityRule
    NonDestructiveBankMergeStrategy ..|> IQuestionMergeStrategy
    EdgeQuestionBankGateway --> QuestionCanonicalHasher
    EdgeQuestionBankGateway --> QuestionEditorialStateMachine
    EdgeQuestionBankGateway --> QuestionQualityGatePipeline
```

---

### 6. Non-Destructive Downstream Delta-Sync Protocol

```mermaid
sequenceDiagram
    autonumber
    actor Scholar as Scholar Browser
    participant Store as useQuestionStore
    participant Dexie as Local IndexedDB (Dexie v5)
    participant Worker as Cloudflare Edge Worker + KV + D1

    Scholar->>Store: App Boot / Click "Sync Global Bank"
    Store->>Dexie: Read local questions & bankSyncMeta('cvs')
    Dexie-->>Store: Questions (0ms) + Cursor { serverRevision: 12, etag: "W/rev-12" }
    Store-->>Scholar: Render UI Instantly (0ms Blocking)

    Store->>Worker: GET /api/bank/sync?block=cvs&sinceRev=12 (If-None-Match: "W/rev-12")
    alt Server Revision == 12 (Cache Hit)
        Worker-->>Store: 304 Not Modified (0 Bytes Transferred, ~2ms Edge KV Check)
    else Server Revision > 12 (New Canonical Additions)
        Worker-->>Store: 200 OK { revision: 15, upsertedQuestions: [...], archivedQuestionIds: [...] }
        Store->>Store: NonDestructiveBankMergeStrategy.mergeGlobalDeltaIntoLocal()
        Store->>Dexie: Atomic Bulk Put (Merged Questions) + Put (New Cursor)
        Store-->>Scholar: Hydrate New Questions + Toast "+N Verified Questions Added"
    end
```

### 6.1 Conflict-Free Downstream Merge & Semantic Deduplication Decision Tree

When incoming canonical items arrive from the edge during delta sync, [`NonDestructiveBankMergeStrategy`](src/domain/questionBank/nonDestructiveMergeStrategy.ts) processes each item through a **Dual-Index (Primary Key `id` + Cryptographic Content `stemHash`)** reconciliation engine to ensure zero data loss and eliminate duplicate questions:

```mermaid
flowchart TD
    Incoming["Incoming Global Question (from Delta Sync)"]
    CheckID{"Does local DB have matching ID?"}
    CheckHash{"Does local DB have matching stemHash?"}
    
    Incoming --> CheckID
    
    CheckID -->|Yes| SameStem{"Does stemHash match?"}
    SameStem -->|Yes| Promote1["In-Place Promotion: Transition to 'global-canonical'\n• Scope: 'submitted-pending' or 'local-custom' -> 'global-canonical'\n• Status: 'published'\n• 0 Duplicates (Zero Rekeying!) ✅"]
    SameStem -->|No| CheckScope{"Is existing item 'submitted-pending', 'global-canonical', or 'seed-bundled'?"}
    CheckScope -->|Yes| UpdatePatch["Apply Faculty Refinements to Canonical\n(Inline Patches, Typo Fixes)\n0 Duplicates ✅"]
    CheckScope -->|No - 'local-custom'| TrueCollision["True ID Collision (Different Question):\n1. Re-key local custom to 'id-local-shortHash'\n2. Insert incoming canonical as 'id'\nPreserves student work! ✅"]
    
    CheckID -->|No| CheckHash
    CheckHash -->|Yes| ReconcileTemp["Provisional ID Promotion:\n• Retire old local/temporary ID from IndexedDB\n• Insert official canonical ID as 'global-canonical'\n0 Duplicates ✅"]
    CheckHash -->|No| InsertBrandNew["Insert Brand-New Canonical Question\n(insertedCount++) ✅"]

    ArchivedCheck["Check archivedQuestionIds"] --> Tombstone["Soft Tombstone:\nSet status='quarantined', editorialStatus='archived'\n(Preserves historical student Attempt foreign keys!)"]
```

| Local IndexedDB State | Incoming Global Delta State | Deterministic Merge Resolution |
| :--- | :--- | :--- |
| **Not present locally** | `published` (`global-canonical`) | **Insert** into local IndexedDB (`insertedCount++`). |
| `seed-bundled` or `global-canonical` | `published` with `globalRevision > local.globalRevision` | **Update** local record with latest canonical revision (`updatedCanonicalCount++`). |
| `submitted-pending` or `local-custom` | Same `id` **AND** same `stemHash` | **Promote in-place**: Upgrades local record to `global-canonical` with `editorialStatus: 'published'`. **No duplicate copy is created.** |
| `submitted-pending` or `local-custom` | Different `id` **BUT** same `stemHash` | **Provisional ID Promotion**: Retires old temporary ID from IndexedDB and registers official canonical ID. **No duplicate copy is created.** |
| `submitted-pending` | Same `id` with different `stemHash` | **Update in-place**: Faculty refined the stem/rationales during editorial review. Applies canonical version without duplication. |
| `local-custom` (Private student item) | Same `id` with **different** `stemHash` | **Namespace & Preserve Both**: True collision of two distinct questions. Re-keys local custom item to `${id}-local-${shortHash}` (`preservedLocalCustomCount++`) and inserts canonical item under `${id}`. **Zero student data loss.** |
| `global-canonical` | Listed in `archivedQuestionIds` | **Soft-Tombstone**: Marks local copy `status = 'quarantined'` / `editorialStatus = 'archived'`. Excluded from new tests; preserves historical student [`Attempt`](src/domain/model/types.ts) lookups. |
| `local-custom` (Private student item) | Not in global bank | **100% Untouched** (`preservedLocalCustomCount++`). |

---

### 6.2 When Exactly Do Other Users Sync? (Lifecycle Triggers & 5-Minute Stale Cache Resolution)

A distributed, offline-first system must balance **immediate freshness** with **battery efficiency** and **network frugality**. 

```mermaid
sequenceDiagram
    autonumber
    actor Peer as Peer Scholar (Device B)
    participant ClientStore as useQuestionStore (Zustand + Dexie)
    participant Edge as Cloudflare Edge Worker (~1.8ms)
    participant D1 as D1 SQLite (bank_revisions & global_questions)

    Note over Peer, ClientStore: Trigger 1: App Boot / Cold Start
    ClientStore->>Edge: GET /api/bank/sync?block=cvs&sinceRev=1 (If-None-Match: "W/rev-1")
    Edge->>D1: Check bank_revisions (Rev #2)
    Edge-->>ClientStore: 200 OK (Delta: +1 Approved Question, Rev #2)
    ClientStore->>ClientStore: Merge into IndexedDB (0 Duplicates)

    Note over Peer, ClientStore: Trigger 2: Tab Focus / Window Visibility Change
    Peer->>ClientStore: Switches back to MedQuests tab or unlocks phone
    ClientStore->>Edge: GET /api/bank/sync?sinceRev=2 (If-None-Match: "W/rev-2")
    Edge-->>ClientStore: 304 Not Modified (0 bytes, ~1.8ms Edge Check)

    Note over Peer, ClientStore: Trigger 3: 60-Second Background Heartbeat
    Note over ClientStore: Silent poll while tab is active in foreground
    ClientStore->>Edge: Periodic background check (ETag revalidation)

    Note over Peer, ClientStore: Trigger 4: Cross-Tab BroadcastChannel (0ms)
    Note over ClientStore: If User opens 2 tabs on same device, BroadcastChannel syncs all tabs instantly in 0ms!
```

#### The Four Automated Synchronization Triggers

| Trigger | Timing | Overhead | Description |
| :--- | :--- | :--- | :--- |
| **1. Cold Start / App Boot** | Immediately upon opening the app | $0\text{ms}$ blocking UI; background fetch | Local questions hydrate instantly from IndexedDB in $0\text{ms}$. A non-blocking background fetch verifies whether upstream faculty published new questions. |
| **2. Window Focus & Visibility Change** | When scholar switches back to tab or unlocks device | Sub-$2\text{ms}$ HTTP 304 check | Listens to `window.focus` and `document.visibilitychange`. If the student was studying another PDF and returns to the app, it checks for fresh additions. |
| **3. 60-Second Background Heartbeat** | Every 60 seconds (while document is visible) | $0\text{ bytes}$ transferred if up-to-date | A lightweight background timer queries `/api/bank/sync` with `If-None-Match: W/rev-X`. The edge returns `304 Not Modified` unless a faculty member approved questions during that minute. |
| **4. Multi-Tab Broadcast Channel** | Instantaneous ($0\text{ms}$) across open tabs | In-memory inter-process message | When any tab (e.g. Admin Cockpit) publishes a question or completes a sync, a `medquests_bank_sync` message triggers all other open tabs to revalidate in $0\text{ms}$. |
| **5. On-Demand Ribbon Button** | Whenever the user clicks **"Sync Global Bank"** | User-directed | Manual override in the Question Studio header ribbon. |

#### Root Cause Analysis: Why Did Other Users Not See Questions After 5 Minutes Previously?

If you previously tested adding questions and noticed other users did not see them after 5 minutes, three distinct issues in the system were responsible:

1. **Missing Worker Route Fallback (`404` $\rightarrow$ Personal Browser `localStorage`)**:
   - When an administrator clicked *"Create Canonical Question"*, the frontend called `POST /api/admin/questions/canonical`.
   - Previously, the Cloudflare Worker router was missing this route, returning a `404 Not Found`.
   - To prevent an app crash during offline demos, the client gateway silently fell back to storing the item in the **current browser's private `localStorage`**.
   - As a result, the questions were stored on the Admin's laptop, but **never reached the shared Cloudflare D1 database**. Other users querying the D1 cloud found no new rows.
   - **Resolution**: Implemented native `POST /api/admin/questions/canonical`, `POST /api/admin/questions/canonical/:id/archive`, and `GET /api/admin/questions/catalog` directly in [`src/worker/index.ts`](src/worker/index.ts), writing atomically to D1 and bumping the global revision.

2. **HTTP Edge Cache Delay (`stale-while-revalidate=300`)**:
   - The `/api/bank/sync` route previously returned `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
   - This instructed Cloudflare Edge CDN and browser caches to reuse stale sync responses for up to **300 seconds (5 minutes)** before revalidating against the D1 revision counter!
   - **Resolution**: Replaced with `Cache-Control: no-cache, must-revalidate` and `Pragma: no-cache`. The edge checks the monotonic revision in D1/KV instantaneously (~1.8ms) on every request without serving stale caches.

3. **Passive vs. Active Polling**:
   - Previously, the client only synced on initial boot or manual button click. If a peer scholar left their browser open on an exam or study session for 5 minutes, no sync request was dispatched.
   - **Resolution**: Implemented the active 60-second heartbeat and window focus listeners in [`useQuestionStore.ts`](src/application/stores/useQuestionStore.ts). Peer users now automatically receive approved questions within 60 seconds without refreshing.

---

### 6.3 Local-to-Global Bank Recovery & Reset Protocol

To safeguard student devices against corrupted local states, malformed custom imports, or stale draft accumulations, the system exposes an atomic **"Reset to Global Bank"** mechanism accessible to **all users (students, guests, pro scholars, and faculty)** across the entire platform:

1. **Persistent Header Navigation**: The interactive [`QuestionBankStatusPill`](src/ui/features/questionBank/QuestionBankStatusPill.tsx) mounted in [`Shell.tsx`](src/ui/app/Shell.tsx) gives users 1-click access to the Question Bank Status popover on every screen.
2. **Dashboard Command Hub**: Directly accessible in the top header action ribbon and within the Active Bank metric card in [`Dashboard.tsx`](src/ui/features/dashboard/Dashboard.tsx).
3. **Test Hub Preparation**: Placed immediately adjacent to the matching questions filter in [`TestHub.tsx`](src/ui/features/test/TestHub.tsx), allowing scholars to ensure their bank is 100% up-to-date before launching timed exam sprints.
4. **Identity & Security Modal**: Integrated into the Data & Continuity settings of [`AuthSecurityModal.tsx`](src/ui/features/auth/AuthSecurityModal.tsx) for both anonymous guests and authenticated scholars.
5. **Question Studio & Faculty Governance Cockpit**: Direct action ribbons in [`QuestionStudio.tsx`](src/ui/features/studio/QuestionStudio.tsx) and [`QuestionBankGovernancePanel.tsx`](src/ui/features/admin/QuestionBankGovernancePanel.tsx).

Every entrypoint invokes [`ResetBankConfirmationModal.tsx`](src/ui/features/questionBank/ResetBankConfirmationModal.tsx), an Apple Human Interface Guidelines (HIG) spring modal with clear destructive state warnings and live contrast telemetry.

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Faculty User
    participant UI as Universal Reset Trigger (Header / Dashboard / Test Hub / Modal)
    participant Modal as ResetBankConfirmationModal.tsx
    participant Store as useQuestionStore.ts
    participant Dexie as IndexedDB (db.questions & db.bankSyncMeta)
    participant Edge as Edge Gateway / Worker

    User->>UI: Clicks "Reset to Global Bank" (RotateCcw)
    UI->>Modal: Opens Apple HIG Confirmation Modal
    Modal->>User: Displays Local vs Canonical Stats & Destructive Warning
    User-->>Modal: Confirms Reset ("Reset to Global Bank")

    Modal->>Store: resetLocalBankToGlobal('cvs')
    Store->>Dexie: Clear questions (db.questions.where('blockId').equals('cvs').delete())
    Store->>Dexie: Clear sync cursor (db.bankSyncMeta.delete('cvs'))
    
    Store->>Edge: fetchDeltaSync('cvs', revision: 0)
    alt Online: Edge / D1 Available
        Edge-->>Store: Returns Full Canonical Bank (Latest Revision N)
    else Offline: Isolated Environment
        Store->>Store: Fallback to Bundled Authoritative Bank (bank.v1.json)
    end

    Store->>Dexie: Bulk Put Canonical Questions (db.questions.bulkPut)
    Store->>Dexie: Store Fresh Sync Cursor (Rev #N, lastSyncedAt, etag)
    Store->>UI: Update Zustand (questions: canonical, isSyncing: false)
    UI-->>User: Visual Apple-Spring Success Toast ("Restored to Canonical Global Bank")
```

| Component | Responsibility during Reset |
| :--- | :--- |
| **`IndexedDB: questions`** | Completely purges stale local drafts, quarantined items, and orphan collisions for that curriculum block. |
| **`IndexedDB: bankSyncMeta`** | Resets `serverRevision` from $0$ up to the canonical server revision, refreshing the ETag header cache. |
| **`Zustand: questions`** | Seamlessly updates the reactive in-memory state with zero page reloads, ensuring instant testability. |
| **`Bilingual Feedback`** | Native confirmation dialog and localized success toast in English and Arabic (`t.studio.resetConfirmDialog`, `t.studio.resetSuccessToast`). |

---

### 7. Author Ingest vs. Faculty Review Workflow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Author as Student / Author (/studio)
    participant StudioUI as QuestionStudio.tsx
    participant Dexie as Author's IndexedDB
    participant EdgeAPI as Cloudflare Worker (D1 + KV)
    actor Reviewer as Faculty Reviewer / Admin (/admin)

    Author->>StudioUI: Paste JSON Question Batch
    alt Action A: "Save to My Device (Private)"
        StudioUI->>Dexie: QualityGate -> Save as provenanceScope='local-custom'
        Dexie-->>Author: Available immediately for personal practice (0ms)
    else Action B: "Add Locally & Submit for Global Review"
        StudioUI->>Dexie: Save locally as provenanceScope='submitted-pending'
        StudioUI->>EdgeAPI: POST /api/bank/submissions (Batch)
        EdgeAPI->>EdgeAPI: Deduplicate Stems via SHA-256 & Stage to D1
        EdgeAPI-->>StudioUI: 201 Created { tickets: [...] }
        StudioUI-->>Author: Submissions tracker updated ("Pending Review")
    end

    Reviewer->>EdgeAPI: Open Admin Cockpit -> Review Queue Tab
    EdgeAPI-->>Reviewer: Pending Submissions + Verbatim Curriculum Quotes
    Reviewer->>EdgeAPI: POST /api/admin/questions/:id/review { decision: 'approve_and_publish' }
    EdgeAPI->>EdgeAPI: Promote to 'published', Bump bank_revisions (Rev++), Record Audit Entry
    EdgeAPI-->>Reviewer: Question Published to Global Canonical Bank
```

---

### 8. Role-Based Access Control (RBAC) & Governance Cockpit

| Capability / Operation | `anonymous` | `student-free` / `student-pro` | `faculty-reviewer` | `admin` |
| :--- | :---: | :---: | :---: | :---: |
| **Practice & Author Locally in Studio (`/studio`)** | ✅ | ✅ | ✅ | ✅ |
| **Downstream Delta Sync (`GET /api/bank/sync`)** | ✅ | ✅ | ✅ | ✅ |
| **Submit Questions for Global Review (`/studio`)** | ✅ | ✅ | ✅ | ✅ |
| **View Own Submissions Tracker & Reviewer Notes** | ✅ | ✅ | ✅ | ✅ |
| **Curriculum Review Queue Access (`/admin`)** | ❌ | ❌ | ✅ | ✅ |
| **Approve, Request Changes, Reject Submissions** | ❌ | ❌ | ✅ | ✅ |
| **Direct Canonical Question Creation & Errata Updates** | ❌ | ❌ | ✅ | ✅ |
| **Soft-Retire (Archive) / Restore Canonical Questions** | ❌ | ❌ | ❌ | ✅ |
| **Platform User Management, AI Quotas & Security Bans** | ❌ | ❌ | ❌ | ✅ |

#### Governance Cockpit Split-Screen Architecture

The [`QuestionBankGovernancePanel.tsx`](src/ui/features/admin/QuestionBankGovernancePanel.tsx) is organized into a high-density, split-screen triage workstation:

```mermaid
flowchart LR
    subgraph ReviewQueue ["Curriculum Review Queue (Left)"]
        List["Filterable Submission Cards<br/>• Pending / Changes Requested<br/>• Author Attribution<br/>• Timestamp & Chapter Badge"]
    end

    subgraph Inspector ["Split-Pane Clinical Inspector (Right)"]
        Stem["Clinical Vignette Stem<br/>+ Cryptographic SHA-256 Badge"]
        Choices["4 Choices with Correct Answer Highlight<br/>+ Plausible Distractor Rationales"]
        Evidence["Authoritative Evidence Grounding<br/>• Source Name & Location<br/>• Verbatim Quote (>= 10 chars)"]
        Actions["Reviewer Action Bar<br/>• Inline Errata Refinement<br/>• Approve & Publish (Rev++)<br/>• Request Changes | Reject"]
    end

    List --> Inspector
    Stem --> Choices --> Evidence --> Actions
```

---

## Deep Dive: Multi-Model AI Agentic Copilot, Real-Time Thinking & Two-Tier Telemetry

The platform features an extensible **Agentic Orchestrator** capable of executing structured clinical reasoning across multiple inference providers, real-time reasoning interception, and a dual-tier telemetry pipeline.

```mermaid
graph TB
    subgraph Client_Copilot ["AI Cognitive Co-Pilot (AiCopilotDrawer.tsx)"]
        UI_Chat["BiDi Chat Interface (dir='auto')"]
        UI_Accordion["ThinkingAccordion (Collapsible Chain-of-Thought)"]
        UI_TelemetryPill["⚡ Latency Pill (formatLatency, e.g. '340ms', '1.2s')"]
        UI_PowerBar["QuickPowerActionsBar (Why Right, Rule Out Wrong...)"]
        UI_Modal["ModelPerformanceInsightsModal (Fastest & Reliable Leaderboard)"]
    end

    subgraph App_Pipeline ["Application Layer (useCopilotStore)"]
        StreamBuffer["Token Stream Buffer (60 FPS Locked RAF Dispatch)"]
        TelemetryTrigger["aiMetricsCacheService.recordMetric()"]
    end

    subgraph Telemetry_Pipeline ["Two-Tier Telemetry Architecture"]
        Tier1["TIER 1: In-Memory Buffer + LocalStorage Staging (0ms UI Penalty)"]
        Tier2[("TIER 2: IndexedDB v6 (db.aiModelMetrics)")]
    end

    subgraph Domain_AI ["Pure Domain Core"]
        ThinkFilter["ThinkTagStreamFilter (Finite State Machine)"]
        InsightsEngine["computeModelInsights() (Fastest & Reliable Model Analysis)"]
        PowerCache["PowerActionCacheService (0ms Local Storage)"]
        Catalog["ModelCatalog (Simple-Terms Clinical Profiles)"]
    end

    subgraph Infra_Gateway ["Inference Gateway Layer"]
        Registry["EngineRegistry (Fallback & Circuit Breaker)"]
        Groq["Groq Cloud LPU (<300ms Llama 3.3 / GPT-OSS)"]
        Gemini["Google Gemini (Dynamic Thinking Budget)"]
        OpenRouter["OpenRouter (DeepSeek R1 / Nemotron 3.5)"]
    end

    UI_Chat --> App_Pipeline
    UI_PowerBar --> PowerCache
    PowerCache -.->|0ms Hit| UI_Chat
    App_Pipeline --> Registry
    Registry --> Groq
    Registry --> Gemini
    Registry --> OpenRouter

    Groq -- "delta.reasoning_content / <think>" --> ThinkFilter
    Gemini -- "part.thought === true" --> ThinkFilter
    OpenRouter -- "delta.reasoning" --> ThinkFilter

    ThinkFilter -- "onThinkingDelta" --> UI_Accordion
    ThinkFilter -- "onTextDelta" --> UI_Chat

    App_Pipeline --> TelemetryTrigger
    TelemetryTrigger --> Tier1
    Tier1 -- "debounced / requestIdleCallback" --> Tier2
    Tier2 --> InsightsEngine
    Tier1 --> InsightsEngine
    InsightsEngine --> UI_Modal
```

---

### 1. Multi-Model Inference & Simple-Terms Model Catalog

Medical students require distinct inference profiles depending on their study phase: rapid-fire question drills demand sub-300ms responses, whereas complex multi-system pathophysiology requires deep frontier reasoning.

The platform unifies three primary inference providers via [`EngineRegistry`](src/infrastructure/ai/engineRegistry.ts):
- **Groq Cloud (LPU Hardware)**: Extreme inference speed ($<300\text{ms}$) via `llama-3.3-70b-versatile`, `openai/gpt-oss-20b`, and `openai/gpt-oss-120b`. Includes dynamic model discovery querying `GET https://api.groq.com/openai/v1/models` against the student's key.
- **Google Gemini (DeepMind)**: Multimodal reasoning with native dynamic thinking budget (`gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-pro`).
- **OpenRouter Cloud**: Broad frontier model access (`nvidia/nemotron-3.5-lightning:free`, `meta-llama/llama-3.1-8b-instruct:free`, `recursive/flint-v1.0:free`, and DeepSeek R1).

#### Simple-Terms Model Catalog ([`modelCatalog.ts`](src/domain/ai/modelCatalog.ts))
Raw engineering identifiers (`openai/gpt-oss-120b`, `nvidia/nemotron-3.5-lightning:free`) are translated into clear, human-friendly cards in the settings modal:

| Simple Display Name | Raw Model ID | Provider | Latency Target | Recommended Clinical Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Instant Socratic Mentor** | `openai/gpt-oss-20b` | Groq | `~50ms` | Real-time rapid-fire vignette drills and instant distractor elimination. |
| **Deep Clinical Reasoning** | `openai/gpt-oss-120b` | Groq | `~250ms` | Complex multi-system USMLE vignettes, diagnostic dilemmas, acid-base. |
| **Specialist Reasoning** | `qwen/qwen3.8-27b` | Groq | `~120ms` | Detailed pharmacology mechanisms, receptor pathways, pathophysiology. |
| **Gemini 3.5 Flash Lite** | `gemini-3.5-flash-lite` | Gemini | `~300ms` | High-speed multimodal Socratic tutoring with dynamic chain-of-thought. |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Gemini | `~600ms` | Balanced clinical depth, physiological loop simulation, balanced speed. |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Gemini | `~1.8s` | Frontier clinical reasoning for complex, multi-layered board vignettes. |
| **Nemotron 3.5 (Free)** | `nvidia/nemotron-3.5-lightning:free` | OpenRouter | `~450ms` | High-throughput clinical analysis without token credit limitations. |
| **Flint 1.0 (Free)** | `recursive/flint-v1.0:free` | OpenRouter | `~500ms` | Step-by-step diagnostic deconstruction and differential diagnosis. |
| **Llama 3.1 8B (Free)** | `meta-llama/llama-3.1-8b-instruct:free` | OpenRouter | `~400ms` | Reliable open-weights clinical tutoring for general question review. |

---

### 2. Fallback Routing & Rate-Limit Resilience

High-volume study sessions frequently trigger API rate limits (`429 Too Many Requests`) on free or shared tiers. Med Quests eliminates study interruption through active fallback routing:
1. **Circuit-Breaker Failover**: If the active engine returns a 429 rate limit or network abort, [`AgenticOrchestrator`](src/infrastructure/ai/agenticOrchestrator.ts) automatically falls back to an alternate configured provider (e.g., Groq $\rightarrow$ Gemini $\rightarrow$ OpenRouter).
2. **Visual Engine Provenance**: The chat drawer header and message footers clearly display fallback provenance (e.g., `OPENROUTER (Backup) • Nemotron 3.5`), ensuring full transparency.
3. **Metric Quarantine**: Aborted and 429 requests are tagged with `status: 'rate-limited'` and isolated from benchmark speed calculations, ensuring hardware metrics remain uncorrupted by API errors.

---

### 3. Real-Time Chain-of-Thought Stream Filter (`ThinkTagStreamFilter`)

Modern frontier reasoning models (DeepSeek-R1, QwQ, Groq reasoning models) emit cognitive chain-of-thought tokens through distinct, incompatible protocols:
- `delta.reasoning_content` (Groq / OpenAI-compatible)
- `delta.reasoning` (OpenRouter)
- `part.thought === true` (Gemini 2.5 Flash dynamic thinking)
- Embedded in-band XML tags `<think>...</think>` in `content` streams

#### The Streaming Chunk-Boundary Problem
When models emit raw `<think>` tags, token chunk boundaries split unpredictably:
```
Chunk 1: "Let me consider the patient's symptoms: <th"
Chunk 2: "ink>\n1. Elevated JVP\n2. Pulsus paradoxus\n</thi"
Chunk 3: "nk>\nThis constellation indicates cardiac tamponade."
```
Naive string replacement destroys streaming performance or leaks unparsed XML into the user's prose.

#### Finite State Machine Solution ([`thinkTagStreamFilter.ts`](src/infrastructure/ai/providers/openAiCompatibleProvider.ts))
[`ThinkTagStreamFilter`](src/infrastructure/ai/providers/openAiCompatibleProvider.ts) implements an in-flight finite state machine:

```mermaid
stateDiagram-v2
    [*] --> OUTSIDE
    OUTSIDE --> MATCHING_OPEN_TAG : Sees '<'
    MATCHING_OPEN_TAG --> IN_THINK : Matches '<think>'
    MATCHING_OPEN_TAG --> OUTSIDE : Mismatch (flush buffer to text)
    IN_THINK --> MATCHING_CLOSE_TAG : Sees '<'
    MATCHING_CLOSE_TAG --> OUTSIDE : Matches '</think>'
    MATCHING_CLOSE_TAG --> IN_THINK : Mismatch (flush buffer to thinking)
```

- **Zero-Copy Performance**: Operates in $O(1)$ amortized memory with no regex compilation per chunk.
- **Strict Separation**: Emits isolated `onThinkingDelta` events for reasoning and `onTextDelta` events for user-facing prose.

---

### 4. Collapsible Reasoning Accordion UI (`ThinkingAccordion.tsx`)

Reasoning tokens stream into a dedicated, fluid UI element ([`ThinkingAccordion.tsx`](src/ui/features/copilot/ThinkingAccordion.tsx)) directly above the assistant's clinical response:
- **Auto-Expansion During Reasoning**: While the model is actively thinking (`isStreaming && !hasText`), the accordion expands automatically with a shimmering border and animated pulse indicator (`"Clinical Reasoning in progress..."`).
- **Auto-Collapse on Answer Completion**: As soon as the final clinical explanation begins streaming, the accordion smoothly collapses into an Apple HIG glassmorphic pill (`"Clinical Reasoning (N words)"`), allowing the student to review the direct explanation without distraction while keeping full reasoning accessible in one click.

---

### 5. Two-Tier Generation Telemetry Architecture (Memory Staging → IndexedDB v6)

To provide accurate speed insights across models without degrading the 60 FPS animation frame rate, Med Quests utilizes a **two-tier telemetry pipeline**:

```
Generation Complete / Abort / 429
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ TIER 1: Synchronous In-Memory Buffer + LocalStorage    │
│ • 0ms UI latency penalty (no write locks)              │
│ • LocalStorage mirror guards against page refresh      │
│ • Immediate availability in benchmark summary          │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼ Debounced / requestIdleCallback
┌────────────────────────────────────────────────────────┐
│ TIER 2: Asynchronous IndexedDB Persistence (Dexie v6)  │
│ • MedQuestsDB.aiModelMetrics table:                    │
│   id, providerId, modelId, latencyMs, status, ts...    │
│ • Persistent long-term hardware speed benchmarks       │
└────────────────────────────────────────────────────────┘
```

1. **Precision Capture**: Millisecond latency is measured using `performance.now() - startTime`.
2. **Instant Staging**: [`aiMetricsCacheService.recordMetric()`](src/infrastructure/ai/telemetry/aiMetricsCacheService.ts) appends to an in-memory array and syncs with `localStorage` in $<1\text{ms}$.
3. **Non-Blocking Persistence**: A debounced background job flushes staged records into `db.aiModelMetrics` via `requestIdleCallback` when the main thread is idle.
4. **Unified Telemetry Queries**: [`getAllMetrics()`](src/infrastructure/ai/telemetry/aiMetricsCacheService.ts) merges persisted IndexedDB records with unpersisted memory records (deduplicated by UUID) so metrics are always up to date.

---

### 6. Model Benchmark Insights Cockpit & Speed Leaderboard (`ModelPerformanceInsightsModal.tsx`)

Medical students can benchmark configured models using the integrated Telemetry Cockpit (accessible via the `Gauge` icon in the drawer or "Speed Benchmarks" in Settings):

- **🏆 Fastest Model Card**: Highlights the model with the lowest average completion latency on successful turns.
- **🛡️ Most Reliable Model Card**: Highlights the model with the highest success rate and fewest rate limits.
- **⏱️ Global Latency & Volume**: Tracks aggregate generation speed across all queries and total recorded turns.
- **Ranked Leaderboard Table**:
  - **Rank & Model**: Model display name, provider badge, and speed badges (`⚡ Fastest`, `🛡️ Most Reliable`).
  - **Avg Latency**: Visual color-coded pill (Green $<1\text{s}$, Amber $1\text{s}-2.5\text{s}$, Slate $>2.5\text{s}$).
  - **Speed Range**: Minimum and maximum recorded generation times.
  - **Throughput**: Estimated characters per second ($\text{chars}/\text{sec}$).
  - **Success Rate**: Percentage of completed vs. rate-limited/failed queries.
  - **Reset Telemetry**: Cleanly wipes local telemetry when testing new network conditions or API keys.

---

### 7. Quick Power Actions with Namespaced 0ms Caching

Four instant clinical Power Actions are pinned directly beneath the active vignette for single-click Socratic analysis:

| Power Action | Key | Socratic Objective | Clinical Prompt Archetype |
| :--- | :--- | :--- | :--- |
| **Why Right** | `why_correct` | Explain the underlying physiology proving the keyed choice correct. | "Deeply explain why [Correct Option] is pathophysiologically correct for this patient." |
| **Rule Out Wrong** | `rule_out_wrong` | Refute distractors and explain the exact clinical fallacy of each wrong choice. | "Refute every incorrect distractor and explain why each is contraindicated or incorrect." |
| **Pivot Clues** | `pivot_clues` | Extract pivotal diagnostic anchors and pathognomonic findings from the stem. | "Identify the pivotal anchor clues in this vignette that rule in the primary diagnosis." |
| **Cognitive Bridge** | `cognitive_bridge` | Synthesize a high-yield mnemonic and contrast table to anchor recall. | "Provide a high-yield memory anchor, mnemonic, and contrast rule for this concept." |

- **Instant 0ms Cache Hit**: Responses are stored in IndexedDB (`db.aiCache`) under namespaced keys:
  $$\text{CacheKey} = \text{questionId} : \text{actionKey} : \text{chatLanguage}$$
- Clicking any previously generated Power Action displays the response in $0\text{ms}$ with an `Instant Cache` badge, completely bypassing LLM network calls.

---

### 8. Rich Clinical Markdown, Tables & KaTeX Equations

AI explanations are rendered using GitHub Flavored Markdown (GFM) via [`CopilotMarkdownView.tsx`](src/ui/features/copilot/CopilotMarkdownView.tsx):
- **Clinical Tables**: Structured comparison grids for anatomical remnants, pharmacology contraindications, and staging criteria.
- **KaTeX Hemodynamic Math**: Inline ($...$) and display ($$...$$) math for formulas:
  $$\text{MAP} = \text{DBP} + \frac{1}{3}(\text{SBP} - \text{DBP}) \qquad \text{EF} = \frac{\text{SV}}{\text{EDV}} \times 100$$
- **One-Click Message Copying**: Assistant and student messages feature a one-click copy button with instant visual confirmation (`Copied`).
- **Timestamp & Model Provenance**: Every message displays its generation timestamp and model attribution pill.

---

### 9. Pedagogical Anti-Refusal Policy & Direct Socratic Guidance

To ensure uninterrupted learning during exam preparation, the AI system prompt enforces strict clinical pedagogy policies:
- **Zero Refusal on Active Vignettes**: The model is forbidden from refusing to discuss the active question or withholding the correct answer when explicitly asked.
- **Transparent Direct Guidance**: While the tutor prioritizes Socratic probing, explicit queries (e.g. *"What is the correct answer and why?"*) immediately confirm the keyed choice with complete pathophysiological rationales.
- **Focused Clinical Prose**: Unnecessary notifications (e.g. excessive spaced-repetition card synthesis banners) are suppressed to maintain focus on clinical concepts.

---

## Deep Dive: Continuous Question Bank Mastery, Anti-Repetition Engine & Liquid Progress

### 1. The Core Challenge: Eradicating Duplicate Fatigue in Longitudinal Study

Medical exam preparation is longitudinal—medical scholars work through large curriculum question banks (e.g., **CVS Physiology: 106 questions**) across days and weeks in focused 15-to-30 minute study sprints. In legacy e-learning architectures, test generation operates via naive slice indexing:
$$\text{Questions} = \text{Pool}[0 \dots N]$$
When a student answers 20 questions on Monday, returning on Tuesday previously meant seeing questions #1 through #20 repeated from the start of the array. This creates acute learner fatigue, corrupts diagnostic accuracy metrics, and forces students to waste time skipping duplicate questions.

**The Solution:** The **Continuous Question Bank Mastery Engine** introduces stateful attempt tracking, real-time curriculum coverage decomposition, and deterministic anti-repetition filtering across all testing interfaces (`TestHub`, `QuickPractice`, and `SessionPlayer`).

---

### 2. Progressive Solving Lifecycle Dataflow

```mermaid
flowchart TD
    A[Student opens Test Hub or Quick Practice] --> B["Selects CVS Physiology: 106 Total Qs"]
    B --> C{Inspect Local db.attempts History}
    C -->|Existing Attempts Found| D[Render Liquid Continuity Hero Card]
    C -->|Zero Attempts| D0[Render First-Attempt Welcome State]
    
    D --> E["Metrics: 20/106 Answered (19%) • 86 Fresh Remaining"]
    D --> F["Tri-Color Bar: 17 Mastered | 3 Missed | 86 Fresh"]
    
    E --> G{Student Selects Testing Intent}
    G -->|Intent 1: Seamless Continuation| H1["1-Tap Hero CTA: 'Continue Fresh Questions' (86 Left)"]
    G -->|Intent 2: Targeted Remediation| H2["Filter: 'Mistakes Only' (Review 3 Missed)"]
    G -->|Intent 3: Comprehensive Final Review| H3["Filter: 'All Questions' (Full 106 Pool)"]
    
    H1 --> I["SessionPlayer Mounts: pool.filter(!attempted)"]
    I --> J["Serves Q21–Q40 Sequentially • ZERO DUPLICATES"]
    J --> K[Student answers 20 fresh questions]
    K --> L["IndexedDB persists attempts in real-time"]
    L --> M["Next Visit: 40/106 Answered (38%) • 66 Fresh Remaining"]
```

---

### 3. SOLID Realization & Mathematical Scope Calculation

The coverage and anti-repetition engine is implemented in [`useStatsStore.ts`](src/application/stores/useStatsStore.ts) using pure domain modeling and functional decomposition:

```typescript
export interface ScopeCoverageSummary {
  total: number;
  answered: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  percentComplete: number;
  unansweredIds: string[];
  answeredIds: string[];
  incorrectIds: string[];
  correctIds: string[];
}
```

#### Mathematical Formulations

For any filtered curriculum scope $Q_{\text{scope}} \subseteq Q_{\text{bank}}$ (e.g., CVS Physiology, or Chapter: *Cardiac Electrophysiology*):

1. **Attempt Partitioning**:
   $$A_{\text{unique}} = \{ q \in Q_{\text{scope}} \mid \text{hasAttempt}(q) \}$$
   $$U_{\text{fresh}} = Q_{\text{scope}} \setminus A_{\text{unique}}$$

2. **Latest Attempt Outcome Classification**:
   $$C_{\text{correct}} = \{ q \in A_{\text{unique}} \mid \text{latestAttempt}(q).\text{isCorrect} = \text{true} \}$$
   $$M_{\text{mistake}} = \{ q \in A_{\text{unique}} \mid \text{latestAttempt}(q).\text{isCorrect} = \text{false} \}$$

3. **Metrics Formulation**:
   $$\text{Coverage Ratio} = \left( \frac{|A_{\text{unique}}|}{|Q_{\text{scope}}|} \right) \times 100\% \qquad \text{Accuracy} = \left( \frac{|C_{\text{correct}}|}{|A_{\text{unique}}|} \right) \times 100\%$$

| SOLID Principle | Implementation in Coverage Engine |
| :--- | :--- |
| **Single Responsibility (SRP)** | [`getScopeCoverage`](src/application/stores/useStatsStore.ts) is strictly dedicated to calculating coverage math and ID partitioning. It maintains zero UI presentation dependencies. |
| **Open/Closed (OCP)** | The filter criteria interface `{ subjectId?, chapterId?, highYieldOnly? }` supports arbitrary curriculum stratification without modifying the core partitioning loop. |
| **Liskov Substitution (LSP)** | [`ScopeCoverageSummary`](src/application/stores/useStatsStore.ts) is consumed identically by `TestHub`, `QuickPractice`, and automated Vitest suites with zero type assertions. |
| **Interface Segregation (ISP)** | Components only subscribe to the slices of state they need (`answeredQuestionIds`, `mistakeQuestionIds`), avoiding full-tree re-renders. |
| **Dependency Inversion (DIP)** | The store operates against Dexie domain entities rather than browser storage globals. |

---

### 4. Liquid Glassmorphic Mastery UI & Tri-Color Progress Bar

Implemented with **Apple Human Interface Guidelines (HIG)** aesthetic fidelity in [`TestHub.tsx`](src/ui/features/test/TestHub.tsx):

- **Frosted Glass Surface**: Multi-pass ambient background gradients (`from-white/95 via-slate-50/80 to-blue-50/40 dark:from-zinc-900/95`) with responsive dynamic borders.
- **Tri-Color Segmented Progress Bar**:
  - 🟢 **Emerald Green (`bg-emerald-500`)**: Mastered items (latest answer correct).
  - 🔴 **Crimson Red (`bg-rose-500`)**: Missed items requiring remediation.
  - 🔵 **Translucent Blue (`bg-blue-500/20`)**: Unanswered fresh questions remaining.
- **1-Tap Hero Continuity CTA**: Prominent `[Zap] Continue Fresh Questions (X Left)` action that immediately pre-configures and launches unattempted items.
- **Isolated Subject Progress Reset**: When a student completes 100% of a subject (e.g. 106/106 Physiology questions), [`resetSubjectStats(subjectId)`](src/application/stores/useStatsStore.ts) enables wiping attempts for *that subject only*, leaving other block subjects completely intact.

---

### 5. Deterministic Pool Slicing & Execution Safety in SessionPlayer

When a session initializes in [`SessionPlayer.tsx`](src/ui/features/test/SessionPlayer.tsx):
1. **Asynchronous IndexedDB Verification**: Queries `db.attempts.toArray()` to build a real-time attempt map, protecting against race conditions between multiple tabs.
2. **Deterministic Pool Extraction**:
   - `questionFilter: 'unanswered'` $\to$ Filters strictly for unattempted IDs.
   - `questionFilter: 'incorrect'` $\to$ Filters strictly for items where the latest attempt failed.
   - `questionFilter: 'all'` $\to$ Full category rotation.
3. **Canonical Sequence Preservation**: Slices questions sequentially (`slice(0, count)`), ensuring question #21 is served immediately after question #20.
4. **Active Header Visual Feedback**: Displays a live `[⚡ Zero Duplicates Guarantee]` pill in the player header with an emerald pulsing status indicator.

---

## Deep Dive: Edge Identity Lockdown & Primary Communication Channel (Cloudflare D1 + Google OAuth)

### 1. Production Security Gating & High-Conversion Funnel

In medical education platforms, user identity serves two non-negotiable functions:
1. **Strict Administrative Governance**: Zero unauthorized privilege escalation or mock button leaks in production environments.
2. **High-Fidelity Student Communication**: Medical students require instantaneous notification for critical board exam errata, university curriculum shifts, and scheduled cohort mock exams. WhatsApp and cellular phone messaging represent the primary communication channel, with open rates exceeding $98\%$ compared to sub-$20\%$ for email.

---

### 2. Edge Identity & Phone Number Ingestion Topology

```mermaid
flowchart TD
    User([Medical Scholar]) -->|Opens App| Modal[AuthSecurityModal]
    Modal -->|Single OAuth Action| GoogleBtn["Continue with Google (GIS Popup)"]
    GoogleBtn -->|OAuth 2.0 Credential| EdgeAuthWorker["Cloudflare Edge Worker (/api/auth/oauth/google)"]
    
    EdgeAuthWorker -->|Validate Token & Extract Email| VerifyUser{Is Platform Owner?}
    VerifyUser -->|"mostafa.yaser.developer@gmail.com"| OwnerRole["Role: Admin & Platform Owner<br>• Full Governance Overrides<br>• Studio Authoring Unlocked"]
    VerifyUser -->|All Other Scholars| ScholarRole["Role: Student-Pro<br>• Standard Cloud Sync<br>• Socratic AI Access"]
    
    OwnerRole --> D1Upsert[(Cloudflare D1: user table)]
    ScholarRole --> D1Upsert
    
    D1Upsert --> HydrateProfile["Hydrate phone_number into UserProfile"]
    HydrateProfile --> ProfileView["Authenticated Profile Modal"]
    
    ProfileView -->|Enter Phone Number| PhoneCard["Primary Communication Channel<br>• WhatsApp / Mobile Notifications"]
    PhoneCard -->|POST /api/auth/profile/phone| D1Update[(Cloudflare D1: user.phone_number)]
    D1Update --> StatusPill["Live Edge Sync Confirmation (0ms Optimistic)"]
```

---

### 3. Cloudflare D1 Schema & Edge API Implementation

#### Cloudflare D1 Migration (`0004_user_phone_number.sql`)
```sql
-- D1 Migration: Add phone_number to user table for WhatsApp & mobile communication
ALTER TABLE user ADD COLUMN phone_number TEXT;
```

#### Edge Worker Endpoints ([`src/worker/index.ts`](src/worker/index.ts))
- **`GET /api/auth/oauth/google`**: Upon Google Identity Services popup completion, queries `user.phone_number` from Cloudflare D1 SQL (`med_quests_db`) and returns it within the session profile payload.
- **`POST /api/auth/profile/phone`**: Edge worker endpoint accepting `{ email, phoneNumber }` or `{ userId, phoneNumber }`, updating the persistent record in D1 in sub-$15\text{ms}$ global edge latency.

#### Client Gateway & Store
- [`edgeAuthGateway.ts`](src/infrastructure/auth/edgeAuthGateway.ts): Implements `updatePhoneNumber(phoneNumber)` with optimistic local storage updates and background D1 synchronization.
- [`useAuthStore.ts`](src/application/stores/useAuthStore.ts): Exposes `updatePhoneNumber` reactive store action consumed across the UI.

---

### 4. Authoritative Super Admin Boundary

The platform owner and super administrative role is hard-gated at both the Edge Worker layer and Domain layer strictly to:
$$\text{Platform Owner} \equiv \texttt{mostafa.yaser.developer@gmail.com}$$

- **Zero Mock Bypass Leaks**: The production modal completely purges all sandbox shortcut buttons (`Instant Scholar Pro`, `Sign in as Platform Owner Mock`), ensuring real users authenticate exclusively via Google Identity Services.
- **Granular Override Entitlements**: When authenticated, the platform owner receives full system capabilities:
  - `security_governance_admin: true`
  - `ai_cloud_streaming_quota: true`
  - `question_studio_author: true`
  - `multi_block_unlock: true`
  - `cloud_sync_backup: true`

---

## Deep Dive: Psychometric Choice Entropy, Stratified Canonical Rebalancing & Spatial-Decoupled Presentation Engine (SPEC-006)

### 1. The Core Defect: Uncovering the 76% A+B Positional Bias

An empirical psychometric and statistical audit of the canonical Cardiovascular System (CVS) question bank ([`bank.v1.json`](content/cvs/dist/bank.v1.json)) uncovered a severe positional skew: **75.94% (161 / 212)** of all Single-Best-Answer (SBA) items placed the correct choice in slot `a` or `b`:

| Canonical Choice ID | Visual Slot Index | Observed Correct Count ($O_i$) | Expected Uniform Count ($E_i$) | Observed Proportion | Deviation from Uniform ($25\%$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **`a`** | `0` (Top Card) | **90** | $53.0$ | **$42.45\%$** | $+17.45\%$ |
| **`b`** | `1` (2nd Card) | **71** | $53.0$ | **$33.49\%$** | $+8.49\%$ |
| **`c`** | `2` (3rd Card) | **33** | $53.0$ | **$15.57\%$** | $-9.43\%$ |
| **`d`** | `3` (Bottom Card) | **18** | $53.0$ | **$8.49\%$** | $-16.51\%$ |
| **Total ($N$)** | — | **212** | **212.0** | **$100.00\%$** | — |

#### Statistical Proof of Psychometric Invalidity
1. **Blind Guess Passing Vulnerability**:
   $$\frac{90 + 71}{212} = \frac{161}{212} \approx 75.94\%$$
   A candidate blind-guessing option `A` or `B` achieved an automatic honors pass score (~76%), obliterating the diagnostic integrity of the exam.
2. **Pearson's Chi-Squared ($\chi^2$) Goodness-of-Fit**:
   $$\chi^2 = \sum_{i \in \{a,b,c,d\}} \frac{(O_i - E_i)^2}{E_i} = \frac{(90-53)^2}{53} + \frac{(71-53)^2}{53} + \frac{(33-53)^2}{53} + \frac{(18-53)^2}{53} = 62.604$$
   For $df = 3$ degrees of freedom, the critical threshold at $\alpha = 0.001$ is $\chi^2_{0.001} = 16.266$. The observed $\chi^2 = 62.604$ yields $p < 1.6 \times 10^{-13}$, proving extreme statistical clustering.
3. **Shannon Entropy Deficit**:
   $$H(X) = -\sum_{i=1}^{4} p_i \log_2(p_i) \approx 1.773\text{ bits} \quad (\text{Normalized } H_{\text{norm}} = \frac{1.773}{2.000} = 0.886)$$

---

### 2. The Three Root Causes Forensics

1. **Few-Shot Prompt Anchoring Bias**:
   - `questionAiPromptBuilder.ts` hardcoded `"id": "a", "isCorrect": true` in `GOLD_STANDARD_EXAMPLE_QUESTION`.
   - `QuestionStudio.tsx` hardcoded `"id": "b", "isCorrect": true` in `generatePrompt()`.
   - Autoregressive LLMs and faculty authors mimicked the template, clustering correct answers in top slots.
2. **Absence of Batch Entropy Quality Gating**:
   - `QuestionQualityGatePipeline` validated item schemas but lacked macro-level entropy analysis to reject skewed author batches.
3. **Static Slot Rendering & Hardcoded Keyboard Shortcuts**:
   - `SessionPlayer.tsx` rendered `currentQ.choices` in literal JSON order and hardcoded `key === '1' -> 'a'`, `key === '2' -> 'b'`, causing cognitive anchoring to the top visual cards.

---

### 3. SOLID Principles & Clean Architecture Realization

| Principle | Engineering Realization in SPEC-006 |
| :--- | :--- |
| **S — Single Responsibility (SRP)** | `Mulberry32DeterministicPrng` generates pseudo-random numbers; `ChoicePermutationSafetySpecification` checks for positional text; `ChoiceDistributionAnalyzer` calculates $\chi^2$ and entropy; `StratifiedCanonicalRebalancingStrategy` permutes canonical rows; `SessionSeededSpatialPresentationStrategy` maps visual cards. |
| **O — Open/Closed (OCP)** | Rebalancing strategies implement `IChoiceRebalancingStrategy`; presentation engines implement `ISpatialChoicePresentationStrategy`. New presentation modes (e.g., adaptive distractor hiding) plug in without modifying `SessionPlayer.tsx`. |
| **L — Liskov Substitution (LSP)** | `Mulberry32DeterministicPrng` and presentation strategies implement pure deterministic interfaces that can be substituted seamlessly in Vitest suites without side effects or layout shifts. |
| **I — Interface Segregation (ISP)** | Contracts in `choice-entropy-ports.ts` are strictly segregated: `IDeterministicPrngPort`, `IChoicePermutationSafetySpecification`, `IChoiceRebalancingStrategy`, `ISpatialChoicePresentationStrategy`, and `IBatchQuestionQualityRule`. |
| **D — Dependency Inversion (DIP)** | React components (`SessionPlayer`, `QuestionStudio`) and Zustand stores depend strictly on domain port abstractions and pure value objects (`SpatialPresentedChoice`, `ChoiceDistributionMetrics`). |

---

### 4. Stratified Canonical Rebalancing Strategy

Naive rebalancing across the whole bank would leave individual chapters unbalanced. `StratifiedCanonicalRebalancingStrategy` guarantees both **global parity** ($53/53/53/53$) and **chapter-level balance** ($\le 1$ count variance per slot):

```mermaid
flowchart TD
    subgraph Input["Canonical Dataset (212 CVS Items)"]
        RawBank["Raw bank.v1.json<br/>(90 A / 71 B / 33 C / 18 D)<br/>χ² = 62.604, Skew = 75.94%"]
    end

    subgraph PreFlight["Pre-Flight Position Safety Check"]
        SafetySpec["ChoicePermutationSafetySpecification<br/>Inspects: stem, explanation, rationale<br/>Guards against: 'Option A', 'All of the above'"]
        RawBank --> SafetySpec
    end

    subgraph StratifiedPartition["Chapter Stratification & Allocation"]
        SafetySpec -->|Passed (0 Violations)| Partition["Partition by chapterId (11 Chapters)"]
        Partition --> Pass1["Pass 1: Base Quota per Chapter<br/>Assign floor(k/4) to each slot ('a','b','c','d')"]
        Pass1 --> Pass2["Pass 2: Deficit Pool Allocation<br/>Distribute remaining slots via PRNG Shuffle<br/>Global Target Quota: Exactly 53 per slot"]
    end

    subgraph PermutationEngine["Deterministic Permutation & Re-Keying"]
        Pass2 --> Permute["Slot Assignment Map (QuestionId -> Slot)"]
        Permute --> Swap["Move isCorrect choice to assigned visual slot"]
        Swap --> ShuffleD["Shuffle 3 distractors via Mulberry32 PRNG"]
        ShuffleD --> Rekey["Cleanly Re-Key Choice IDs ('a', 'b', 'c', 'd') in order"]
    end

    subgraph Output["Production Canonical Bank (bankVersion: 2)"]
        Rekey --> BalancedBank["content/cvs/dist/bank.v1.json<br/>(53 A / 53 B / 53 C / 53 D)<br/>χ² = 0.000, Entropy = 1.000 (2.00 bits)"]
    end
```

---

### 5. Session-Seeded Spatial Presentation & Keyboard Decoupling

In `SessionPlayer.tsx`, choices are projected dynamically using a deterministic session seed. This provides:
1. **Intra-Session Idempotence**: Navigating back/forward in the same session produces the exact same layout ($0\text{ ms}$ flicker).
2. **Inter-Session Freshness**: Repeating a test shuffles option cards to prevent spatial memorization.
3. **Spatial Keyboard Consistency (Apple HIG)**: Number keys `1`, `2`, `3`, `4` always select top-to-bottom visual cards `A`, `B`, `C`, `D`.

```mermaid
sequenceDiagram
    autonumber
    actor Scholar as Medical Scholar
    participant Player as SessionPlayer.tsx
    participant Presenter as SessionSeededSpatialPresentationStrategy
    participant PRNG as Mulberry32DeterministicPrng
    participant Store as Local Storage & AI Copilot

    Note over Player: Session Start -> sessionId = "sess-17304123-abc"
    Player->>Presenter: projectChoices(currentQ, sessionId)
    Presenter->>PRNG: hashStringToSeed("spatial:${sessionId}:${currentQ.id}")
    PRNG-->>Presenter: 32-bit FNV-1a Seed
    Presenter->>PRNG: shuffle(currentQ.choices, seed)
    PRNG-->>Presenter: Permuted Choices Array
    Presenter-->>Player: SpatialPresentedChoice[4]<br/>Slot 0: Badge 'A', Key '1' -> Canonical ID 'c'<br/>Slot 1: Badge 'B', Key '2' -> Canonical ID 'a'<br/>Slot 2: Badge 'C', Key '3' -> Canonical ID 'd'<br/>Slot 3: Badge 'D', Key '4' -> Canonical ID 'b'
    
    Scholar->>Player: Presses Keyboard Key '1' (or clicks top card 'A')
    Player->>Presenter: resolveCanonicalChoiceIdBySlot(presentedChoices, 0)
    Presenter-->>Player: canonicalChoiceId = 'c'
    Player->>Store: handleSelectAnswer('c')<br/>Records Attempt & Telemetry with Canonical ID
    Player-->>Scholar: Highlights Visual Card 'A' with Apple Glassmorphic State
```

---

### 6. Continuous Quality Gate & Studio Auto-Balancer Pipeline

To prevent future AI generations or faculty imports from introducing position skew, `QuestionQualityGatePipeline` and `QuestionStudio.tsx` enforce automated psychometric entropy checks:

```mermaid
flowchart LR
    subgraph Ingest["Authoring / Ingestion Input"]
        RawJSON["Raw Question JSON / AI Output"]
    end

    subgraph Pipeline["Quality Gate Pipeline (Rule Engine)"]
        R1["ZodStructureQualityRule"]
        R2["SingleCorrectChoiceRule"]
        R3["ClinicalEvidenceGroundingRule"]
        R4["NoHardcodedChoiceLetterReferenceRule"]
        Analyzer["ChoiceDistributionAnalyzer<br/>(Computes χ², Entropy, Dominant Slot)"]
        
        RawJSON --> R1 --> R2 --> R3 --> R4 --> Analyzer
    end

    subgraph Feedback["Interactive Studio Telemetry & Auto-Balancer"]
        Analyzer --> SkewCheck{"Skew Detected?<br/>(Max Slot > 35% or A+B > 65%)"}
        SkewCheck -->|Yes| Warning["Studio Alert: High Choice Skew<br/>Auto-Balance with 1-Click"]
        Warning --> Rebalance["StratifiedCanonicalRebalancingStrategy"]
        Rebalance --> IngestSuccess["Ingest to Local IndexedDB & Submit to Global Queue"]
        SkewCheck -->|No (Uniform)| IngestSuccess
    end
```

---

### 7. Edge D1 Seed & IndexedDB Non-Destructive Upgrade Flow

Existing client devices and edge D1 databases converge automatically without data loss:

```mermaid
flowchart TD
    subgraph Edge["Cloudflare Edge Worker (src/worker/index.ts)"]
        WorkerInit["ensureGlobalBankSeeded() on Cold Start"]
        D1Inspect["Inspect global_questions in D1"]
        D1Inspect --> VersionCheck{"seeded.bankVersion > db.bank_version<br/>AND author_id == 'usr-curriculum-faculty'?"}
        VersionCheck -->|Yes| D1Update["UPDATE choices_json, bank_version = 2<br/>INCREMENT bank_revisions.revision_number"]
        VersionCheck -->|No / Custom Edit| D1Preserve["Preserve Faculty/Admin Custom Edits"]
    end

    subgraph Client["Client Application (useQuestionStore.ts)"]
        AppLaunch["App Launch / Hydrate from IndexedDB"]
        LocalInspect{"Local seed-bundled items have bankVersion < 2?"}
        AppLaunch --> LocalInspect
        LocalInspect -->|Yes| LocalUpgrade["Bulk Put Rebalanced Choices (bankVersion: 2)<br/>Preserve Attempts, Bookmarks, and Notes!"]
        LocalInspect -->|No| LocalReady["Instant 0ms Local Read"]
        D1Update -.->|Delta-Sync Signal| NonDestructiveMerge["NonDestructiveBankMergeStrategy"]
    end
```

---

### 8. Mathematical & Psychometric Proof of Uniformity

Running the automated Vitest suite ([`choiceEntropyAndSpatialPresentation.test.ts`](src/domain/questionBank/__tests__/choiceEntropyAndSpatialPresentation.test.ts)) verifies the transformation:

```text
================================================================================
CANONICAL QUESTION BANK METRICS: BEFORE VS. AFTER REBALANCING
================================================================================
Metric                      Pre-Fix (bank.v1)         Post-Fix (bank.v2)
--------------------------------------------------------------------------------
Total Questions             212                       212
Choice A Count              90 (42.5%)                53 (25.0%)
Choice B Count              71 (33.5%)                53 (25.0%)
Choice C Count              33 (15.6%)                53 (25.0%)
Choice D Count              18 (8.5%)                 53 (25.0%)
Combined A + B              161 (75.94%)              106 (50.00%)
Combined C + D              51 (24.06%)               106 (50.00%)
Pearson Chi-Squared (χ²)    62.604 (p < 1.6e-13)      0.000 (p = 1.000)
Shannon Entropy (H)         1.773 bits                2.000 bits
Normalized Entropy (H_norm) 0.886                     1.000 (Maximum)
Psychometric Severity       CRITICAL SKEW             OPTIMAL UNIFORM
Chapter-Level Slot Variance Up to 12 items            <= 1 item per chapter
================================================================================
```

---

## Local-First Persistence & Storage Topology

Data is stored client-side in the browser via **IndexedDB (Dexie.js v6)** for privacy, instant launch, and full offline capability:

```
IndexedDB: MedQuestsDB (v6)
├── questions                 # Canonical USMLE vignettes, psychometrics, provenanceScope
├── attempts                  # Exam attempts, single-strike answers, mode, confidence
├── reviewCards               # Spaced repetition intervals, due dates, lapses
├── bookmarks                 # Bookmarked question IDs
├── notes                     # Student clinical notes per vignette
├── aiSettings                # Engine preferences, model IDs, API keys, chatLanguage
├── aiThreads                 # Multi-turn conversation histories
├── srsCards                  # High-yield topic flashcards
├── aiCache                   # Namespaced Socratic power actions (${qid}:${action}:${lang})
├── bankSyncMeta              # Cloud delta sync revision counters and ETags
├── studioSubmissions         # Global question bank review tickets and reviewer notes
└── aiModelMetrics            # Two-tier telemetry records (latency, status, throughput)
```

---

## Repository Structure

```
Med Quests Apps/
├── .specify/                               # Spec-Kit memory & configuration
├── .agents/                                # Autonomous engineering agents
├── BRD.md                                  # Business & Engineering Requirements (1,300+ lines)
├── specs/                                  # Formal Architecture Specs & Plans
│   └── 004-bilingual-i18n-ai-localization/ # Bilingual Spec, Plan & Contracts
├── src/
│   ├── domain/                             # PURE DOMAIN LAYER (Zero external dependencies)
│   │   ├── i18n/                           # ScriptDetector, Dictionaries (en, ar), Types
│   │   ├── ai/                             # ChatLanguagePolicy, SystemPromptBuilder, Tools
│   │   ├── questionBank/                   # Catalog models & psychometrics
│   │   └── auth/                           # Role schemas & RBAC contracts
│   ├── application/                        # APPLICATION STATE LAYER
│   │   └── stores/                         # useLocaleStore, useAiSettingsStore, useCopilotStore
│   ├── infrastructure/                     # ADAPTERS & INFRASTRUCTURE
│   │   ├── ai/                             # AgenticOrchestrator, EngineRegistry (Groq, Gemini)
│   │   ├── storage/                        # Dexie.js IndexedDB schema & migrations
│   │   └── questionBank/                   # JSON bank loader & integrity gate
│   └── ui/                                 # PRESENTATION LAYER (Apple HIG)
│       ├── app/                            # Shell, Navigation, LocaleToggle
│       └── features/                       # Copilot, Session Player, Studio, Reports
```

---

## Quality Engineering & Verification Matrix

Quality is enforced via automated continuous testing with zero warnings or loose types:

```bash
# Execute full Vitest suite (100% green)
pnpm test

# Run strict TypeScript compiler checks and Vite production bundle
pnpm build
```

| Verification Check | Standard | Result |
| :--- | :--- | :--- |
| **Unit & Integration Suite** | Vitest 3.2.7 | **30 / 30 passed (184 tests green)** |
| **Type Integrity** | TypeScript 5.7 (`tsc -b`) | **0 errors (Strict Null Checks)** |
| **Production Build** | Vite 6.4.5 + Rollup | **1.85s build time, clean chunks** |
| **Internationalization** | Compile-Time LSP Checks | **100% Key Parity (`en` $\leftrightarrow$ `ar`)** |
| **Psychometric Choice Entropy** | Pearson χ² & Shannon Entropy | **χ² = 0.000, p = 1.000 (Exact 53/53/53/53)** |

---

## Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or higher

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/your-org/med-quests-apps.git
cd med-quests-apps

# Install dependencies
pnpm install

# Start local development server
pnpm dev

# Run test suite
pnpm test
```

---

## Normative Specification & Documentation

- [BRD.md](BRD.md) — Normative Business & Engineering Requirements Document
- [Psychometric Choice Entropy & Spatial Presentation Spec (SPEC-006)](specs/006-psychometric-choice-entropy-and-spatial-presentation/spec.md)
- [Psychometric Choice Entropy Port Contracts](specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts)
- [Global Question Bank & Editorial Governance Spec (SPEC-005)](specs/005-global-question-bank-governance/spec.md)
- [Global Question Bank Port Contracts](specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts)
- [Bilingual Architecture Specification (SPEC-004)](specs/004-bilingual-i18n-ai-localization/spec.md)
- [Bilingual Engineering Plan](specs/004-bilingual-i18n-ai-localization/plan.md)
- [i18n and AI Port Contracts](specs/004-bilingual-i18n-ai-localization/contracts/i18n-ai-language-ports.ts)
