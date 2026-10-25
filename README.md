# Med Quests Platform — Enterprise Medical Intelligence System

[![TypeScript 5.7](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript&style=flat-square)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.3-61dafb.svg?logo=react&style=flat-square)](https://react.dev/)
[![Cloudflare Workers & D1](https://img.shields.io/badge/Edge-Cloudflare%20Workers%20%2B%20D1-orange.svg?logo=cloudflare&style=flat-square)](https://workers.cloudflare.com/)
[![Local-First Dexie 4](https://img.shields.io/badge/Storage-IndexedDB%20(Dexie%204)-emerald.svg?style=flat-square)](https://dexie.org/)
[![Vitest](https://img.shields.io/badge/Vitest-108%20Passing%20Tests-success.svg?logo=vitest&style=flat-square)](https://vitest.dev/)
[![Apple HIG](https://img.shields.io/badge/Design-Apple%20Human%20Interface%20Caliber-black.svg?logo=apple&style=flat-square)](https://developer.apple.com/design/human-interface-guidelines/)

An enterprise-caliber, local-first medical intelligence and exam preparation platform engineered for medical students and institutional faculty. Designed with strict **Clean Architecture**, sub-millisecond local caching, autonomous multi-turn Socratic AI reasoning, bilingual Arabic/English clinical localization, and global question bank governance.

---

## 🏛 High-Level Architecture Overview

Med Quests implements a decoupled, event-driven hexagonal architecture that seamlessly bridges offline-first browser storage with ultra-low latency Cloudflare Edge workers.

```mermaid
flowchart TD
    subgraph Client["Browser Client (React 19 + TypeScript Strict + Tailwind v4)"]
        UI["Presentation Layer\n(Apple-Caliber Glassmorphic UI & BiDi Arabic RTL)"]
        Stores["State Layer (Zustand 5)\nuseAuthStore • useCopilotStore • useQuestionStore • useLocaleStore"]
        Domain["Domain Core (Zero-Dependency Business Logic)\nAnomalies • Tiers • Quality Gate • P-V Loops • Socratic Prompts"]
        Storage["Persistence (IndexedDB via Dexie 4)\n0ms Cache • Sync Cursors • User Telemetry • Canonical Bank"]
    end

    subgraph Edge["Cloudflare Global Network (300+ Edge Locations)"]
        Worker["Cloudflare Worker (Hono Router / REST API)"]
        D1["Cloudflare D1 (Serverless Distributed SQLite)\nCanonical Questions • Submissions • Device Fingerprints • Audit Logs"]
        KV["Cloudflare KV (Zero-Trust Session Invalidation & Anomaly Flags)"]
    end

    subgraph External["Frontier AI Cloud Providers (BYOK + Failover Engine)"]
        Groq["Groq LPU (~50ms Instant Inference)"]
        Gemini["Google Gemini 2.5/3.5/3.8 Flash (Deep Reasoning & Tool Use)"]
        OpenRouter["OpenRouter (Nemotron 3.5 Lightning / Flint v1.0 MoE)"]
    end

    UI --> Stores
    Stores --> Domain
    Domain --> Storage
    Stores <--> Worker
    Worker --> D1
    Worker --> KV
    Domain <--> External
```

---

## 🔬 Core System Capabilities & Technical Depth

### 1. Autonomous Socratic AI Clinical Co-Pilot (`specs/002`)
* **Multi-Turn Tool Orchestration:** Autonomous reasoning loop with multi-step tool execution:
  * **Hemodynamic P-V Loop Simulation:** Mathematical modeling of Left Ventricular pressure-volume relationships under preload, afterload, and contractility shifts with interactive SVG visualization.
  * **Cardiovascular Equations:** Dynamic MAP, Cardiac Output, SVR, and stroke work calculators.
  * **Peer Distractor Traps & Mnemonics:** Automated distractor trap analysis and high-yield board mnemonics.
* **Resilient Engine Failover:** Intercepts 429/quota exhaustion and automatically hot-swaps to secondary standby engines (Groq ⇄ Gemini ⇄ OpenRouter) with zero state loss.
* **Instant Sub-Millisecond Response Cache:** IndexedDB response caching keyed by question, action, and language (`{questionId}:{actionKey}:{lang}`) achieving **0ms latency** on repeated high-yield clinical power actions.

### 2. Edge Auth, Zero-Trust Anomaly Detection & Hardware Telemetry (`specs/003`)
* **Zero-Dependency Client Hardware Probing:** Evaluates hardware concurrency, device memory, WebGL unmasked GPU renderer, network round-trip time, battery status, and touch capability to classify client hardware tiers (`low-spec`, `balanced`, `high-spec`).
* **Session Security & Geo-Anomaly Engine:** Detects impossible travel (speed > 900 km/h between Cloudflare edge colos), concurrent device limits, IP threat scores, and JA4 TLS fingerprint alterations.
* **Institutional Governance Cockpit:** Dedicated administrative dashboard at `/admin` featuring real-time KPI aggregates, device telemetry breakdowns, per-student AI toggles, and one-click demo data purge for audit compliance.

### 3. Bilingual Medical English / Arabic Localization (`specs/004`)
* **BiDi Script Detection & Isolation:** Unicode character range analysis (`[\u0600-\u06FF]`) with `unicode-bidi: isolate` ensuring mixed clinical vignettes (e.g. Arabic explanations referencing English anatomical terms) never suffer layout corruption.
* **Medical Terminology Protection:** Specialized clinical language policies enforce strict retention of USMLE/Board Latin and English terminology in brackets alongside Arabic medical explanations.
* **Typography:** Tailored font hierarchies with `IBM Plex Sans Arabic`, `SF Arabic`, and `Cairo` fallbacks with letter-spacing normalization.

### 4. Global Question Bank Governance & Peer-Review Pipeline (`specs/005`)
* **Cryptographic Stem Invariant Deduplication:** Canonical SHA-256 fingerprinting normalizing punctuation, casing, and whitespace for $O(1)$ duplicate collision prevention.
* **Automated Multi-Stage Quality Gate:** Pre-submission validation guaranteeing strict Zod schema conformance, exactly one correct choice, distractor rationales, and textbook clinical citation evidence.
* **Three-Way Non-Destructive Delta Sync:** Server revision tracking with non-destructive merge logic that reconciles incoming global bank deltas while strictly preserving student bookmarks, notes, and local attempt telemetry.

---

## 🔄 Detailed Architectural Workflows

### Multi-Tier AI Socratic Reasoning & Provider Failover Loop

```mermaid
sequenceDiagram
    autonumber
    actor Student as Medical Student
    participant UI as AiCopilotDrawer (React)
    participant Store as useCopilotStore (Zustand)
    participant Cache as PowerActionCache (Dexie)
    participant Orch as AgenticOrchestrator
    participant Reg as EngineRegistry
    participant Primary as Primary Provider (Groq)
    participant Standby as Backup Provider (Gemini)

    Student->>UI: Clicks "Pressure-Volume Loop"
    UI->>Store: executePowerAction('pv_loop')
    Store->>Cache: getCachedAction(questionId, 'pv_loop', 'ar')
    alt Cache Hit (0ms)
        Cache-->>Store: Return Cached Response & SVG Model
        Store-->>UI: Instantly render PV-Loop Card
    else Cache Miss
        Store->>Orch: streamTurn(messages, tools, context)
        Orch->>Reg: resolveAiProvider(settings)
        Reg-->>Orch: Resolved Primary (Groq LPU)
        Orch->>Primary: Stream SSE Request
        alt Primary Rate Limited (429 / Quota)
            Primary-->>Orch: 429 Resource Exhausted
            Orch->>Reg: getAvailableFallbackProvider('groq')
            Reg-->>Orch: Fallback to Google Gemini 2.5 Flash
            Orch-->>UI: Emit 'engine-resolved' (GEMINI Backup)
            Orch->>Standby: Resume Stream with Clinical Tools
            Standby-->>Orch: Tool Call: calculatePvLoop({...})
            Orch->>Orch: Execute Clinical Modeling Tool
            Orch->>Standby: Return Tool Result
            Standby-->>Orch: Final Synthesis & Text Stream
        else Normal Stream
            Primary-->>Orch: Tokens & Interactive Cards
        end
        Orch-->>Store: Dispatch Chunks to UI
        Store->>Cache: saveCachedAction(questionId, 'pv_loop', parts, 'ar')
        Store-->>UI: Complete Streaming & Update Drawer
    end
```

---

### Non-Destructive Global Bank Delta Synchronization

```mermaid
flowchart LR
    subgraph Local["Client IndexedDB"]
        LocalQuestions["Local Questions Bank"]
        UserProgress["Bookmarks & Attempt Notes"]
        LocalCursor["Sync Cursor (Server Rev: 3)"]
    end

    subgraph Network["Cloudflare Edge API"]
        DeltaEndpoint["GET /api/bank/cvs/delta?since=3"]
        WorkerRouter["Cloudflare Worker"]
        D1DB[("Cloudflare D1 Database\nCanonical Revision: 5")]
    end

    subgraph MergeEngine["Domain Core Merge Engine"]
        ThreeWayMerge["Three-Way Non-Destructive Merge\n(CanonicalHasher + ProgressMerge)"]
        UpdatedBank["Updated Unified Bank\n(Preserved User Flags + New Content)"]
    end

    LocalCursor -->|Query Delta| DeltaEndpoint
    DeltaEndpoint --> WorkerRouter
    WorkerRouter --> D1DB
    D1DB -->|Delta: Revisions 4 & 5| DeltaEndpoint
    DeltaEndpoint --> ThreeWayMerge
    LocalQuestions --> ThreeWayMerge
    UserProgress --> ThreeWayMerge
    ThreeWayMerge --> UpdatedBank
    UpdatedBank -->|Atomic Bulk Put| LocalQuestions
```

---

## 📊 Comprehensive Release & Commit Engineering Log

Every file in the repository has been committed atomically, step by step, following the **Conventional Commits** specification. Below is the historical audit trail representing the engineering depth of the platform:

```
eb3c612 feat(ui): wire full-screen admin route and global modal state in App Shell
51d0d2e feat(admin): refine institutional admin dashboard with responsive cards and anomaly feeds
f3f8cf1 feat(auth): enhance governance drawer with direct navigation link to full admin dashboard
b842cc3 feat(auth): refine authentication security modal with seamless session termination
49131bf feat(ai): enhance fallback routing and engine recovery telemetry in registry
85b6cbb test(ai): add unit test suite for multi-tier power action cache service
0d17576 test(ai): add unit test suite for clinical power action prompt generators
11dcc9a feat(ai): refine power action definitions with clinical heuristics and fallback handlers
f7ee012 feat(ai): implement auto-failover to standby provider on stream turn rate limit
f7829f7 fix(ai): clarify OpenRouter free tier API key requirement and rate limit remediation
d83b2f5 docs(i18n): document bilingual clinical AI language ports and contracts
29848d9 feat(state): track active resolved engine in copilot store for failover feedback
4346235 docs(i18n): document bilingual clinical localization and translation specification
410bac6 docs(i18n): document bilingual architecture execution and implementation plan
74d10f6 feat(state): sync activeResolvedEngine on engine-resolved stream events
6171462 feat(ui): display active fallback engine indicator badge in copilot drawer header
f508be5 test(ai): add arabic medical directive and tool preservation unit test
67f2e80 feat(i18n): create Arabic clinical medical dictionary with bilingual terminology mappings
50cbce5 feat(ai): inject language directive into clinical system prompt in agentic orchestrator
14e77e0 feat(state): connect power actions execution to active chat language preference
eb34fdc docs(governance): update governance interface contracts with mutable arrays
dfeb76a db(migrations): add D1 migrations for canonical question bank and review queue
6b978fc feat(worker): implement Cloudflare edge endpoints for delta sync & reviews
e1d4d03 feat(governance): implement cryptographic SHA-256 stem normalizer and hasher
69aa91f feat(governance): implement multi-stage editorial quality gate pipeline
59ec254 feat(governance): implement editorial state machine with inline reviewer patch
2ecbc0c feat(governance): implement three-way non-destructive delta merge strategy
5be9da8 feat(governance): implement composable query specifications and KPI aggregator
0ecb968 test(governance): add unit test suite for stem hashing and quality gate
b90f11d refactor(ai): clean up unused import declarations in tool registry
6ab1448 feat(ai): enhance clinical system prompt with bilingual directives & RTL
4010a30 test(ai): add unit test for language directive injection in prompt builder
8d6ad34 feat(storage): expand Dexie database schema for global bank sync metadata
5ec8231 feat(infrastructure): implement HTTP client gateway for Edge Question Bank API
b39e6a9 feat(state): integrate non-destructive delta sync and submission workflows
51b22e1 feat(state): create Zustand store for editorial review queue and governance
977f0a8 test(state): add unit test suite for reactive locale store and RTL layout
ca9a81e style(theme): add bilingual typography styles and BiDi unicode isolation
0937c89 feat(ui): create Apple-styled bilingual English/Arabic locale toggle button
c5e8c18 feat(ui): mount bilingual locale toggle and dynamic translated navigation
1d293ff feat(ui): add script detection and BiDi text directionality in Copilot Markdown
2a0f8bf feat(ui): render localized Arabic action labels and tooltips in quick actions
820e118 feat(ui): add language toggle badge and localized prompts in Copilot drawer
ea74834 feat(ui): create institutional question bank governance review workspace
796f60a feat(ui): embed question bank review panel tab in governance dashboard
f8fbce1 feat(ui): add peer review submission and cloud bank sync in Question Studio
4ad5687 feat(ui): update question matrix modal with localized labels and RTL
984464c feat(ui): enhance question navigator strip with BiDi isolation and hint badges
5cb11be feat(ui): support bilingual medical vignettes and RTL layout in Session Player
f02ef29 feat(ui): support localized score breakdown and remediation in Post-Test report
5a5c53b feat(auth): add question-bank tab enum to governance view tabs in auth store
0fa2c4b feat(ai): integrate ChatLanguagePolicy context resolution in cache saving
762ee71 feat(ui): mount QuestionBankGovernancePanel in slide-over governance drawer
0beac39 feat(ui): render bilingual language preference cards in Co-Pilot settings
2cdc5bf style(test): refine question matrix modal pill contrast and glassmorphism
```

---

## 🛠 Technology Stack Breakdown

| Layer | Technologies & Tools | Engineering Rationale |
|---|---|---|
| **Frontend Framework** | **React 19.3.1**, **TypeScript 5.7 (strict: true)** | Compiler-level type safety, React Server Component readiness, and high-performance concurrent hooks. |
| **State Architecture** | **Zustand 5** | Minimal footprint, reactive selectors, zero unnecessary re-renders, and modular store partitioning. |
| **Local Persistence** | **Dexie.js 4.0 (IndexedDB)** | Sub-millisecond indexed transactions, offline test persistence, and zero cloud requirement. |
| **Edge Compute** | **Cloudflare Workers (V8 Edge Runtime)** | 300+ edge datacenter deployments, $0$ cold starts, and geographical request telemetry extraction. |
| **Edge Database** | **Cloudflare D1 (SQLite Engine)** | Serverless globally distributed relational database for revision-controlled question banks and audit trails. |
| **AI Inference** | **Groq LPU, Gemini API, OpenRouter** | Multi-provider redundancy with intelligent automated failover and streaming function calling. |
| **Design Language** | **Apple Human Interface Guidelines (Tailwind v4)** | Glassmorphism, tactile spring physics, dynamic kinetic typography, and fluid responsive drawer views. |
| **Test Engineering** | **Vitest 3.2** | Blazing-fast parallel test runner executing 108 unit tests across pure domain logic in < 1.5 seconds. |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 20.0.0`
- pnpm `>= 9.0.0`
- Cloudflare Wrangler CLI (optional, for edge worker deployment)

### Local Development Setup
```bash
# 1. Clone the repository
git clone https://github.com/mostafammy/med-quests-apps.git
cd med-quests-apps

# 2. Install pinned monorepo dependencies
pnpm install

# 3. Launch local Vite development server
pnpm dev

# 4. Run automated test suite
pnpm test --run

# 5. Execute production build
pnpm build
```

---

## 📜 Quality & Governance Summary
- **Tests:** 16 test suites, **108 unit tests**, 100% pass rate.
- **TypeScript:** Strict type validation with 0 `any` escapes in domain contracts.
- **Security:** Zero leaked tokens, automated credential anomaly detection, and client-side privacy adherence.
- **License:** MIT License. Developed for University Medical Faculties & Academic Scholars.
