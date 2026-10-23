# Med Quests Platform

A premium medical exam preparation web app engineered for medical students.

## Architecture

Built as a **Multi-Block Medical Platform** following Clean Architecture:
- **Block-Level Integration:** Simulates real university block exams (e.g. Block 206 — CVS).
- **Core Loop:** `TEST → ANSWER → GET RESULT → UNDERSTAND MISTAKE → IDENTIFY WEAKNESS → REVIEW CURRICULUM → RETEST`.
- **Zero-Friction:** Keyboard-first spatial navigation (`1–5`, `←`/`→`, `↑`/`↓`), immediate answer commit, sub-50ms feedback.
- **Local-First & Private:** Stored client-side via IndexedDB (Dexie.js), zero server requirement, 100% free hosting for 500+ students.
- **Multimodal AI Question Studio:** Built-in prompt generator and Zod-validated ingestion gate for frontier AI portals (Google AI Studio / Claude).

## Repository Organization

```
Med Quests Apps/
├── .specify/                            # Spec-Kit configuration & memory
├── .agents/                             # Agent workflows
├── BRD.md                               # Business & Engineering Requirements
├── curriculum/                          # Raw Faculty Materials (Read-only)
│   └── cvs/
│       ├── anatomy/                     # Anatomy PDFs
│       ├── histology/                   # Histology PPTXs
│       └── microbiology/                # Microbiology DOCX
├── content/                             # Structured Medical Intelligence
│   └── cvs/
│       ├── taxonomy.json                # Block taxonomy
│       └── dist/bank.v1.json            # Validated question bank
└── src/                                 # Vite + React (TypeScript) SPA
```

## Normative Specification

All requirements, domain models, algorithms, keyboard mappings, and acceptance criteria are documented in [BRD.md](BRD.md).
