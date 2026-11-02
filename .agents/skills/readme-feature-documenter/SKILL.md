---
name: readme-feature-documenter
description: Documents a specific part of the application (feature, module, service, screen, API, data flow) in the project README to a production-grade, recruiter-impressive standard, using clear structure, Mermaid architecture diagrams, and an engineering-review process run by four personas (CTO, Principal SWE, QA Engineering Manager, CEO). Use when the user asks to add, update, or improve README documentation for a feature or component, "document this part", "add this to the README", or wants the README to showcase engineering depth. Don't use for inline code comments, API reference generation, or changelogs.
---

# README Feature Documenter

Turn a part of the codebase into a README section that a hiring manager can skim in 60 seconds and an engineer can trust in 10 minutes. Every claim must be verified against the code, never invented.

## Core Principles

1. **Truth over polish.** Document only what the code does. Read the source, tests, and config first. If something is unclear, ask the user or mark it `TODO(verify)`. Never fabricate metrics, benchmarks, or features.
2. **User value first, then engineering depth.** Lead with what the user gains, then show how it is built.
3. **Show, don't claim.** Replace adjectives ("robust", "scalable") with evidence: a diagram, a test count, a measured number, a named pattern.
4. **Scannable.** Short paragraphs, tables, headings, and one diagram per concept. No walls of text.
5. **Preserve the existing README.** Match its tone and heading levels, and keep unrelated content untouched. Update the table of contents if one exists.

## Workflow

### Phase 1: Scope and Discover
1. Identify the exact part the user means. If ambiguous, ask one concise question.
2. Read: entry points, public interfaces, data models, tests, config, and dependencies of that part.
3. Collect **facts**: responsibilities, inputs/outputs, states, error paths, dependencies, security and privacy handling, accessibility support, performance characteristics, test coverage.
4. Read the current `README.md` (create one from `references/readme-template.md` if missing) and find the right insertion point.

### Phase 2: Engineering Review Room (mandatory)
Run the four-persona discussion from `references/review-room.md`. Hold it internally and use it to shape the content. Surface a condensed "Design Decisions" outcome in the README. Do not paste the transcript unless the user asks. Each persona must raise at least one concrete concern or confirmation, and each concern must be resolved in the doc, resolved in the code (and reported to the user), or listed under "Known Limitations".

Personas: **CTO** (architecture, scalability, tech choices), **Principal SWE, 20+ yrs** (code quality, patterns, maintainability), **QA Engineering Manager** (testing, edge cases, reliability), **CEO** (user value, delight, product story).

### Phase 3: Write
Use the section blueprint below. Include only sections backed by facts. Omit empty ones; do not pad.

### Phase 4: Diagram
Pick diagrams using `references/diagram-guide.md`. Always include at least one, and at most 3 per feature. Validate that Mermaid syntax is correct (quote labels with special characters, avoid HTML tags).

### Phase 5: Verify and Deliver
Run the checklist in `references/quality-checklist.md`. Then reply briefly with: what was added and where (file link), which diagrams, any `TODO(verify)` items, and any code gaps the review room found.

## Section Blueprint (per feature)

```markdown
## <Feature Name>

> One-sentence value statement written for the user, not the developer.

### Why It Matters
2-3 bullets: the user problem and the experience outcome.

### How It Works
<Mermaid diagram: architecture or flow>
3-6 lines explaining the diagram's key steps.

### Key Engineering Decisions
| Decision | Rationale | Trade-off |
|---|---|---|

### Reliability and Quality
- Error handling, offline/failure behavior, retries, idempotency
- Testing: types and what they cover (cite real numbers only if measured)
- Edge cases handled

### UX, Accessibility and Performance
- Platform-appropriate interaction, loading/empty/error states, Dynamic Type/VoiceOver/contrast, motion preferences
- Measured or budgeted performance targets

### Security and Privacy
- Data handled, storage, permissions, least privilege

### Known Limitations and Roadmap
Honest and specific. This signals maturity.
```

Tailor to the part: UI screens emphasize UX and a11y; services emphasize reliability and security; data pipelines emphasize flow and integrity.

## Writing Style

- Present tense, active voice, plain English. Define jargon on first use.
- Headings in Title Case, with ≤ 3 heading levels per feature.
- Tables for comparisons, bullets for lists, and code blocks only for commands or short, essential snippets with a language tag.
- Use relative links to source files, for example `[AuthService](src/auth/service.ts)`.
- One idea per sentence. Avoid filler ("very", "simply", "robust", "blazing fast").
- Keep each feature section to roughly 1 screen of prose plus diagrams.

## Hard Rules

- Never invent numbers, coverage, uptime, users, or technologies.
- Never remove or rewrite unrelated README content.
- Never embed secrets, internal URLs, or personal data.
- Diagrams must match the real code. Re-verify names against source.
- If the review room finds a real defect, tell the user. Do not hide it in the doc.
