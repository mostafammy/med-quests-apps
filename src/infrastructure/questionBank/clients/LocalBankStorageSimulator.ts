import type { BlockId, Question } from '../../../domain/model/types.ts';
import type {
  GovernedQuestion,
  QuestionReviewSubmission,
  EditorialAuditLogEntry,
  BankRevisionNumber,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionCanonicalHasher } from '../../../domain/questionBank/canonicalHasher.ts';
import defaultCvsBank from '../../../../content/cvs/dist/bank.v1.json';

export const STORAGE_KEYS = {
  CANONICAL_BANK: 'medquests_global_canonical_bank_v2',
  REVIEW_SUBMISSIONS: 'medquests_global_review_submissions_v2',
  EDITORIAL_AUDIT_LOGS: 'medquests_global_editorial_audit_logs_v2',
  BLOCK_REVISIONS: 'medquests_global_block_revisions_v2',
  SEED_CATALOG_SIZE: 'medquests_global_seed_size_v2',
  DELETED_QUESTIONS: 'medquests_global_deleted_questions_v2',
} as const;

// In-memory simulator storage fallback for node test environments and SSR
const memoryStorage = new Map<string, string>();

export function safeGetStorage(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return memoryStorage.get(key) || null;
}

export function safeSetStorage(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      // Ignore
    }
  }
  memoryStorage.set(key, value);
}

export class LocalBankStorageSimulator {
  public getLocalCanonicalBank(blockId: BlockId = 'cvs'): GovernedQuestion[] {
    try {
      // Auto-heal orphaned supratentorial bank into 'cns'
      if (blockId === 'cns') {
        this.healOrphanedSupratentorialBank();
      }

      const deletedKey = `${STORAGE_KEYS.DELETED_QUESTIONS}_${blockId}`;
      const deletedIds = new Set<string>(
        JSON.parse(safeGetStorage(deletedKey) || '[]') as string[]
      );

      const raw = safeGetStorage(`${STORAGE_KEYS.CANONICAL_BANK}_${blockId}`);
      if (raw) {
        let parsed = JSON.parse(raw) as GovernedQuestion[];
        if (deletedIds.size > 0) {
          parsed = parsed.filter((q) => !deletedIds.has(q.id));
        }

        if (blockId !== 'cvs') {
          // Purge any leaked CVS questions that were mistakenly seeded in earlier sessions
          const initialLength = parsed.length;
          parsed = parsed
            .filter((q) => {
              const qBlock = (q.blockId || '').toLowerCase();
              return qBlock === blockId || qBlock.startsWith(blockId) || qBlock.includes(blockId);
            })
            .map((q) => ({
              ...q,
              blockId: blockId as BlockId,
            }));
          if (parsed.length !== initialLength) {
            this.saveLocalCanonicalBank(blockId, parsed);
          }
        }

        // If bundled seed bank grew or was rebalanced, reconcile existing seed questions
        if (blockId === 'cvs' && Array.isArray(defaultCvsBank)) {
          const bundledMap = new Map((defaultCvsBank as Question[]).map((q) => [q.id, q]));
          let upgradedCount = 0;
          parsed = parsed.map((q) => {
            const bundled = bundledMap.get(q.id);
            if (
              bundled &&
              q.provenanceScope !== 'local-custom' &&
              ((bundled.bankVersion || 1) > (q.bankVersion || 1) ||
                ((bundled.bankVersion || 1) === (q.bankVersion || 1) &&
                  JSON.stringify(bundled.choices) !== JSON.stringify(q.choices)))
            ) {
              upgradedCount++;
              return {
                ...q,
                choices: bundled.choices,
                bankVersion: bundled.bankVersion || 2,
                stemHash: QuestionCanonicalHasher.computeStemHashSync(bundled.stem),
              };
            }
            return q;
          });

          const existingIds = new Set(parsed.map((q) => q.id));
          const missingSeeds = (defaultCvsBank as Question[]).filter(
            (q) => !existingIds.has(q.id) && !deletedIds.has(q.id)
          );
          const recordedSeedSizeRaw = safeGetStorage(`${STORAGE_KEYS.SEED_CATALOG_SIZE}_${blockId}`);
          const recordedSeedSize = recordedSeedSizeRaw ? Number(recordedSeedSizeRaw) : 0;

          if (missingSeeds.length > 0) {
            const nextRev = Number(this.bumpLocalRevision(blockId));
            for (const seedQ of missingSeeds) {
              parsed.push(this.enrichSeedQuestion(seedQ, nextRev));
            }
            safeSetStorage(
              `${STORAGE_KEYS.SEED_CATALOG_SIZE}_${blockId}`,
              String(defaultCvsBank.length)
            );
            this.saveLocalCanonicalBank(blockId, parsed);
          } else if (upgradedCount > 0) {
            this.saveLocalCanonicalBank(blockId, parsed);
          } else if (recordedSeedSize !== defaultCvsBank.length) {
            safeSetStorage(
              `${STORAGE_KEYS.SEED_CATALOG_SIZE}_${blockId}`,
              String(defaultCvsBank.length)
            );
          }
        }
        return parsed;
      }
    } catch {
      // Ignore
    }

    // Seed from default bundled bank if empty (CVS only; non-CVS blocks start isolated and empty)
    if (blockId === 'cvs' && Array.isArray(defaultCvsBank)) {
      const deletedKey = `${STORAGE_KEYS.DELETED_QUESTIONS}_${blockId}`;
      let deletedIds = new Set<string>();
      try {
        deletedIds = new Set<string>(
          JSON.parse(safeGetStorage(deletedKey) || '[]') as string[]
        );
      } catch {
        // Ignore
      }
      const initialRev = Number(this.getLocalRevision(blockId));
      const seeded: GovernedQuestion[] = (defaultCvsBank as Question[])
        .filter((q) => !deletedIds.has(q.id))
        .map((q) => this.enrichSeedQuestion(q, initialRev));
      try {
        safeSetStorage(
          `${STORAGE_KEYS.SEED_CATALOG_SIZE}_${blockId}`,
          String(defaultCvsBank.length)
        );
      } catch {
        // Ignore
      }
      this.saveLocalCanonicalBank(blockId, seeded);
      return seeded;
    }

    return [];
  }

  public enrichSeedQuestion(q: Question, globalRevision = 1): GovernedQuestion {
    return {
      ...q,
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: QuestionCanonicalHasher.computeStemHashSync(q.stem),
      globalRevision,
      authorId: 'usr-curriculum-faculty',
      authorDisplayName: 'Curriculum Faculty Committee',
      reviewedById: 'usr-admin-initial',
      reviewedByDisplayName: 'Board Administrator',
      reviewerNotes: 'Official faculty syllabus verified item.',
      publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    };
  }

  private healOrphanedSupratentorialBank(): void {
    try {
      const orphanedKeys = [
        `${STORAGE_KEYS.CANONICAL_BANK}_block-02-supratentorial`,
        `${STORAGE_KEYS.CANONICAL_BANK}_supratentorial`,
      ];
      const questionsToHeal: GovernedQuestion[] = [];
      for (const orphanKey of orphanedKeys) {
        const rawOrphan = safeGetStorage(orphanKey);
        if (rawOrphan) {
          try {
            const parsedOrphan = JSON.parse(rawOrphan) as GovernedQuestion[];
            if (Array.isArray(parsedOrphan) && parsedOrphan.length > 0) {
              questionsToHeal.push(...parsedOrphan);
            }
          } catch {
            // ignore
          }
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              window.localStorage.removeItem(orphanKey);
            } catch {
              // ignore
            }
          }
          memoryStorage.delete(orphanKey);
        }
      }

      if (questionsToHeal.length > 0) {
        const currentCnsRaw = safeGetStorage(`${STORAGE_KEYS.CANONICAL_BANK}_cns`);
        let currentCns: GovernedQuestion[] = [];
        if (currentCnsRaw) {
          try {
            currentCns = JSON.parse(currentCnsRaw) as GovernedQuestion[];
          } catch {
            // ignore
          }
        }
        const existingIds = new Set(currentCns.map((q) => q.id));
        const newQuestions = questionsToHeal
          .filter((q) => !existingIds.has(q.id))
          .map((q) => ({
            ...q,
            blockId: 'cns' as BlockId,
          }));

        if (newQuestions.length > 0) {
          const merged = [...currentCns, ...newQuestions];
          this.saveLocalCanonicalBank('cns', merged);
        }
      }
    } catch {
      // ignore
    }
  }

  public saveLocalCanonicalBank(blockId: BlockId, questions: readonly GovernedQuestion[]): void {
    try {
      safeSetStorage(`${STORAGE_KEYS.CANONICAL_BANK}_${blockId}`, JSON.stringify(questions));
    } catch {
      // Storage full
    }
  }

  public getLocalSubmissions(blockId: BlockId = 'cvs'): QuestionReviewSubmission[] {
    try {
      const raw = safeGetStorage(`${STORAGE_KEYS.REVIEW_SUBMISSIONS}_${blockId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return [];
  }

  public saveLocalSubmissions(blockId: BlockId, list: readonly QuestionReviewSubmission[]): void {
    try {
      safeSetStorage(`${STORAGE_KEYS.REVIEW_SUBMISSIONS}_${blockId}`, JSON.stringify(list));
    } catch {
      // Storage full
    }
  }

  public getLocalAuditLogs(blockId: BlockId = 'cvs'): EditorialAuditLogEntry[] {
    try {
      const raw = safeGetStorage(`${STORAGE_KEYS.EDITORIAL_AUDIT_LOGS}_${blockId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return [];
  }

  public appendLocalAuditLog(blockId: BlockId, entry: EditorialAuditLogEntry): void {
    const current = this.getLocalAuditLogs(blockId);
    const updated = [entry, ...current].slice(0, 200);
    try {
      safeSetStorage(`${STORAGE_KEYS.EDITORIAL_AUDIT_LOGS}_${blockId}`, JSON.stringify(updated));
    } catch {
      // Storage full
    }
  }

  public getLocalRevision(blockId: BlockId = 'cvs'): BankRevisionNumber {
    try {
      const rev = safeGetStorage(`${STORAGE_KEYS.BLOCK_REVISIONS}_${blockId}`);
      return (rev ? Number(rev) : 1) as BankRevisionNumber;
    } catch {
      return 1 as BankRevisionNumber;
    }
  }

  public setLocalRevision(blockId: BlockId, rev: number): BankRevisionNumber {
    const validRev = Math.max(1, rev) as BankRevisionNumber;
    try {
      safeSetStorage(`${STORAGE_KEYS.BLOCK_REVISIONS}_${blockId}`, String(validRev));
    } catch {
      // Ignore
    }
    return validRev;
  }

  public bumpLocalRevision(blockId: BlockId = 'cvs'): BankRevisionNumber {
    const next = Number(this.getLocalRevision(blockId)) + 1;
    return this.setLocalRevision(blockId, next);
  }

  public ensureMinimumLocalRevision(blockId: BlockId = 'cvs', minRev: number): BankRevisionNumber {
    const current = Number(this.getLocalRevision(blockId));
    if (minRev > current) {
      return this.setLocalRevision(blockId, minRev);
    }
    return current as BankRevisionNumber;
  }

  public broadcastGlobalBankMutation(blockId: BlockId, newRevision: number): void {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('medquests_bank_sync');
          channel.postMessage({
            type: 'GLOBAL_BANK_MUTATED',
            blockId,
            revision: newRevision,
            timestamp: new Date().toISOString(),
          });
          channel.close();
        } catch {
          // Ignore
        }
      }
      try {
        window.dispatchEvent(
          new CustomEvent('medquests:global-bank-mutated', {
            detail: { blockId, revision: newRevision },
          })
        );
      } catch {
        // Ignore
      }
    }
  }
}
