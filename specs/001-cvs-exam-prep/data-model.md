# Data Model: CVS Block Exam Preparation Platform

## 1. Domain Entities & Zod Boundary Schemas

### Question Schema
```ts
export const QuestionSchema = z.object({
  id: z.string(),
  blockId: z.string().default('cvs'),
  subjectId: z.string(), // 'anatomy' | 'histology' | 'microbiology'
  chapterId: z.string(),
  topicId: z.string(),
  concept: z.string(),
  type: z.enum(['single-best-answer', 'true-false']).default('single-best-answer'),
  stem: z.string().min(10),
  choices: z.array(ChoiceSchema).length(4), // Exactly 4 choices (A, B, C, D)
  explanation: z.string().min(10),
  examTip: z.string().nullable().default(null),
  mnemonic: z.string().nullable().default(null),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  cognitiveLevel: z.enum(['recall', 'understanding', 'application']).default('understanding'),
  highYield: z.boolean().default(true),
  origin: z.enum(['curriculum-self-assessment', 'authored-grounded']).default('authored-grounded'),
  evidence: z.array(EvidenceSchema).min(1),
  status: z.enum(['active', 'quarantined']).default('active'),
  bankVersion: z.number().default(1),
});
```

### Choice Schema
```ts
export const ChoiceSchema = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string().min(1),
  isCorrect: z.boolean(),
  rationale: z.string().min(1),
});
```

### Evidence Schema
```ts
export const EvidenceSchema = z.object({
  chunkId: z.string(),
  sourceName: z.string(),
  location: z.string(), // e.g. "Page 6" or "Slide 16"
  quote: z.string().min(5),
  kind: z.enum(['text', 'figure']).default('text'),
});
```

## 2. IndexedDB Schema (Dexie.js)

```ts
class MedQuestsDB extends Dexie {
  questions!: EntityTable<Question, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  reviewCards!: EntityTable<ReviewCard, 'questionId'>;
  bookmarks!: EntityTable<BookmarkRecord, 'questionId'>;
  notes!: EntityTable<QuestionNoteRecord, 'questionId'>;

  constructor() {
    super('MedQuestsDB');
    this.version(1).stores({
      questions: 'id, blockId, subjectId, chapterId, topicId, highYield, difficulty',
      attempts: 'id, questionId, blockId, sessionId, mode, isCorrect, confidence, answeredAt',
      reviewCards: 'questionId, blockId, dueAt, repetitions, lapses',
      bookmarks: 'questionId, blockId, bookmarkedAt',
      notes: 'questionId, blockId, updatedAt',
    });
  }
}
```
