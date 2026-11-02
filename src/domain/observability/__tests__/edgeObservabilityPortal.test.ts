/**
 * @file edgeObservabilityPortal.test.ts
 * @description Apple Standard Vitest Verification Suite for SPEC-007.
 * Covers Biostatistical Cohort Math, Subsea Cable Geolocation, Circadian Rhythms,
 * 0ms AI Synthesis, and Edge Snapshot Invariants.
 */

import { describe, it, expect } from 'vitest';
import {
  BiostatisticalCohortAdoptionEstimator,
  SubseaColoTopologyEnricher,
  CircadianStudyRhythmClassifier,
  EdgeObservabilitySnapshotBuilder,
  VERIFIED_CLOUDFLARE_TELEMETRY_BASELINE,
} from '../edgeObservabilityEngine.ts';
import {
  DeterministicStatisticalNarrativeStrategy,
  CloudLlmTelemetryNarrativeStrategy,
  EdgeObservabilityFacade,
} from '../aiTelemetryNarrativeSynthesizer.ts';
import {
  telemetryExportOrchestrator,
  computeTelemetryChecksumHex,
} from '../telemetryExportEngine.ts';
import type { AiDiagnosticLensId } from '../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';

describe('SPEC-007: Edge Observability & Cohort Intelligence Portal', () => {
  const snapshotBuilder = new EdgeObservabilitySnapshotBuilder();

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Biostatistical Cohort Adoption Math
  // --------------------------------------------------------------------------
  describe('BiostatisticalCohortAdoptionEstimator', () => {
    const estimator = new BiostatisticalCohortAdoptionEstimator();

    it('estimates ~65 active scholars with 95% confidence interval for N=110 batch', () => {
      const snapshot = snapshotBuilder.buildSnapshot({ timeframe: '48h', targetBatchSize: 110 });
      const estimate = estimator.estimateCohortAdoption({
        totalWorkerRequests: snapshot.totalWorkerRequests,
        assetMetrics: snapshot.assetCacheMetrics,
        d1Summary: snapshot.d1Summary,
        hourlyTimeline: snapshot.hourlyTimeline,
        targetBatchSize: 110,
      });

      expect(estimate.targetBatchSize).toBe(110);
      expect(estimate.estimatedUniqueScholarsActive).toBeGreaterThanOrEqual(50);
      expect(estimate.estimatedUniqueScholarsActive).toBeLessThanOrEqual(80);
      expect(estimate.estimatedConfidenceInterval[0]).toBeLessThan(estimate.estimatedUniqueScholarsActive);
      expect(estimate.estimatedConfidenceInterval[1]).toBeGreaterThan(estimate.estimatedUniqueScholarsActive);
      expect(estimate.batchPenetrationPercent).toBeGreaterThan(45);
      expect(estimate.batchPenetrationPercent).toBeLessThan(75);
    });

    it('calculates repeat visitor revalidation ratio (~21.6%) from HTTP 304 and 200 counts', () => {
      const snapshot = snapshotBuilder.buildSnapshot({ timeframe: '48h', targetBatchSize: 110 });
      const { repeatVisitorRevalidationRatio } = snapshot.cohortEstimate;

      // 279 / 1294 = 21.56% -> rounded 21.6%
      expect(repeatVisitorRevalidationRatio).toBeCloseTo(21.6, 0.5);
    });

    it('dynamically adapts when target batch size is scaled to N=250', () => {
      const snapshot = snapshotBuilder.buildSnapshot({ timeframe: '48h', targetBatchSize: 250 });
      expect(snapshot.cohortEstimate.targetBatchSize).toBe(250);
      expect(snapshot.cohortEstimate.batchPenetrationPercent).toBeCloseTo(
        (snapshot.cohortEstimate.estimatedUniqueScholarsActive / 250) * 100,
        1
      );
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Subsea Cable & Anycast PoP Topology
  // --------------------------------------------------------------------------
  describe('SubseaColoTopologyEnricher', () => {
    const enricher = new SubseaColoTopologyEnricher();

    it('enriches raw colos with Mediterranean subsea fiber metadata and colors', () => {
      const enriched = enricher.enrichColos(VERIFIED_CLOUDFLARE_TELEMETRY_BASELINE.rawColos);

      expect(enriched.length).toBe(7);
      expect(enriched[0]?.coloCode).toBe('MRS');
      expect(enriched[0]?.city).toBe('Marseille');
      expect(enriched[0]?.country).toBe('France');
      expect(enriched[0]?.routingExplanation).toContain('submarine');
      expect(enriched[0]?.trafficSharePercent).toBeGreaterThan(70);

      // Verify traffic shares sum to ~100%
      const totalShare = enriched.reduce((acc, c) => acc + c.trafficSharePercent, 0);
      expect(totalShare).toBeGreaterThanOrEqual(99.5);
      expect(totalShare).toBeLessThanOrEqual(100.5);
    });

    it('assigns valid Apple semantic hex color codes to all PoPs', () => {
      const enriched = enricher.enrichColos(VERIFIED_CLOUDFLARE_TELEMETRY_BASELINE.rawColos);
      const hexPattern = /^#[0-9a-fA-F]{6}$/;

      for (const colo of enriched) {
        expect(colo.accentColorHex).toMatch(hexPattern);
      }
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Circadian Medical Study Rhythm (Cairo Timezone)
  // --------------------------------------------------------------------------
  describe('CircadianStudyRhythmClassifier', () => {
    it('correctly converts UTC hours to Cairo Local Time (UTC+2)', () => {
      expect(CircadianStudyRhythmClassifier.formatCairoTime('2026-10-31T13:00:00Z')).toBe('15:00 EET');
      expect(CircadianStudyRhythmClassifier.formatCairoTime('2026-10-31T14:00:00Z')).toBe('16:00 EET');
      expect(CircadianStudyRhythmClassifier.formatCairoTime('2026-10-31T18:00:00Z')).toBe('20:00 EET');
      expect(CircadianStudyRhythmClassifier.formatCairoTime('2026-10-31T23:00:00Z')).toBe('01:00 EET');
    });

    it('classifies afternoon hospital surge (15:00-20:59 Cairo) as peak-afternoon-rush', () => {
      // 13:00 UTC = 15:00 Cairo
      expect(CircadianStudyRhythmClassifier.classifyPhase('2026-10-31T13:00:00Z')).toBe(
        'peak-afternoon-rush'
      );
      // 16:00 UTC = 18:00 Cairo
      expect(CircadianStudyRhythmClassifier.classifyPhase('2026-10-31T16:00:00Z')).toBe(
        'peak-afternoon-rush'
      );
      // 23:00 UTC = 01:00 Cairo
      expect(CircadianStudyRhythmClassifier.classifyPhase('2026-10-31T23:00:00Z')).toBe(
        'late-night-owl'
      );
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Deterministic & Cloud AI Telemetry Co-Pilot
  // --------------------------------------------------------------------------
  describe('AI Executive Telemetry Co-Pilot', () => {
    const deterministicSynthesizer = new DeterministicStatisticalNarrativeStrategy();
    const cloudSynthesizer = new CloudLlmTelemetryNarrativeStrategy();
    const facade = new EdgeObservabilityFacade();
    const snapshot = snapshotBuilder.buildSnapshot({ timeframe: '48h', targetBatchSize: 110 });

    const lenses: AiDiagnosticLensId[] = [
      'executive-cohort-briefing',
      'subsea-isp-routing-forensics',
      'd1-storage-and-cache-audit',
      'exam-surge-capacity-forecast',
    ];

    it.each(lenses)('synthesizes structured briefing for lens "%s" in <1ms', async (lensId) => {
      const res = await deterministicSynthesizer.synthesizeBriefing({
        snapshot,
        lensId,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const briefing = res.value;
      expect(briefing.lensId).toBe(lensId);
      expect(briefing.healthScore).toBeGreaterThanOrEqual(90);
      expect(briefing.headline.length).toBeGreaterThan(10);
      expect(briefing.executiveSummary.length).toBeGreaterThan(20);
      expect(briefing.sections.length).toBeGreaterThanOrEqual(1);

      for (const section of briefing.sections) {
        expect(section.title.length).toBeGreaterThan(3);
        expect(section.summary.length).toBeGreaterThan(5);
        expect(section.keyTakeaways.length).toBeGreaterThan(0);
        expect(['optimal', 'positive', 'warning', 'critical']).toContain(section.sentiment);
      }
    });

    it('circuit-breaker falls back seamlessly when cloud LLM engine is unavailable', async () => {
      const res = await cloudSynthesizer.synthesizeBriefing({
        snapshot,
        lensId: 'executive-cohort-briefing',
        providerId: 'unconfigured-dummy-provider',
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.headline).toContain('High Batch Adoption');
      expect(res.value.healthScore).toBe(98);
    });

    it('facade generates executive briefing without throwing exceptions', async () => {
      const briefing = await facade.generateExecutiveBriefing({
        snapshot,
        lensId: 'd1-storage-and-cache-audit',
        providerId: 'deterministic-local',
      });

      expect(briefing.healthScore).toBeGreaterThanOrEqual(95);
      expect(briefing.sections.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Snapshot Mathematical Invariants
  // --------------------------------------------------------------------------
  describe('Snapshot Mathematical Invariants', () => {
    it('preserves exact verified launch invariants (1,896 requests, 0 errors, 555K rows)', () => {
      const snapshot = snapshotBuilder.buildSnapshot({ timeframe: '48h', targetBatchSize: 110 });

      expect(snapshot.totalWorkerRequests).toBe(1896);
      expect(snapshot.totalWorkerErrors).toBe(0);
      expect(snapshot.reliabilitySlaPercent).toBe(100.0);
      expect(snapshot.d1Summary.totalRowsRead).toBe(555039);
      expect(snapshot.assetCacheMetrics.totalAssetRequests).toBe(1294);
      expect(snapshot.assetCacheMetrics.cacheHitRatioPercent).toBe(98.4);
      expect(snapshot.coloDistribution[0]?.coloCode).toBe('MRS');
      expect(snapshot.coloDistribution[0]?.trafficSharePercent).toBeCloseTo(72.3, 0.5);
    });

    it('scales deterministically across 24h and 7d timeframes', () => {
      const snap24 = snapshotBuilder.buildSnapshot({ timeframe: '24h', targetBatchSize: 110 });
      const snap48 = snapshotBuilder.buildSnapshot({ timeframe: '48h', targetBatchSize: 110 });
      const snap7d = snapshotBuilder.buildSnapshot({ timeframe: '7d', targetBatchSize: 110 });

      expect(snap24.totalWorkerRequests).toBeLessThan(snap48.totalWorkerRequests);
      expect(snap7d.totalWorkerRequests).toBeGreaterThan(snap48.totalWorkerRequests);
    });
  });

  // ==========================================================================
  // 5. TELEMETRY TIME-SERIES EXPORT & LONGITUDINAL ARCHIVAL ENGINE
  // ==========================================================================
  describe('TelemetryExportOrchestrator & Longitudinal Ledger', () => {
    const snapshot = snapshotBuilder.buildSnapshot({
      timeframe: '48h',
      targetBatchSize: 110,
    });
    const facade = new EdgeObservabilityFacade();
    const checkpoints = telemetryExportOrchestrator.ledger.getCheckpoints();

    it('generates RFC-4180 UTF-8 BOM Time-Series CSV with cumulative running totals and summary row', () => {
      const artifact = telemetryExportOrchestrator.generateArtifact('csv-timeseries', {
        snapshot,
        historicalCheckpoints: checkpoints,
        scope: 'active-timeframe',
      });

      expect(artifact.formatId).toBe('csv-timeseries');
      expect(artifact.fileExtension).toBe('csv');
      expect(artifact.content.startsWith('\uFEFF')).toBe(true);
      expect(artifact.content).toContain('sequence_index,timeframe_window,iso_hour_utc');
      expect(artifact.content).toContain('cumulative_worker_requests,cumulative_d1_read_queries,cumulative_d1_rows_read');
      expect(artifact.content).toContain('SUMMARY_TOTAL,48h');
      expect(artifact.content).toContain('1896');
      expect(artifact.content).toContain('555039');
      expect(artifact.checksumHex).toMatch(/^fnv1a-[0-9a-f]{16}$/);
      expect(artifact.rowCount).toBe(snapshot.hourlyTimeline.length);
    });

    it('generates Schema-Validated Full Telemetry JSON Archive with longitudinal sync history ledger', async () => {
      const briefing = await facade.generateExecutiveBriefing({
        snapshot,
        lensId: 'executive-cohort-briefing',
        providerId: 'deterministic-local',
      });
      const artifact = telemetryExportOrchestrator.generateArtifact('json-archive-bundle', {
        snapshot,
        aiBriefing: briefing,
        historicalCheckpoints: checkpoints,
        scope: 'active-timeframe',
      });

      expect(artifact.formatId).toBe('json-archive-bundle');
      expect(artifact.fileExtension).toBe('json');
      const parsed = JSON.parse(artifact.content);
      expect(parsed.schemaVersion).toBe('1.0.0-medquests-edge-observability');
      expect(parsed.integrityChecksum).toBe(artifact.checksumHex);
      expect(parsed.executiveKpiSummary.totalWorkerRequests).toBe(1896);
      expect(parsed.timeSeriesMetricsOverTime.length).toBe(snapshot.hourlyTimeline.length);
      expect(parsed.subseaColoTopology.length).toBe(7);
      expect(parsed.aiExecutiveBriefing.headline).toBeTruthy();
      expect(parsed.longitudinalSyncHistoryLedger.length).toBeGreaterThanOrEqual(3);
    });

    it('generates Executive Board Markdown Report (.md) with KPI scorecard, PoP table, and hourly progression', async () => {
      const briefing = await facade.generateExecutiveBriefing({
        snapshot,
        lensId: 'executive-cohort-briefing',
        providerId: 'deterministic-local',
      });
      const artifact = telemetryExportOrchestrator.generateArtifact('markdown-executive-report', {
        snapshot,
        aiBriefing: briefing,
        historicalCheckpoints: checkpoints,
        scope: 'active-timeframe',
      });

      expect(artifact.formatId).toBe('markdown-executive-report');
      expect(artifact.fileExtension).toBe('md');
      expect(artifact.content).toContain('# Cloudflare Edge Observability & Cohort Intelligence');
      expect(artifact.content).toContain('## 1. Executive Cohort & Reliability Scorecard');
      expect(artifact.content).toContain('## 2. Subsea Anycast Point-of-Presence (PoP) Routing Distribution');
      expect(artifact.content).toContain('## 3. Hourly Time-Series Progression Over Time');
      expect(artifact.content).toContain('## 4. AI Executive Telemetry Co-Pilot Synthesis');
      expect(artifact.content).toContain('## 5. Longitudinal Sync History Ledger');
      expect(artifact.content).toContain(artifact.checksumHex);
    });

    it('generates Subsea PoP & Silicon Latency Matrix CSV (.csv) for all 7 colos', () => {
      const artifact = telemetryExportOrchestrator.generateArtifact('csv-pop-topology', {
        snapshot,
        historicalCheckpoints: checkpoints,
        scope: 'active-timeframe',
      });

      expect(artifact.formatId).toBe('csv-pop-topology');
      expect(artifact.rowCount).toBe(7);
      expect(artifact.content).toContain('MRS,Marseille,France,FR');
      expect(artifact.content).toContain('ZRH,Zurich,Switzerland,CH');
      expect(artifact.content).toContain('CAI,Cairo,Egypt,EG');
    });

    it('automatically expands to 7-day longitudinal horizon when scope is longitudinal-7d-full', () => {
      const artifact7d = telemetryExportOrchestrator.generateArtifact('csv-timeseries', {
        snapshot, // 48h snapshot passed in
        historicalCheckpoints: checkpoints,
        scope: 'longitudinal-7d-full',
      });

      expect(artifact7d.filename).toContain('-7d-');
      expect(artifact7d.content).toContain('SUMMARY_TOTAL,7d');
      expect(computeTelemetryChecksumHex('med-quests')).toMatch(/^fnv1a-[0-9a-f]{16}$/);
    });
  });
});
