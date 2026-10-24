/**
 * Deterministic clinical-clue extraction for the offline tutor.
 *
 * Scores each stem word by (a) whether the trusted reference text — rationale,
 * explanation, curriculum evidence — uses it, and (b) lexical "jargon" signals
 * (length, digits, capitalisation). High-scoring neighbours are merged into
 * phrases so highlights read naturally ("primitive cardiac sacculations").
 *
 * Pure and O(n) in stem length; runs in well under a millisecond.
 */

export interface ExtractedClue {
  readonly phrase: string;
  readonly score: number;
  readonly grounded: boolean;
}

const STOPWORDS = new Set(
  (
    'which following what when where while with from that this these those there their them they than then ' +
    'into onto over under about above below most least more less very also only such each other some most ' +
    'have has had having been being were was are is the and for not but his her its our your patient year old ' +
    'would could should does done true false best statement correct incorrect except likely represents regarding'
  ).split(' '),
);

/** Short connectors allowed inside a phrase ("arch OF the aorta"). */
const BRIDGES = new Set(['of', 'the', 'to', 'in', 'and', 'a', 'an', 'on']);

const MIN_WORD_LENGTH = 4;
const STEM_PREFIX = 5; // crude, language-agnostic stemming: compare first 5 letters
const MAX_CLUES = 3;

interface Token {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const tokenize = (text: string): Token[] =>
  [...text.matchAll(/[A-Za-z0-9][A-Za-z0-9'-]*/g)].map((m) => {
    const start = m.index ?? 0;
    return { text: m[0], start, end: start + m[0].length };
  });

const stemOf = (word: string): string => word.toLowerCase().slice(0, STEM_PREFIX);

export function extractStemClues(stem: string, referenceTexts: readonly string[]): ExtractedClue[] {
  const tokens = tokenize(stem);
  const referenceStems = new Set(referenceTexts.flatMap((text) => tokenize(text).map((t) => stemOf(t.text))));

  const scores = tokens.map((token, index) => {
    const lower = token.text.toLowerCase();
    if (lower.length < MIN_WORD_LENGTH || STOPWORDS.has(lower)) return { score: 0, grounded: false };

    const grounded = referenceStems.has(stemOf(lower));
    const jargon =
      (lower.length >= 9 ? 1 : 0) + (/\d/.test(lower) ? 1 : 0) + (index > 0 && /^[A-Z]/.test(token.text) ? 1 : 0);
    return { score: (grounded ? 2 : 0) + jargon, grounded };
  });

  const threshold = referenceStems.size > 0 ? 2 : 1;
  const phrases: ExtractedClue[] = [];

  let i = 0;
  while (i < tokens.length) {
    const head = scores[i];
    if (!head || head.score < threshold) {
      i += 1;
      continue;
    }

    let last = i;
    let total = head.score;
    let grounded = head.grounded;
    let j = i + 1;
    while (j < tokens.length) {
      const token = tokens[j];
      const score = scores[j];
      if (!token || !score) break;
      if (score.score >= threshold) {
        last = j;
        total += score.score;
        grounded ||= score.grounded;
        j += 1;
      } else if (BRIDGES.has(token.text.toLowerCase()) && (scores[j + 1]?.score ?? 0) >= threshold) {
        j += 1;
      } else {
        break;
      }
    }

    const first = tokens[i];
    const end = tokens[last];
    if (first && end) phrases.push({ phrase: stem.slice(first.start, end.end), score: total, grounded });
    i = last + 1;
  }

  return phrases.sort((a, b) => b.score - a.score).slice(0, MAX_CLUES);
}
