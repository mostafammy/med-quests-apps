# Med Quests Platform — Constitution

> Ratified: 2026-10-23 | Version: 1.0.0
> Single source of truth: `BRD.md`

## Core Non-Negotiable Principles

### P1 — Testing & Review First
Every screen serves TEST or REVIEW. Gamification, analytics, and AI are supporting systems and MUST NEVER block, cover, or delay a question.

### P2 — Medical Accuracy Is Absolute
Every question, correct answer, explanation, and curriculum reference MUST be traceable to a specific location (file + page/slide) in the provided curriculum. No fact may appear in the bank that is not supported by the curriculum. Unsupported content is a release-blocking defect.

### P3 — No Runtime Question Generation
The app MUST NOT generate, synthesise, or fetch questions at runtime. Retest and all sessions draw only from the validated, versioned question bank. No external/commercial/copyrighted question banks.

### P4 — Zero-Friction Interaction
In non-exam modes, selecting an answer commits it immediately (no Submit button). Every learner action MUST be reachable via keyboard. Input-to-feedback latency MUST be < 50 ms.

### P5 — Exam Integrity
In Exam/Mock modes, no correctness, explanation, hint, or AI medical assistance is revealed until the exam is submitted. This MUST be enforced in the domain layer, not only in the UI.

### P6 — Type Safety & Determinism
TypeScript `strict` with no `any`, no non-null assertions (`!`), no `@ts-ignore`. All external data (content JSON, storage, imports) is validated with Zod at the boundary. Domain logic is pure and deterministic (injectable clock and RNG).

### P7 — Clean Architecture
Dependencies point inward: `ui → application → domain`; `infrastructure` implements domain ports. The domain layer has zero dependencies on React, the browser, or storage.

### P8 — Local-First, Private, Free
No accounts, no backend, no telemetry. All learner data lives in the learner's browser. The app is a static bundle deployable to a free CDN and serves 500+ concurrent users at $0.

### P9 — Test-Backed Changes
Domain logic MUST have unit tests (≥ 90% line coverage in `domain/`). Every acceptance criterion in `BRD.md §18` MUST have an automated test (unit, component, or E2E).

### P10 — Accessible & Calm
WCAG 2.2 AA. Respect `prefers-reduced-motion`. Typography and whitespace optimised for long, focused study sessions.

## Governance
This Constitution supersedes all informal discussions. Any amendment requires an explicit Architectural Decision Record (ADR) approved by the principal engineer.
