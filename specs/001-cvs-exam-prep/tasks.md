# Tasks: CVS Block Exam Preparation Platform

**Feature Branch**: `001-cvs-exam-prep`
**Input**: Design documents from `specs/001-cvs-exam-prep/` & `BRD.md`
**Constitution**: `.specify/memory/constitution.md`

## Phase 1: Setup & Environment (Shared Infrastructure)
- [x] T001 Initialize Git repository at `Med Quests Apps` root on branch `main`
- [x] T002 Ratify Constitution in `.specify/memory/constitution.md`
- [x] T003 Initialize Vite + React 19 + TypeScript + Tailwind CSS v4 using `pnpm`
- [x] T004 [P] Configure strict `tsconfig.json`, `tsconfig.app.json`, and `vite.config.ts`
- [x] T005 [P] Setup root `.gitignore` with strict exclusion rules

---

## Phase 2: Foundational (Core Models & Persistence)
- [x] T006 Implement canonical Domain Types and Zod validation schemas in `src/domain/model/types.ts`
- [x] T007 Implement 30-topic canonical CVS Block 206 taxonomy in `src/domain/taxonomy/cvsTaxonomy.ts`
- [x] T008 [P] Implement client-side IndexedDB persistence with Dexie.js in `src/infrastructure/storage/db.ts`
- [x] T009 Implement reactive Zustand question store with Zod ingestion in `src/application/stores/useQuestionStore.ts`
- [x] T010 [P] Author seed question bank from official self-assessment in `content/cvs/dist/bank.v1.json`

---

## Phase 3: User Story 1 - Quick Practice Engine (Priority: P1) 🎯 MVP
- [x] T011 [US1] Build Quick Practice setup view in `src/ui/features/test/QuickPractice.tsx`
- [x] T012 [US1] Build Session Player with spatial keyboard navigation (`1–4`, `←`/`→`, `Enter`) in `src/ui/features/test/SessionPlayer.tsx`
- [x] T013 [US1] Implement immediate answer commit (zero submit button) with instant green/red evaluation
- [x] T014 [US1] Render comprehensive clinical explanation and curriculum citation upon answer commit

---

## Phase 4: User Story 2 - Full 2-Hour Mock Examination (Priority: P2)
- [x] T015 [US2] Build Mock Exam setup view in `src/ui/features/test/MockExamSetup.tsx`
- [x] T016 [US2] Implement dark exam chrome layout with active countdown timer (120:00) in `SessionPlayer.tsx`
- [x] T017 [US2] Enforce exam integrity: withhold all correctness, explanations, and hints until submission
- [x] T018 [US2] Implement question flagging (`F`) and direct question grid navigation

---

## Phase 5: User Story 3 - Mistakes Workspace & Weak Areas (Priority: P3)
- [x] T019 [US3] Build Review Hub in `src/ui/features/review/ReviewHub.tsx`
- [x] T020 [US3] Implement Weak Areas list ranked by mastery percentage with 🔴 🟠 🟡 🟢 color badges
- [x] T021 [US3] Implement Mistakes workspace categorizing repeated errors and danger-zone mistakes
- [x] T022 [US3] Add 3-day exam review action roadmap

---

## Phase 6: User Story 4 - Multimodal Question Ingestion Studio (Priority: P4)
- [x] T023 [US4] Build Question Studio UI in `src/ui/features/studio/QuestionStudio.tsx`
- [x] T024 [US4] Implement chapter-calibrated System Prompt Generator for Google AI Studio / Claude
- [x] T025 [US4] Implement client-side Zod validation gate verifying 4 choices, 1 correct key, and evidence quotes
- [x] T026 [US4] Implement one-click export for shipped bank (`bank.v1.json`)

---

## Phase 7: Next Phase — Post-Test Report & Comprehensive Bank Population (In Progress)
- [ ] T027 [P] [US1/US2] Build Post-Test Exam Report view (`src/ui/features/test/PostTestReport.tsx`) with score %, calibration, and curriculum review plan
- [ ] T028 [US1/US2] Implement "Retest Mistakes" action looping back to Session Player with missed questions
- [ ] T029 [P] Author and validate 25 high-yield questions for CVS Anatomy (Chambers, Valves, Coronaries) in `bank.v1.json`
- [ ] T030 [P] Author and validate 25 high-yield questions for Cardiac Embryology (Looping, Septation, Anomalies) in `bank.v1.json`
- [ ] T031 [P] Author and validate 20 high-yield questions for Blood Vessel Histology & Capillaries in `bank.v1.json`
- [ ] T032 [P] Author and validate 20 high-yield questions for Microbiology (JONES criteria, IE, Myocarditis) in `bank.v1.json`
