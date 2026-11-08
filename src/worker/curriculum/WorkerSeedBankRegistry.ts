/**
 * WorkerSeedBankRegistry
 * Edge registry supplying bundled seed question banks for curriculum blocks.
 * SPEC-010 Phase 8: Faculty Studio & Edge Block Registry
 */

import type { Question } from '../../domain/model/types.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';
import defaultCnsBank from '../../../content/cns/dist/bank.v1.json';

export class WorkerSeedBankRegistry {
  private static readonly banks: Record<string, Question[]> = {
    cvs: defaultCvsBank as unknown as Question[],
    cns: defaultCnsBank as unknown as Question[],
  };

  public static getSeedQuestions(blockId: string): Question[] {
    return this.banks[blockId] || [];
  }

  public static hasSeedBank(blockId: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.banks, blockId);
  }

  public static getAllBlockIds(): string[] {
    return Object.keys(this.banks);
  }
}
