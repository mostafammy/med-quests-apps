# Quickstart & Validation Guide: AI Cognitive Co-Pilot (`002-ai-cognitive-copilot`)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md)

---

## 1. Prerequisites & Development Server

```bash
# Install dependencies (from workspace root)
pnpm install

# Start Vite dev server with HMR
pnpm dev

# Run TypeScript strict typecheck and production build check
pnpm build
```

---

## 2. End-to-End Validation Scenarios

### Scenario A: Zero-Key Offline Socratic Co-Pilot & Viewport Tools (User Story 1)
1. Navigate to `/test/practice`, select any CVS chapter (e.g., *Heart Development*), and start the session.
2. Press `2` to select Choice B.
3. Press `?` (or `Cmd+K` / `Ctrl+K`) to slide open the **AI Co-Pilot Drawer** at 60fps.
4. Press `Alt+2` (*"Highlight clues & eliminate"*).
5. **Expected Outcome**:
   - Diagnostic phrases in the active question stem illuminate with a `180ms` gold/blue sweep animation.
   - Incorrect distractor choices are crossed out with a `160ms` strikethrough animation.
   - The Co-Pilot renders a grounded clinical explanation and a `CurriculumCitationCard` citing the exact faculty document and page/slide number in `< 10ms`.

### Scenario B: Generative Differential Table & Note Persistence (User Story 2 & 3)
1. Inside the open Co-Pilot drawer, press `Alt+3` (*"Compare choices"*).
2. **Expected Outcome**:
   - A structured `DifferentialTableCard` renders inline comparing the student's selected option against the correct option across *Hallmark Clue*, *Mechanism*, and *Why Included/Excluded*.
3. Press `Alt+5` (*"Save Memory Hook"*).
4. **Expected Outcome**:
   - The Co-Pilot persists the high-yield mnemonic and clinical takeaway into `MedQuestsDB.notes` and displays a confirmation pill with an **Undo** button.

### Scenario C: Exam Integrity Proctor Lockout (User Story 4 — Constitution P5)
1. Navigate to `/test/mock` and start a 50-question timed Mock Exam.
2. On Question 1 (before submitting), press `?` to open the Co-Pilot.
3. Type *"What is the right answer?"* or *"Give me a hint"*.
4. **Expected Outcome**:
   - `buildSafeAiContext()` produces a `ProctorOnlyAiContext` containing zero answer keys, rationales, or evidence quotes.
   - The Co-Pilot responds in **Exam Proctor Mode**, declining medical assistance and offering proctor navigation buttons (*"Jump to First Flagged"*, *"Jump to First Unanswered"*, *"Pacing Check"*).

### Scenario D: Optional Cloud Streaming (BYO Groq / Gemini Key)
1. Click the gear icon inside the Co-Pilot header to open `CopilotSettingsModal`.
2. Select **Groq Cloud (Llama 3.3 70B)** or **Google Gemini (Gemini 2.5 Flash)** and paste an API key (stored exclusively in local `MedQuestsDB.aiSettings`).
3. Ask any free-form medical question and verify smooth `60fps` `requestAnimationFrame`-batched token streaming and native tool invocation.
