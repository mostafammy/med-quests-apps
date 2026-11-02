/**
 * @file observability-portal-ports.ts
 * @description Strict Architectural Contracts (Ports, Value Objects, Strategy Interfaces,
 * and Domain Models) for SPEC-007: Unified Cloudflare Live Edge Observability & AI Telemetry Portal.
 *
 * Designed in accordance with Apple Platform Engineering Standards, Hexagonal Architecture
 * (Ports & Adapters), Domain-Driven Design (DDD), and SOLID Object-Oriented Principles.
 */

import type { Result } from '../../../src/domain/shared/result.ts';

// ============================================================================
// 1. BRANDED SCALAR & DOMAIN VALUE TYPES
// ============================================================================

export type TimeframeWindowId = '24h' | '48h' | '7d';

export type TimezoneDisplayMode = 'cairo-local' | 'utc';

export type CircadianStudyPhase =
  | 'peak-afternoon-rush'   // 13:00 - 18:00 UTC (15:00 - 20:00 Cairo)
  | 'evening-consolidation' // 19:00 - 22:00 UTC (21:00 - 00:00 Cairo)
  | 'late-night-owl'        // 23:00 - 01:00 UTC (01:00 - 03:00 Cairo)
  | 'dawn-pre-rounds'       // 02:00 - 05:00 UTC (04:00 - 07:00 Cairo)
  | 'morning-lectures';     // 06:00 - 12:00 UTC (08:00 - 14:00 Cairo)

export type ObservabilityDataSourceMode =
  | 'live-cloudflare-graphql'     // Direct real-time query via Cloudflare GraphQL Analytics API
  | 'hybrid-edge-d1-verified'     // Verified Cloudflare GraphQL telemetry snapshot + Live D1 probe
  | 'simulated-offline-fallback'; // Deterministic local dev fallback

export type AiDiagnosticLensId =
  | 'executive-cohort-briefing'
  | 'subsea-isp-routing-forensics'
  | 'd1-storage-and-cache-audit'
  | 'exam-surge-capacity-forecast';

// ============================================================================
// 2. IMMUTABLE DOMAIN VALUE OBJECTS (DDD)
// ============================================================================

/**
 * Hourly bucket combining Worker invocations, Static Asset requests, and D1 Database operations.
 */
export interface HourlyUnifiedTelemetryPoint {
  readonly isoHourUtc: string;          // e.g. "2026-10-31T14:00:00Z"
  readonly dateUtc: string;             // e.g. "2026-10-31"
  readonly displayHourCairo: string;    // e.g. "16:00 EET"
  readonly displayHourUtc: string;      // e.g. "14:00 UTC"
  readonly workerRequests: number;
  readonly workerErrors: number;
  readonly workerSubrequests: number;
  readonly d1ReadQueries: number;
  readonly d1WriteQueries: number;
  readonly d1RowsRead: number;
  readonly d1RowsWritten: number;
  readonly d1ResponseBytes: number;
  readonly cpuTimeP50Us: number;
  readonly cpuTimeP90Us: number;
  readonly cpuTimeP99Us: number;
  readonly durationP50Ms: number;
  readonly studyPhase: CircadianStudyPhase;
  readonly estimatedConcurrentScholars: number;
}

/**
 * Geographic & Subsea Cable Point-of-Presence (PoP) telemetry breakdown.
 */
export interface EdgeColoTelemetryNode {
  readonly coloCode: string;            // e.g. "MRS", "ZRH", "FCO", "CAI"
  readonly city: string;                // e.g. "Marseille"
  readonly country: string;             // e.g. "France"
  readonly countryCode: string;         // e.g. "FR"
  readonly regionLabel: string;         // e.g. "Mediterranean Subsea Hub (TE North / SEA-ME-WE)"
  readonly routingExplanation: string;  // Explains why Egyptian ISPs route through this PoP
  readonly requests: number;
  readonly errors: number;
  readonly subrequests: number;
  readonly trafficSharePercent: number; // 0..100
  readonly cpuTimeP50Ms: number;
  readonly cpuTimeP90Ms: number;
  readonly cpuTimeP99Ms: number;
  readonly durationP50Ms: number;
  readonly durationP90Ms: number;
  readonly durationP99Ms: number;
  readonly accentColorHex: string;      // Vibrant Apple Spectrum hex for charts
}

/**
 * Static Asset Delivery & Edge Cache Efficiency Breakdown.
 */
export interface EdgeAssetCacheMetrics {
  readonly totalAssetRequests: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly cacheHitRatioPercent: number;
  readonly status200Count: number;
  readonly status304NotModifiedCount: number;
  readonly otherStatusCount: number;
  readonly bandwidthSavedEstimatePercent: number;
}

/**
 * Cloudflare D1 Serverless SQLite Engine Performance Summary.
 */
export interface D1DatabaseTelemetrySummary {
  readonly databaseName: string;
  readonly databaseId: string;
  readonly totalReadQueries: number;
  readonly totalWriteQueries: number;
  readonly totalRowsRead: number;
  readonly totalRowsWritten: number;
  readonly totalBatchResponseBytes: number;
  readonly averageRowsPerReadQuery: number;
  readonly registeredUsersCount: number;
  readonly activeSessionsCount: number;
  readonly canonicalQuestionsCount: number;
}

/**
 * Biostatistical Cohort Adoption Estimation for the target student batch (default N = 110).
 */
export interface CohortAdoptionEstimate {
  readonly targetBatchSize: number;               // e.g. 110 students
  readonly estimatedUniqueScholarsActive: number; // e.g. 64 students
  readonly estimatedConfidenceInterval: readonly [number, number]; // e.g. [52, 76]
  readonly batchPenetrationPercent: number;       // e.g. 58.2%
  readonly averageRequestsPerScholar: number;     // e.g. 29.6
  readonly averageQuestionRowsSyncedPerScholar: number;
  readonly repeatVisitorRevalidationRatio: number; // Derived from HTTP 304 / 200 ratio
  readonly peakHourConcurrency: number;
  readonly peakHourTimestampUtc: string;
  readonly peakHourDisplayCairo: string;
}

/**
 * Unified Snapshot returned by the Observability Domain Facade.
 */
export interface UnifiedEdgeObservabilitySnapshot {
  readonly snapshotId: string;
  readonly generatedAtIso: string;
  readonly timeframeWindow: TimeframeWindowId;
  readonly dataSourceMode: ObservabilityDataSourceMode;
  readonly workerName: string;
  readonly workerUrl: string;
  readonly totalWorkerRequests: number;
  readonly totalWorkerErrors: number;
  readonly totalWorkerSubrequests: number;
  readonly errorRatePercent: number;
  readonly reliabilitySlaPercent: number;
  readonly globalCpuTimeP50Ms: number;
  readonly globalCpuTimeP90Ms: number;
  readonly globalCpuTimeP99Ms: number;
  readonly globalDurationP50Ms: number;
  readonly assetCacheMetrics: EdgeAssetCacheMetrics;
  readonly d1Summary: D1DatabaseTelemetrySummary;
  readonly cohortEstimate: CohortAdoptionEstimate;
  readonly hourlyTimeline: readonly HourlyUnifiedTelemetryPoint[];
  readonly coloDistribution: readonly EdgeColoTelemetryNode[];
}

// ============================================================================
// 3. AI TELEMETRY CO-PILOT CONTRACTS
// ============================================================================

export interface AiTelemetryInsightSection {
  readonly title: string;
  readonly badge: string;
  readonly summary: string;
  readonly keyTakeaways: readonly string[];
  readonly recommendation: string;
  readonly sentiment: 'optimal' | 'positive' | 'warning' | 'critical';
}

export interface AiExecutiveTelemetryBriefing {
  readonly briefingId: string;
  readonly lensId: AiDiagnosticLensId;
  readonly generatedAtIso: string;
  readonly providerUsed: string;
  readonly modelUsed: string;
  readonly headline: string;
  readonly executiveSummary: string;
  readonly healthScore: number; // 0..100
  readonly sections: readonly AiTelemetryInsightSection[];
}

// ============================================================================
// 4. HEXAGONAL ARCHITECTURE PORTS & STRATEGY INTERFACES (SOLID)
// ============================================================================

export interface ObservabilityDomainError {
  readonly code:
    | 'GRAPHQL_UPSTREAM_FAILURE'
    | 'UNAUTHORIZED_ADMIN_ACCESS'
    | 'INVALID_TIMEFRAME_WINDOW'
    | 'AI_SYNTHESIS_FAILED';
  readonly message: string;
  readonly retryable: boolean;
}

/**
 * Strategy Pattern: Estimates unique active student cohort size from anonymous
 * offline-first edge request, asset load, HTTP 304 revalidation, and D1 row sync signals.
 */
export interface ICohortAdoptionEstimatorStrategy {
  readonly strategyId: string;
  estimateCohortAdoption(params: {
    readonly totalWorkerRequests: number;
    readonly assetMetrics: EdgeAssetCacheMetrics;
    readonly d1Summary: D1DatabaseTelemetrySummary;
    readonly hourlyTimeline: readonly HourlyUnifiedTelemetryPoint[];
    readonly targetBatchSize: number;
  }): CohortAdoptionEstimate;
}

/**
 * Adapter / Port: Retrieves raw or aggregated telemetry from the Cloudflare Edge Worker
 * or falls back cleanly when offline.
 */
export interface ICloudflareObservabilityGatewayPort {
  fetchLiveSnapshot(params: {
    readonly timeframe: TimeframeWindowId;
    readonly targetBatchSize: number;
    readonly forceRefresh?: boolean;
  }): Promise<Result<UnifiedEdgeObservabilitySnapshot, ObservabilityDomainError>>;
}

/**
 * Strategy / Co-Pilot Port: Synthesizes human-readable executive insights from a telemetry snapshot.
 * Supports both Cloud LLM Providers (Gemini / Groq / OpenRouter) and a 0ms Deterministic Statistical Synthesizer.
 */
export interface IAiTelemetryNarrativeSynthesizerPort {
  synthesizeBriefing(params: {
    readonly snapshot: UnifiedEdgeObservabilitySnapshot;
    readonly lensId: AiDiagnosticLensId;
    readonly providerId?: 'gemini' | 'groq' | 'openrouter' | 'deterministic-local';
    readonly modelId?: string;
  }): Promise<Result<AiExecutiveTelemetryBriefing, ObservabilityDomainError>>;
}

// ============================================================================
// 5. TELEMETRY TIME-SERIES EXPORT & LONGITUDINAL ARCHIVAL CONTRACTS
// ============================================================================

export type TelemetryExportFormatId =
  | 'csv-timeseries'
  | 'json-archive-bundle'
  | 'markdown-executive-report'
  | 'csv-pop-topology';

export type TelemetryExportScope =
  | 'active-timeframe'
  | 'longitudinal-7d-full';

/**
 * Longitudinal checkpoint stored over time as the admin syncs or exports metrics.
 */
export interface HistoricalTelemetryCheckpoint {
  readonly checkpointId: string;
  readonly recordedAtIso: string;
  readonly timeframeWindow: TimeframeWindowId;
  readonly dataSourceMode: ObservabilityDataSourceMode;
  readonly targetBatchSize: number;
  readonly estimatedActiveScholars: number;
  readonly batchPenetrationPercent: number;
  readonly totalWorkerRequests: number;
  readonly totalWorkerErrors: number;
  readonly totalD1ReadQueries: number;
  readonly totalD1RowsRead: number;
  readonly cacheHitRatioPercent: number;
  readonly globalCpuTimeP50Ms: number;
  readonly globalCpuTimeP99Ms: number;
  readonly topColoCode: string;
}

/**
 * Immutable Value Object representing a generated export file artifact ready for download or clipboard.
 */
export interface TelemetryExportArtifact {
  readonly formatId: TelemetryExportFormatId;
  readonly scope: TelemetryExportScope;
  readonly label: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly fileExtension: 'csv' | 'json' | 'md';
  readonly content: string;
  readonly byteSize: number;
  readonly rowCount: number;
  readonly checksumHex: string;
  readonly generatedAtIso: string;
}

export interface TelemetryExportContext {
  readonly snapshot: UnifiedEdgeObservabilitySnapshot;
  readonly longitudinalSnapshot7d?: UnifiedEdgeObservabilitySnapshot;
  readonly aiBriefing?: AiExecutiveTelemetryBriefing | null;
  readonly historicalCheckpoints: readonly HistoricalTelemetryCheckpoint[];
  readonly scope: TelemetryExportScope;
}

/**
 * Strategy Pattern: Encapsulates format-specific serialization of observability metrics over time.
 */
export interface ITelemetryExportStrategy {
  readonly formatId: TelemetryExportFormatId;
  readonly label: string;
  readonly description: string;
  readonly mimeType: string;
  readonly fileExtension: 'csv' | 'json' | 'md';
  generateArtifact(context: TelemetryExportContext): TelemetryExportArtifact;
}

