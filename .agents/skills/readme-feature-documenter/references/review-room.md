# Engineering Review Room

A short, rigorous design review held before writing. The goal: the documented feature meets Apple-level standards for quality, delight, stability, and reliability, and the README reflects that truthfully.

## Participants and Mandates

| Persona | Lens | Must Ask |
|---|---|---|
| **CTO** | Architecture, scalability, cost, tech strategy | Does the structure scale? Are boundaries clean? What is the failure blast radius? Are dependencies justified? |
| **Principal SWE (20+ yrs, Apple)** | Craft, patterns, maintainability, performance | Is it simple, testable, and idiomatic? Any hidden coupling, race conditions, or tech debt? Would I be proud to ship it? |
| **QA Engineering Manager** | Reliability, test strategy, edge cases | How is it tested? What breaks on bad network, empty data, interruption, low memory, old devices, localization, accessibility settings? |
| **CEO** | User value, delight, brand, story | Does this make the user's life easier? Is it intuitive without instructions? Would users love it and recommend it? What is the one-line story? |

## Process (keep it to ~5 exchanges)

1. **CEO** frames the user problem and the "it just works" experience goal.
2. **CTO** reviews architecture and decisions, and flags scale, security, and cost risks.
3. **Principal SWE** reviews code quality and patterns, and names the trade-offs worth documenting.
4. **QA Manager** attacks it: edge cases, failure modes, test gaps, and accessibility/performance risks.
5. **Consensus**: each persona gives "Ship" or "Fix first" with reasons. Resolve every "Fix first".

## Apple Standards Bar

- **Delight**: clear, fast, forgiving, with no dead ends. Every state (loading, empty, error, success) is designed.
- **Reliability**: graceful degradation, no data loss, idempotent operations, and clear recovery.
- **Accessibility**: VoiceOver/screen readers, scalable text, contrast, reduced motion, and keyboard/switch access.
- **Privacy and security**: data minimization, least privilege, and secure storage.
- **Performance**: responsive interactions and efficient battery/memory/network use.
- **Craft**: consistent design language, naming, and error messages written for humans.

## Output Format (internal, condensed into the README)

```
Decisions: <3-5 decisions + rationale + trade-off>   -> "Key Engineering Decisions"
Risks mitigated: <list>                               -> "Reliability and Quality"
Gaps found: <list>                                    -> "Known Limitations" or reported to user
Verdicts: CTO / SWE / QA / CEO = Ship | Fix first
```

## Example (abbreviated)

- **CEO**: "A patient should see their record in one tap, even on a bad connection."
- **CTO**: "Offline-first cache with background sync is right. What bounds the cache size?"
- **Principal SWE**: "Repository pattern isolates the data source, which keeps it testable. Sync conflicts are last-write-wins, so document it."
- **QA**: "Needs tests for airplane mode, token expiry mid-sync, and 200% text size. The empty state has no test."
- **Consensus**: Ship after adding the empty-state test; list last-write-wins under Known Limitations.
