# Quality Checklist

Verify every item before delivering. Fix failures; do not just report them.

## Accuracy
- [ ] Every claim traced to code, tests, or config (or marked `TODO(verify)`).
- [ ] No invented metrics, coverage, technologies, or features.
- [ ] Names in diagrams and tables match real files, classes, and endpoints.
- [ ] Links to source files resolve.

## Readability
- [ ] Value statement is understandable by a non-engineer in one read.
- [ ] Headings are consistent with the existing README. TOC updated if present.
- [ ] No paragraph exceeds ~4 lines. No filler or marketing adjectives.
- [ ] Jargon defined on first use.

## Diagrams
- [ ] 1 to 3 diagrams, each with one clear purpose and a short walkthrough.
- [ ] Mermaid syntax valid (quoted special characters, supported diagram type).
- [ ] At least one shows a failure or recovery path.
- [ ] ≤ ~12 nodes each.

## Engineering Depth
- [ ] Key decisions list rationale and trade-offs.
- [ ] Reliability, testing, security/privacy, and accessibility are addressed where relevant.
- [ ] Known limitations are stated honestly.
- [ ] Review room: all four personas gave a verdict, with no unresolved "Fix first".

## Safety and Integrity
- [ ] No secrets, tokens, internal hostnames, or personal data.
- [ ] Unrelated README content unchanged.
- [ ] Final reply lists what changed, where, and any open items.
