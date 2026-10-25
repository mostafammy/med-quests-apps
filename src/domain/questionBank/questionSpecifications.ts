/**
 * Domain Service: Composable Query Specifications & Dashboard KPI Aggregator
 * Layer: Domain (Specification Pattern + Pure Reducer Metrics)
 */

import type {
  GovernedQuestion,
  ISpecification,
  QuestionCuratorFilterCriteria,
  GlobalBankGovernanceKpis,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

/**
 * Abstract Composite Specification providing fluent boolean composition.
 */
export abstract class CompositeSpecification<T> implements ISpecification<T> {
  public abstract isSatisfiedBy(candidate: T): boolean;

  public and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  public or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  public not(): ISpecification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends CompositeSpecification<T> {
  public constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class OrSpecification<T> extends CompositeSpecification<T> {
  public constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NotSpecification<T> extends CompositeSpecification<T> {
  public constructor(private readonly inner: ISpecification<T>) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return !this.inner.isSatisfiedBy(candidate);
  }
}

export class AlwaysTrueSpecification<T> extends CompositeSpecification<T> {
  public isSatisfiedBy(_candidate: T): boolean {
    return true;
  }
}

export class SubjectSpecification extends CompositeSpecification<GovernedQuestion> {
  public constructor(private readonly subjectId: string) {
    super();
  }

  public isSatisfiedBy(candidate: GovernedQuestion): boolean {
    return candidate.subjectId === this.subjectId;
  }
}

export class ChapterSpecification extends CompositeSpecification<GovernedQuestion> {
  public constructor(private readonly chapterId: string) {
    super();
  }

  public isSatisfiedBy(candidate: GovernedQuestion): boolean {
    return candidate.chapterId === this.chapterId;
  }
}

export class EditorialStatusSpecification extends CompositeSpecification<GovernedQuestion> {
  public constructor(private readonly status: string) {
    super();
  }

  public isSatisfiedBy(candidate: GovernedQuestion): boolean {
    return candidate.editorialStatus === this.status;
  }
}

export class DifficultySpecification extends CompositeSpecification<GovernedQuestion> {
  public constructor(private readonly difficulty: number) {
    super();
  }

  public isSatisfiedBy(candidate: GovernedQuestion): boolean {
    return candidate.difficulty === this.difficulty;
  }
}

export class HighYieldSpecification extends CompositeSpecification<GovernedQuestion> {
  public constructor(private readonly highYieldOnly: boolean) {
    super();
  }

  public isSatisfiedBy(candidate: GovernedQuestion): boolean {
    return !this.highYieldOnly || candidate.highYield === true;
  }
}

export class SearchQuerySpecification extends CompositeSpecification<GovernedQuestion> {
  private readonly terms: readonly string[];

  public constructor(query: string) {
    super();
    this.terms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  public isSatisfiedBy(candidate: GovernedQuestion): boolean {
    if (this.terms.length === 0) return true;

    const searchableBlob = [
      candidate.id,
      candidate.stem,
      candidate.concept,
      candidate.explanation,
      candidate.examTip || '',
      candidate.mnemonic || '',
      ...candidate.choices.map((c) => `${c.text} ${c.rationale}`),
    ]
      .join(' ')
      .toLowerCase();

    return this.terms.every((term) => searchableBlob.includes(term));
  }
}

/**
 * Builds a single composite specification from UI filter criteria DTO.
 */
export class QuestionSpecificationBuilder {
  public static build(
    criteria: QuestionCuratorFilterCriteria
  ): ISpecification<GovernedQuestion> {
    let spec: ISpecification<GovernedQuestion> = new AlwaysTrueSpecification();

    if (criteria.subjectId && criteria.subjectId !== 'all') {
      spec = spec.and(new SubjectSpecification(criteria.subjectId));
    }

    if (criteria.chapterId && criteria.chapterId !== 'all') {
      spec = spec.and(new ChapterSpecification(criteria.chapterId));
    }

    if (criteria.editorialStatus && criteria.editorialStatus !== 'all') {
      spec = spec.and(new EditorialStatusSpecification(criteria.editorialStatus));
    }

    if (criteria.difficulty && criteria.difficulty !== 'all') {
      spec = spec.and(new DifficultySpecification(criteria.difficulty));
    }

    if (criteria.highYieldOnly) {
      spec = spec.and(new HighYieldSpecification(true));
    }

    if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
      spec = spec.and(new SearchQuerySpecification(criteria.searchQuery));
    }

    return spec;
  }
}

/**
 * Aggregates high-level KPIs across the global questions catalog.
 */
export function computeGlobalBankKpis(
  questions: readonly GovernedQuestion[],
  currentRevision = 1
): GlobalBankGovernanceKpis {
  let totalPublished = 0;
  let totalPending = 0;
  let totalChangesReq = 0;
  let totalRejected = 0;
  let totalArchived = 0;
  let highYieldCount = 0;

  const subjectCounts: Record<string, number> = {};
  let foundational = 0;
  let intermediate = 0;
  let advanced = 0;

  for (const q of questions) {
    switch (q.editorialStatus) {
      case 'published':
        totalPublished++;
        break;
      case 'pending_review':
        totalPending++;
        break;
      case 'changes_requested':
        totalChangesReq++;
        break;
      case 'rejected':
        totalRejected++;
        break;
      case 'archived':
        totalArchived++;
        break;
    }

    if (q.editorialStatus === 'published') {
      if (q.highYield) highYieldCount++;
      subjectCounts[q.subjectId] = (subjectCounts[q.subjectId] || 0) + 1;

      if (q.difficulty === 1) foundational++;
      else if (q.difficulty === 2) intermediate++;
      else if (q.difficulty === 3) advanced++;
    }
  }

  const highYieldPercentage =
    totalPublished > 0 ? Math.round((highYieldCount / totalPublished) * 100) : 0;

  return {
    totalPublishedCanonical: totalPublished,
    totalPendingReview: totalPending,
    totalChangesRequested: totalChangesReq,
    totalRejected: totalRejected,
    totalArchivedTombstones: totalArchived,
    currentBlockRevision: currentRevision,
    highYieldPercentage,
    subjectBreakdown: subjectCounts,
    difficultyBreakdown: {
      foundational,
      intermediate,
      advanced,
    },
  };
}
