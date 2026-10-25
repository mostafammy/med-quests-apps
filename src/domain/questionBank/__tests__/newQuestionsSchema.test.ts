import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { QuestionSchema } from '../../model/types.ts';

describe('New PDF Questions Schema & Quality Validation', () => {
  const newQuestions = JSON.parse(
    fs.readFileSync('/Users/mac/.gemini/antigravity/brain/e86e870f-7756-4bb0-8516-51d84a62ad2c/scratch/all_new_questions.json', 'utf8')
  );

  it('contains exactly 106 high-yield questions extracted from the 24-page PDF', () => {
    expect(newQuestions.length).toBe(106);
  });

  it('validates every single question against QuestionSchema without error', () => {
    for (const q of newQuestions) {
      const parsed = QuestionSchema.safeParse(q);
      if (!parsed.success) {
        console.error('Validation failure on question:', q.id, parsed.error.format());
      }
      expect(parsed.success).toBe(true);
    }
  });

  it('ensures each question has exactly one correct choice with non-empty rationale', () => {
    for (const q of newQuestions) {
      expect(q.choices).toHaveLength(4);
      const correct = q.choices.filter((c: any) => c.isCorrect);
      expect(correct).toHaveLength(1);
      q.choices.forEach((c: any) => {
        expect(c.text.length).toBeGreaterThan(0);
        expect(c.rationale.length).toBeGreaterThan(0);
      });
    }
  });

  it('ensures every question includes valid curriculum evidence citing the PDF', () => {
    for (const q of newQuestions) {
      expect(q.evidence.length).toBeGreaterThanOrEqual(1);
      expect(q.evidence[0].quote.length).toBeGreaterThanOrEqual(5);
      expect(q.evidence[0].sourceName).toMatch(/\.pdf$/i);
    }
  });
});
