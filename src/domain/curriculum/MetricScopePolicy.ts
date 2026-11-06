/**
 * Metric Scope Policy (ADR-010-05)
 * Classifies metrics as block-scoped vs. learner-global
 * SPEC-010: Multi-Block Curriculum Architecture
 */

export type MetricId =
  | 'accuracy'
  | 'mastery'
  | 'coverage'
  | 'weakTopics'
  | 'dueReviews'
  | 'pacing'
  | 'confidenceCalibration'
  | 'retentionForecast'
  | 'subjectReadiness'
  | 'streakDays'
  | 'todayAttempts'
  | 'dailyGoal';

export type MetricScope = 'block' | 'learner-global';

export interface IMetricScopePolicy {
  scopeOf(metric: MetricId): MetricScope;
  isBlockScoped(metric: MetricId): boolean;
  isLearnerGlobal(metric: MetricId): boolean;
}

export const DEFAULT_METRIC_SCOPES: Readonly<Record<MetricId, MetricScope>> = Object.freeze({
  accuracy: 'block',
  mastery: 'block',
  coverage: 'block',
  weakTopics: 'block',
  dueReviews: 'block',
  pacing: 'block',
  confidenceCalibration: 'block',
  retentionForecast: 'block',
  subjectReadiness: 'block',
  streakDays: 'learner-global',
  todayAttempts: 'learner-global',
  dailyGoal: 'learner-global',
});

export class MetricScopePolicy implements IMetricScopePolicy {
  private readonly scopes: Record<MetricId, MetricScope>;

  constructor(customScopes?: Partial<Record<MetricId, MetricScope>>) {
    this.scopes = {
      ...DEFAULT_METRIC_SCOPES,
      ...customScopes,
    };
  }

  public scopeOf(metric: MetricId): MetricScope {
    return this.scopes[metric] || 'block';
  }

  public isBlockScoped(metric: MetricId): boolean {
    return this.scopeOf(metric) === 'block';
  }

  public isLearnerGlobal(metric: MetricId): boolean {
    return this.scopeOf(metric) === 'learner-global';
  }
}

export const defaultMetricScopePolicy = new MetricScopePolicy();
