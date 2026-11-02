/**
 * Domain Service: SurvivorSelector
 * Strategy Pattern: Deterministically selects the canonical survivor among duplicate cluster members.
 *
 * Rules Hierarchy:
 * 1. Published / Active status > pending_review > draft > archived
 * 2. Evidence citation count: Higher > lower
 * 3. Learner attempts count: Higher > lower
 * 4. Deterministic stable tie-breaker: Oldest / lowest alphanumeric ID
 *
 * Layer: Domain (Pure, Deterministic, 0 I/O)
 */

export interface CandidateQuestionMetadata {
  readonly id: string;
  readonly editorialStatus?: string;
  readonly status?: string;
  readonly evidenceCount?: number;
  readonly attemptCount?: number;
  readonly createdAt?: string;
}

export class SurvivorSelector {
  private static statusScore(status?: string, editorialStatus?: string): number {
    const s = (editorialStatus || status || 'active').toLowerCase();
    if (s === 'active' || s === 'published') return 4;
    if (s === 'pending_review' || s === 'review') return 3;
    if (s === 'draft') return 2;
    if (s === 'archived' || s === 'quarantined') return 1;
    return 2;
  }

  /**
   * Selects the single best canonical survivor from a list of candidate members.
   */
  public static selectSurvivor(
    members: readonly string[],
    metadataMap?: ReadonlyMap<string, CandidateQuestionMetadata>
  ): string {
    if (members.length === 0) {
      throw new Error('Cannot select survivor from empty cluster');
    }
    if (members.length === 1) {
      return members[0];
    }

    if (!metadataMap) {
      // Deterministic fallback: sort lexicographically
      return [...members].sort()[0];
    }

    const sorted = [...members].sort((idA, idB) => {
      const metaA = metadataMap.get(idA);
      const metaB = metadataMap.get(idB);

      // 1. Editorial status score
      const scoreA = SurvivorSelector.statusScore(metaA?.status, metaA?.editorialStatus);
      const scoreB = SurvivorSelector.statusScore(metaB?.status, metaB?.editorialStatus);
      if (scoreA !== scoreB) return scoreB - scoreA;

      // 2. Evidence citation count
      const evA = metaA?.evidenceCount ?? 0;
      const evB = metaB?.evidenceCount ?? 0;
      if (evA !== evB) return evB - evA;

      // 3. Learner attempt count
      const attA = metaA?.attemptCount ?? 0;
      const attB = metaB?.attemptCount ?? 0;
      if (attA !== attB) return attB - attA;

      // 4. Stable ID tie-breaker
      return idA.localeCompare(idB);
    });

    return sorted[0];
  }
}
