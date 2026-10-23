# Feature Specification: CVS Block Exam Preparation Platform

**Feature Branch**: `001-cvs-exam-prep`
**Created**: 2026-10-23
**Status**: Approved
**Input**: Business Requirements Document (`BRD.md`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Practice with Immediate Answer Feedback (Priority: P1)

A medical student opens the app to practice a specific CVS chapter (e.g. Heart Development or Rheumatic Fever). They select their chapter, click "Start Test", and are presented with the first question immediately with zero friction. When they press `1`, `2`, `3`, or `4` on their keyboard, their choice is committed immediately without a Submit button. Correctness is evaluated instantly, followed by a comprehensive clinical explanation and curriculum citation linking back to the faculty handout.

**Why this priority**: Core Product Loop (Job 1: Test My Knowledge). High throughput and zero-friction keyboard testing are the primary value drivers of the platform.

**Independent Test**: Can be fully tested by selecting "Heart Development" in Quick Practice, pressing `2` to commit Option B, and verifying that the evaluation, explanation, and curriculum citation appear within 50 ms without any mouse clicks.

**Acceptance Scenarios**:
1. **Given** a learner in Quick Practice, **When** they press `1`–`4`, **Then** the corresponding choice is committed, evaluated, and highlighted within 50 ms, And no Submit button is shown.
2. **Given** an incorrect answer, **When** feedback renders, **Then** the student sees why the choice is wrong, why the key is right, and the exact faculty document and page number proving it.
3. **Given** an answered question, **When** the student presses `Enter` or `→`, **Then** the app navigates immediately to the next question.

---

### User Story 2 - Full 2-Hour Mock Examination Simulation (Priority: P2)

A student wants to simulate the real university CVS Block 206 exam under timed conditions. They start a Mock Exam of 50 questions across Anatomy, Histology, and Microbiology with a 2-hour countdown timer. Selecting answers records choices silently without green/red feedback, explanations, or medical hints. Flagging (`F`) and free grid navigation are available. When submitted or when the timer reaches 0:00, a comprehensive exam report is generated.

**Why this priority**: Essential for exam readiness calibration and assessing performance under authentic exam pressure.

**Independent Test**: Can be tested by starting a Mock Exam, answering 5 questions, verifying no correctness or explanations leak into the DOM, and submitting to verify that score, accuracy, and weak-area breakdowns appear.

**Acceptance Scenarios**:
1. **Given** an active Mock Exam session, **When** the learner selects an answer, **Then** the selection is recorded silently without revealing correctness, explanations, or rationales.
2. **Given** 120 minutes configured, **When** the session starts, **Then** a visible countdown timer decrements from 120:00, And auto-submits upon reaching 0:00.
3. **Given** exam submission, **Then** the report reveals score percentage, correct/incorrect/unanswered counts, average time per question, and chapter breakdown.

---

### User Story 3 - Mistakes Workspace & Weak Area Remediation (Priority: P3)

The student opens the Mistakes or Weak Areas workspace to answer "What do I need to review before my exam?". The system identifies questions the student repeatedly gets wrong (≥ 2 errors) and danger-zone mistakes (incorrect answers with high confidence). The student clicks "Start Mistake Review" to launch a focused retest session consisting solely of these unresolved questions.

**Why this priority**: Job 2: Review For My Exam. Transforms raw error data into an actionable revision plan.

**Independent Test**: Answer 3 questions incorrectly in practice, navigate to `/review`, verify that the questions appear categorized under Mistakes, and click "Start Mistake Review" to launch a focused session.

**Acceptance Scenarios**:
1. **Given** questions with prior incorrect attempts, **When** the learner opens `/review`, **Then** questions are classified into repeated errors, danger-zone mistakes, and overdue reviews.
2. **Given** the Weak Areas list, **When** viewing topics, **Then** topics are ranked ascending by mastery percentage with 🔴 critical, 🟠 weak, 🟡 developing, and 🟢 strong visual bands.
3. **Given** any weak topic, **When** clicking `[Practice]`, **Then** a focused 10–15 question session is launched immediately.

---

### User Story 4 - Multimodal Question Ingestion Studio (Priority: P4)

A faculty member or student wants to expand the CVS question bank without writing code or paying for LLM APIs. They open `/studio`, select a chapter, and click "Copy Master Generation Prompt". They upload the lecture PDF/PPTX into Google AI Studio (free Gemini 1.5 Pro 2M window), run the prompt, and paste the generated JSON array into the Ingestion Gate. The app validates the batch against Zod schemas and merges it into the local IndexedDB bank.

**Why this priority**: Enables infinite, high-quality, vision-grounded question expansion at $0 API cost.

**Independent Test**: Copy the prompt for "Histology of Blood Vessels", paste a valid JSON array into the Studio, and verify that all questions pass validation and appear in the question bank.

**Acceptance Scenarios**:
1. **Given** a chosen chapter in Studio, **When** clicking "Copy Prompt", **Then** a pre-calibrated system prompt with exact topic IDs and Zod schema is copied to the clipboard.
2. **Given** pasted JSON, **When** clicking "Validate & Ingest", **Then** the Zod validator verifies 4 choices, 1 correct choice, evidence quotes, and distractor rationales.
3. **Given** valid questions, **When** ingested, **Then** questions are merged into IndexedDB and immediately testable in Practice Mode.

---

## Edge Cases

- **Empty Question Pool:** If a student selects a chapter with 0 loaded questions, the player displays a clean state guiding them to open the Question Studio.
- **Timer Expiry during Exam:** If the 120-minute timer hits 0:00 while the student is thinking, the session auto-submits gracefully with `reason: 'timeout'` and unanswered items marked as `unanswered`.
- **Keyboard Repeat Suppress:** Holding down keys `1`–`4` or `Enter` does not trigger duplicate submissions.
- **Offline Operation:** The entire application and IndexedDB store run with 0 external network requests (local-first).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide keyboard-first spatial navigation (`1–4` to answer, `←`/`→` for questions, `Enter` to advance).
- **FR-002**: In Practice mode, selecting an answer MUST commit and evaluate immediately without an additional Submit button.
- **FR-003**: In Exam and Mock modes, the system MUST withhold all correctness, explanations, and hints until the exam is submitted.
- **FR-004**: System MUST enforce exactly 4 choices (`a`, `b`, `c`, `d`) for all Single Best Answer questions.
- **FR-005**: Every question MUST include a verbatim curriculum evidence quote citing the source document and page/slide number.
- **FR-006**: System MUST persist attempts, review cards, and bookmarks locally in the browser using IndexedDB.
- **FR-007**: System MUST provide a Question Studio (`/studio`) that generates chapter-specific prompts and validates pasted JSON batches via Zod.
- **FR-008**: System MUST support exporting the merged question bank to a single `bank.v1.json` file.
- **FR-009**: The Mock Exam MUST default to 50 questions across all CVS subjects with a 2-hour (120 minute) countdown timer.
- **FR-010**: The Dashboard MUST display exactly ONE prioritized recommendation answering "What should I do now?".

### Non-Functional Requirements

- **NFR-001 (Performance):** Input-to-feedback response latency MUST be < 50 ms.
- **NFR-002 (Type Safety):** 100% TypeScript strict mode with zero `any`, no non-null assertions, and no lint warnings.
- **NFR-003 (Hosting & Scale):** Static Single Page Application deployable to Cloudflare Pages / Vercel for $0, serving 500+ students without backend infrastructure.
- **NFR-004 (Accessibility):** WCAG 2.2 AA compliant with high-contrast text, visible focus rings, and screen-reader accessible choice labels.

---

## Success Criteria *(mandatory)*

- **SC-001**: A medical student can complete a full 20-question practice session and review mistakes using only the keyboard.
- **SC-002**: 100% of questions in the question bank trace to verified faculty curriculum excerpts.
- **SC-003**: 0% answer leaks or correctness reveals in Mock Exam mode before submission.
- **SC-004**: Production build succeeds in under 2 seconds with zero TypeScript or bundling errors.
