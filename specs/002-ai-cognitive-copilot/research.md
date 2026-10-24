# Technical Research & Architectural Decisions: AI Cognitive Co-Pilot (`002-ai-cognitive-copilot`)

**Feature**: [spec.md](spec.md) | **Date**: 2026-10-24

---

## 1. Software Design Patterns & Clean Architecture

### Decision 1.1: Hexagonal Ports & Adapters + Strategy Pattern for Dual-Engine Intelligence
- **Decision**: Define a pure domain interface `AiEnginePort` with two interchangeable runtime strategies:
  1. `LocalGroundedTutorStrategy` (Default, 0ms network latency, 100% offline): Synthesizes Socratic hints, distractor comparisons, stem clue extraction, and study actions directly from the verified `Question` entity (`rationale`, `explanation`, `examTip`, `mnemonic`, `evidence`) and learner telemetry (`Attempt[]`, `ReviewCard`).
  2. `CloudStreamingAgentStrategy` (Opt-in via BYO Groq/Gemini key or Cloudflare Worker proxy): Connects via Server-Sent Events (SSE) with native tool-calling schemas.
- **Rationale**: Upholds Constitution **P8 (Local-First, Private, Free)** while delivering full ChatGPT/Gemini-class streaming when an API key is provided. Students without an API key or studying offline still experience 100% of the Co-Pilot's interactive tools, visual comparison tables, and Socratic guidance.
- **Alternatives Considered**: Cloud-only LLM integration (rejected: breaks offline capability and fails students without API keys).

### Decision 1.2: Domain-Level Policy Gate Decorator (Exam Integrity P5)
- **Decision**: Implement `enforceExamIntegrityGate(rawContext, sessionPolicy): SafeAiContext` as a pure function in `src/domain/ai/policyGate.ts`.
  - Uses TypeScript **Discriminated Unions** (`PracticeAiContext | ProctorOnlyAiContext`) so it is a compile-time error to access `correctChoiceId`, `isCorrect`, `rationale`, or `evidence` when `policy.aiAccess === 'proctor-only'`.
- **Rationale**: Prevents accidental leakage of answers in Mock/Exam mode at both compile time and runtime.
- **Alternatives Considered**: Hiding answers only in React UI components (rejected: violates Constitution P5).

### Decision 1.3: Command Pattern for Agentic Tool Execution
- **Decision**: Model all 5 tool suites (`Viewport`, `StudySession`, `KnowledgeRag`, `VisualArtifact`, `CreatorStudio`) as strongly-typed **Command Objects** (`AiToolCommand<TName>`) validated by Zod before execution and dispatched through a central `AiToolRegistry`.
- **Rationale**: Decouples the AI's intent (JSON tool call) from the side-effect implementation (Zustand viewport store mutation, Dexie transaction, or React Router navigation). Supports deterministic unit testing and one-click `undo()` on state-mutating commands.

---

## 2. Performance Engineering: Zero Loading Overhead & 60fps Fluid UX

### Decision 2.1: Zero-Impact Initial Bundle via Two-Stage Code Splitting
- **Decision**:
  1. Only a lightweight `useCopilotShortcut` listener and the `CopilotTriggerButton` (`< 1.2 KB` gzipped) mount in the initial `Shell.tsx`.
  2. The `AiCopilotDrawer`, tool executors, and cloud SSE adapters are loaded via `React.lazy()` + `import()` prefetching on hover/focus (`onMouseEnter` / `onFocus` of the trigger button or first `?` keypress).
- **Rationale**: Guarantees initial page load (LCP `< 1.5s`) and practice session startup (`< 50ms`) suffer zero degradation.

### Decision 2.2: `requestAnimationFrame` Token Batching (Zero Render Thrashing)
- **Decision**: Cloud LLMs like Groq stream at 300–800 tokens/second. Updating React state on every SSE chunk causes 300+ React reconciliations per second, dropping frame rates below 20fps. We buffer incoming SSE chunks in a mutable ref (`streamBufferRef`) and flush to Zustand/React state **at most once per animation frame (`16.6ms` via `requestAnimationFrame`)**.
- **Rationale**: Guarantees a locked **60fps / 120fps ProMotion** scrolling and typing experience even during ultra-fast token streaming.

### Decision 2.3: GPU-Composited Spring Animations & Interruptible Physics
- **Decision**:
  - Drawer entry/exit uses GPU-accelerated `transform: translate3d(x, 0, 0)` with Apple's spring-approximating curve `cubic-bezier(0.22, 1, 0.36, 1)` (`220ms` open, `160ms` close).
  - Stem clue highlights use an animated SVG/CSS gradient sweep (`background-size: 200% 100%`) that illuminates the diagnostic phrase in `180ms`.
  - Choice elimination uses a hardware-accelerated strikethrough line (`scaleX(0) → scaleX(1)` with `transform-origin: left`) and subtle opacity dim (`opacity: 0.48`).
  - Automatically disabled (`transition-duration: 0ms`) when `prefers-reduced-motion: reduce` is active or when `session.mode === 'rapid'`.
- **Rationale**: Delivers an effortless, tactile, Apple-grade interface that feels instantaneous and calm during long medical study blocks.
