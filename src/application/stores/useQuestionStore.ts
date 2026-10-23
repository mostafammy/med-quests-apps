import { create } from 'zustand';
import { Question, QuestionSchema } from '../../domain/model/types.ts';
import { db } from '../../infrastructure/storage/db.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';

interface QuestionStoreState {
  questions: Question[];
  activeBlockId: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadQuestions: (blockId?: string) => Promise<void>;
  ingestQuestions: (rawJson: string | unknown[]) => Promise<{ count: number; errors: string[] }>;
  exportBankJson: () => string;
  clearBank: (blockId?: string) => Promise<void>;
}

export const useQuestionStore = create<QuestionStoreState>((set, get) => ({
  questions: [],
  activeBlockId: 'cvs',
  isLoading: false,
  error: null,

  loadQuestions: async (blockId = 'cvs') => {
    set({ isLoading: true, error: null });
    try {
      let stored = await db.questions.where('blockId').equals(blockId).toArray();
      if (stored.length === 0 && blockId === 'cvs' && Array.isArray(defaultCvsBank)) {
        await db.questions.bulkPut(defaultCvsBank as Question[]);
        stored = defaultCvsBank as Question[];
      }
      set({ questions: stored, activeBlockId: blockId, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  ingestQuestions: async (rawInput: string | unknown[]) => {
    let parsed: unknown[];
    if (typeof rawInput === 'string') {
      try {
        parsed = JSON.parse(rawInput);
      } catch (e) {
        return { count: 0, errors: [`JSON Parse Error: ${(e as Error).message}`] };
      }
    } else {
      parsed = rawInput;
    }

    if (!Array.isArray(parsed)) {
      return { count: 0, errors: ['Input must be a JSON array of questions'] };
    }

    const validated: Question[] = [];
    const errors: string[] = [];

    parsed.forEach((item, index) => {
      const res = QuestionSchema.safeParse(item);
      if (res.success) {
        validated.push(res.data);
      } else {
        const issues = res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        errors.push(`Item #${index + 1}: ${issues}`);
      }
    });

    if (validated.length > 0) {
      // Bulk insert or replace in IndexedDB
      await db.questions.bulkPut(validated);
      const current = get().questions;
      // Merge in memory
      const map = new Map<string, Question>();
      current.forEach((q) => map.set(q.id, q));
      validated.forEach((q) => map.set(q.id, q));
      set({ questions: Array.from(map.values()) });
    }

    return { count: validated.length, errors };
  },

  exportBankJson: () => {
    const list = get().questions;
    return JSON.stringify(list, null, 2);
  },

  clearBank: async (blockId = 'cvs') => {
    await db.questions.where('blockId').equals(blockId).delete();
    set({ questions: [] });
  },
}));
