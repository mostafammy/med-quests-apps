/**
 * Script: generate-synthetic-golden.ts
 * Purpose: Deterministically generate a stratified benchmark dataset (≥ 400 pairs)
 * across EXACT, NEAR, SIBLING, CONFLICT, and UNIQUE categories from existing questions.
 *
 * Zero manual faculty labeling required.
 * Run with: node --experimental-strip-types scripts/qdd/generate-synthetic-golden.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

interface Choice {
  id: 'a' | 'b' | 'c' | 'd';
  text: string;
  isCorrect: boolean;
  rationale: string;
}

interface Question {
  id: string;
  blockId: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  concept: string;
  type: string;
  stem: string;
  choices: Choice[];
  explanation: string;
  examTip?: string | null;
  mnemonic?: string | null;
  difficulty?: number;
  cognitiveLevel?: string;
  highYield?: boolean;
  origin?: string;
  evidence: Array<{
    chunkId: string;
    sourceName: string;
    location: string;
    quote: string;
    kind: string;
  }>;
}

export type DuplicateRelation = 'EXACT' | 'NEAR' | 'SIBLING' | 'CONFLICT' | 'UNIQUE';

export interface GoldenPairRecord {
  id: string;
  relation: DuplicateRelation;
  perturbationCategory: string;
  questionA: Question;
  questionB: Question;
  notes: string;
}

// Simple seeded pseudo-random number generator for 100% deterministic output
class SeededRng {
  private state: number;
  constructor(seed = 42) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

function cloneQuestion(q: Question, newIdSuffix: string): Question {
  return {
    ...q,
    id: `${q.id}-${newIdSuffix}`,
    choices: q.choices.map((c) => ({ ...c })),
    evidence: q.evidence.map((e) => ({ ...e })),
  };
}

export function generateGoldenSet(): GoldenPairRecord[] {
  const bankPath = path.join(ROOT_DIR, 'content/cvs/dist/bank.v1.json');
  if (!fs.existsSync(bankPath)) {
    throw new Error(`Bank file not found at ${bankPath}`);
  }

  const rawQuestions: Question[] = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  const rng = new SeededRng(20261102);
  const pairs: GoldenPairRecord[] = [];
  let pairCounter = 1;

  function addPair(
    relation: DuplicateRelation,
    category: string,
    qA: Question,
    qB: Question,
    notes: string
  ) {
    const recordId = `GP-${relation}-${String(pairCounter++).padStart(4, '0')}`;
    pairs.push({
      id: recordId,
      relation,
      perturbationCategory: category,
      questionA: qA,
      questionB: qB,
      notes,
    });
  }

  // =========================================================================
  // 1. EXACT DUPLICATES (~90 pairs)
  // =========================================================================
  for (let i = 0; i < 90 && i < rawQuestions.length; i++) {
    const orig = rawQuestions[i];
    const mode = i % 3;

    if (mode === 0) {
      // Choice permutation: shuffle choice ordering (A-D) while keeping content and isCorrect intact
      const clone = cloneQuestion(orig, 'exact-permuted');
      const shuffledChoices = rng.shuffle(clone.choices);
      // Re-assign ids a,b,c,d to match new slot order
      clone.choices = shuffledChoices.map((c, idx) => ({
        ...c,
        id: ['a', 'b', 'c', 'd'][idx] as 'a' | 'b' | 'c' | 'd',
      }));

      addPair(
        'EXACT',
        'choice_permutation',
        orig,
        clone,
        'Choices permuted in slot order; identical content and answer key'
      );
    } else if (mode === 1) {
      // Whitespace, casing, and quote normalization variations
      const clone = cloneQuestion(orig, 'exact-casing-ws');
      clone.stem = `  ${orig.stem.toLowerCase()}   `.replace(/\s+/g, '  ');
      clone.stem = clone.stem.replace(/"/g, '“').replace(/'/g, '’');
      addPair(
        'EXACT',
        'whitespace_casing_quotes',
        orig,
        clone,
        'Lowercase stem, extra whitespace, and smart quote replacements'
      );
    } else {
      // LaTeX fraction variation or trailing punctuation noise
      const clone = cloneQuestion(orig, 'exact-punctuation');
      clone.stem = `${orig.stem.trim()}  `;
      addPair(
        'EXACT',
        'trailing_whitespace_noise',
        orig,
        clone,
        'Trailing whitespace and formatting variant of identical stem'
      );
    }
  }

  // =========================================================================
  // 2. NEAR / PARAPHRASED DUPLICATES (~90 pairs)
  // =========================================================================
  const paraphrasePrefixes = [
    { from: /^which of the following represents/i, to: 'What is the characteristic sequence of' },
    { from: /^which of the following is/i, to: 'Identify the primary feature that constitutes' },
    { from: /^a patient presents with/i, to: 'In a clinical vignette describing an individual exhibiting' },
    { from: /^what is the primary/i, to: 'Which major factor serves as the principal' },
    { from: /^during which phase/i, to: 'At what specific point in time or stage' },
  ];

  for (let i = 0; i < 90 && i < rawQuestions.length; i++) {
    const orig = rawQuestions[(i + 45) % rawQuestions.length];
    const clone = cloneQuestion(orig, 'near-paraphrase');

    let rephrased = orig.stem;
    let matched = false;
    for (const rule of paraphrasePrefixes) {
      if (rule.from.test(orig.stem)) {
        rephrased = orig.stem.replace(rule.from, rule.to);
        matched = true;
        break;
      }
    }

    if (!matched) {
      rephrased = `Regarding ${orig.concept.toLowerCase()}, ${orig.stem.charAt(0).toLowerCase() + orig.stem.slice(1)}`;
    }

    // Synonym swaps
    rephrased = rephrased
      .replace(/\belevated\b/gi, 'increased')
      .replace(/\bdecreased\b/gi, 'reduced')
      .replace(/\boriginates from\b/gi, 'derives from')
      .replace(/\bcharacteristic of\b/gi, 'indicative of');

    clone.stem = rephrased;

    addPair(
      'NEAR',
      'clinical_paraphrase',
      orig,
      clone,
      'Paraphrased stem testing identical clinical concept with identical correct answer'
    );
  }

  // =========================================================================
  // 3. SIBLING / CLINICAL VARIANTS (~90 pairs)
  // =========================================================================
  // Clinical discriminators (negation, laterality, numeric, superlative) MUST NOT be classified as duplicates!
  for (let i = 0; i < 90 && i < rawQuestions.length; i++) {
    const orig = rawQuestions[(i + 90) % rawQuestions.length];
    const clone = cloneQuestion(orig, 'sibling-variant');
    const mode = i % 4;

    if (mode === 0) {
      // Negation injection: "Which of the following..." -> "Which of the following is NOT..."
      if (/which of the following is/i.test(orig.stem)) {
        clone.stem = orig.stem.replace(/which of the following is/i, 'Which of the following is NOT');
      } else {
        clone.stem = `All of the following are true regarding ${orig.concept} EXCEPT:`;
      }
      addPair(
        'SIBLING',
        'negation_inversion',
        orig,
        clone,
        'Stem inverted via negative qualifier (NOT/EXCEPT) -> distinct pedagogical objective'
      );
    } else if (mode === 1) {
      // Laterality inversion
      let stem = orig.stem;
      if (/\bleft\b/i.test(stem)) {
        stem = stem.replace(/\bleft\b/gi, 'right');
      } else if (/\bright\b/i.test(stem)) {
        stem = stem.replace(/\bright\b/gi, 'left');
      } else {
        stem = `In contrast to the left cardiac chambers, ${stem.charAt(0).toLowerCase() + stem.slice(1)}`;
      }
      clone.stem = stem;
      addPair(
        'SIBLING',
        'laterality_shift',
        orig,
        clone,
        'Laterality modified (left vs right) -> clinically distinct anatomical site'
      );
    } else if (mode === 2) {
      // Numeric or quantitative parameter shift
      let stem = orig.stem;
      const numMatch = stem.match(/\b\d+(\.\d+)?\b/);
      if (numMatch) {
        const val = parseFloat(numMatch[0]);
        stem = stem.replace(numMatch[0], String(val * 2));
      } else {
        stem = `${orig.stem} (Assuming systolic pressure exceeds 180 mmHg)`;
      }
      clone.stem = stem;
      addPair(
        'SIBLING',
        'numeric_threshold_shift',
        orig,
        clone,
        'Numeric diagnostic threshold altered -> altered hemodynamic or staging classification'
      );
    } else {
      // Superlative shift: most likely -> least likely / first-line -> contraindicated
      let stem = orig.stem;
      if (/most common/i.test(stem)) {
        stem = stem.replace(/most common/gi, 'least common');
      } else if (/first-line/i.test(stem)) {
        stem = stem.replace(/first-line/gi, 'contraindicated');
      } else {
        stem = `${stem.replace(/\?$/, '')} as the least likely diagnosis?`;
      }
      clone.stem = stem;
      addPair(
        'SIBLING',
        'superlative_inversion',
        orig,
        clone,
        'Superlative diagnostic priority shifted (most likely vs least likely)'
      );
    }
  }

  // =========================================================================
  // 4. CONFLICT / CONTRADICTION (~90 pairs)
  // =========================================================================
  // Identical or near stem, but DIFFERENT correct answer marked -> Medical Accuracy Alarm!
  for (let i = 0; i < 90 && i < rawQuestions.length; i++) {
    const orig = rawQuestions[(i + 135) % rawQuestions.length];
    const clone = cloneQuestion(orig, 'conflict-key');

    // Find currently correct choice and an incorrect distractor
    const correctIdx = clone.choices.findIndex((c) => c.isCorrect);
    const distractorIdx = clone.choices.findIndex((c) => !c.isCorrect);

    if (correctIdx !== -1 && distractorIdx !== -1) {
      // Swap isCorrect flags so Question B marks a completely different choice as correct
      clone.choices[correctIdx].isCorrect = false;
      clone.choices[distractorIdx].isCorrect = true;

      addPair(
        'CONFLICT',
        'answer_key_swap',
        orig,
        clone,
        `Contradictory answer key: Item A marks choice ${orig.choices[correctIdx].id.toUpperCase()} correct, while Item B marks ${clone.choices[distractorIdx].id.toUpperCase()} correct`
      );
    }
  }

  // =========================================================================
  // 5. UNIQUE / UNRELATED (~90 pairs)
  // =========================================================================
  for (let i = 0; i < 90 && i < rawQuestions.length; i++) {
    const qA = rawQuestions[i];
    // Select question B from a distant index or different topic
    const qB = rawQuestions[(i + 106) % rawQuestions.length];

    if (qA.id !== qB.id) {
      addPair(
        'UNIQUE',
        'distinct_curriculum_topics',
        qA,
        qB,
        `Independent questions across distinct topics: ${qA.topicId} vs ${qB.topicId}`
      );
    }
  }

  return pairs;
}

// Execution entry point
const outputDir = path.join(ROOT_DIR, 'test/golden');
const outputPath = path.join(outputDir, 'qdd-golden.v1.jsonl');

fs.mkdirSync(outputDir, { recursive: true });
const generatedPairs = generateGoldenSet();

const lines = generatedPairs.map((p) => JSON.stringify(p)).join('\n') + '\n';
fs.writeFileSync(outputPath, lines, 'utf8');

console.log(`Successfully generated ${generatedPairs.length} golden evaluation pairs at ${outputPath}`);
const tally: Record<string, number> = {};
for (const p of generatedPairs) {
  tally[p.relation] = (tally[p.relation] || 0) + 1;
}
console.log('Breakdown by relation:', tally);
