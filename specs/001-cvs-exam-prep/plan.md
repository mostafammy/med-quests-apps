# Implementation Plan: CVS Block Exam Preparation Platform

**Branch**: `001-cvs-exam-prep` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-cvs-exam-prep/spec.md` & `BRD.md`

## Summary

Build a high-performance, keyboard-first medical exam preparation web app for medical students studying the CVS block (Block 206). The architecture uses a local-first static SPA approach (Vite, React 19, TypeScript, Tailwind CSS v4, Dexie IndexedDB) with zero server infrastructure, sub-50ms answer evaluation, strict exam mode simulation, and a built-in Question Studio for zero-cost multimodal question ingestion via Google AI Studio / Claude.

## Technical Context

**Language/Version**: TypeScript 5.7+ (Strict Mode)
**Primary Dependencies**: React 19, React Router 7, Zustand 5, Zod 3, Lucide React, Dexie.js (IndexedDB), Tailwind CSS v4
**Storage**: Client-side IndexedDB (`MedQuestsDB`) via Dexie.js (Zero server required, local-first)
**Testing**: Vitest + Playwright (E2E for keyboard navigation and exam integrity)
**Target Platform**: Modern Web Browsers (Chrome, Safari, Firefox, Edge, iOS Safari)
**Project Type**: Static Web Application (SPA) deployable to Cloudflare Pages / Vercel
**Performance Goals**: Input-to-feedback latency < 50 ms; Initial load < 1.5 s; 60 fps transitions
**Constraints**: Fully offline capable; $0 hosting cost for 500+ students; No API key leakage; WCAG 2.2 AA compliant
**Scale/Scope**: 390+ question bank, 30 canonical topics, 6 faculty source files, 5 session modes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **P1 — Testing & Review First**: App shell and dashboard prioritize active testing and weak-area remediation; zero decorative blockers.
- [x] **P2 — Medical Accuracy Is Absolute**: Every question requires a verbatim evidence quote proving the answer from faculty curriculum files.
- [x] **P3 — No Runtime Question Generation**: Pre-validated static bank only; no synthetic filler or runtime hallucinations.
- [x] **P4 — Zero-Friction Interaction**: Direct commit on keys `1`–`4` with immediate evaluation in Practice mode; no submit button.
- [x] **P5 — Exam Integrity**: Exam and Mock modes strictly withhold correctness and explanations until final submission.
- [x] **P6 — Type Safety & Determinism**: 100% strict TypeScript, Zod schema validation at all data boundaries.
- [x] **P7 — Clean Architecture**: Inward-pointing layers: `ui → application → domain` with pure domain reducers.
- [x] **P8 — Local-First, Private, Free**: Data lives in IndexedDB; static hosting on Cloudflare Pages serves 500+ students for $0.
- [x] **P9 — Test-Backed Changes**: All acceptance scenarios backed by automated unit and E2E tests.
- [x] **P10 — Accessible & Calm**: Semantic HTML, visible focus states, high-contrast palette, zero unnecessary motion.

## Project Structure

```text
specs/001-cvs-exam-prep/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Technical research & architectural decisions
├── data-model.md        # Domain entities, Zod schemas & database tables
├── quickstart.md        # Developer setup and test running guide
├── contracts/           # API and data contracts
└── tasks.md             # Breakdown of implementation tasks
```

### Source Code Architecture

```text
src/
├── domain/              # Pure business logic (Zero external dependencies)
│   ├── model/          # Entities & Zod Schemas (Question, Attempt, Session)
│   ├── taxonomy/       # Canonical CVS Block 206 Taxonomy
│   ├── session/        # Reducers and mode policies (Practice, Mock, Rapid)
│   └── analytics/      # Mastery, readiness & spaced-repetition algorithms
├── application/         # Application state & use cases
│   └── stores/         # Zustand stores (useQuestionStore, useSessionStore)
├── infrastructure/      # Storage & platform adapters
│   └── storage/        # Dexie IndexedDB repository
└── ui/                  # Apple-grade React interface
    ├── app/            # Shell, Navigation & Layout
    └── features/       # Feature views (dashboard, test, review, curriculum, studio)
```
