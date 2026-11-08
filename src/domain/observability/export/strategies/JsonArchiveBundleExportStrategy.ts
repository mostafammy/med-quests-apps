import type {
  ITelemetryExportStrategy,
  TelemetryExportArtifact,
  TelemetryExportContext,
  TelemetryExportFormatId,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';
import {
  computeTelemetryChecksumHex,
  formatDateSlug,
  getUtf8ByteSize,
  resolveTargetSnapshotForScope,
} from '../telemetryExportUtils.ts';

export class JsonArchiveBundleExportStrategy implements ITelemetryExportStrategy {
  public readonly formatId: TelemetryExportFormatId = 'json-archive-bundle';
  public readonly label = 'Full Telemetry JSON Archive (.json)';
  public readonly description =
    'Schema-validated longitudinal JSON bundle with hourly time-series, cumulative curves, PoP subsea routing, AI Co-Pilot briefing, and sync history ledger.';
  public readonly mimeType = 'application/json;charset=utf-8';
  public readonly fileExtension = 'json' as const;

  public generateArtifact(context: TelemetryExportContext): TelemetryExportArtifact {
    const targetSnapshot = resolveTargetSnapshotForScope(context);

    let runningRequests = 0;
    let runningRows = 0;
    const enrichedTimeline = targetSnapshot.hourlyTimeline.map((pt, index) => {
      runningRequests += pt.workerRequests;
      runningRows += pt.d1RowsRead;
      return {
        sequenceIndex: index + 1,
        ...pt,
        cpuTimeP50Ms: Number((pt.cpuTimeP50Us / 1000).toFixed(3)),
        cpuTimeP90Ms: Number((pt.cpuTimeP90Us / 1000).toFixed(3)),
        cpuTimeP99Ms: Number((pt.cpuTimeP99Us / 1000).toFixed(3)),
        cumulativeWorkerRequests: runningRequests,
        cumulativeD1RowsRead: runningRows,
      };
    });

    const payloadWithoutHash = {
      schemaVersion: '1.0.0-medquests-edge-observability',
      exportedAtIso: new Date().toISOString(),
      exportScope: context.scope,
      serviceMetadata: {
        workerName: targetSnapshot.workerName,
        workerUrl: targetSnapshot.workerUrl,
        d1DatabaseName: targetSnapshot.d1Summary.databaseName,
        d1DatabaseId: targetSnapshot.d1Summary.databaseId,
        dataSourceMode: targetSnapshot.dataSourceMode,
        timeframeWindow: targetSnapshot.timeframeWindow,
      },
      executiveKpiSummary: {
        totalWorkerRequests: targetSnapshot.totalWorkerRequests,
        totalWorkerErrors: targetSnapshot.totalWorkerErrors,
        reliabilitySlaPercent: targetSnapshot.reliabilitySlaPercent,
        globalCpuTimeP50Ms: targetSnapshot.globalCpuTimeP50Ms,
        globalCpuTimeP90Ms: targetSnapshot.globalCpuTimeP90Ms,
        globalCpuTimeP99Ms: targetSnapshot.globalCpuTimeP99Ms,
        globalDurationP50Ms: targetSnapshot.globalDurationP50Ms,
        cohortAdoption: targetSnapshot.cohortEstimate,
        assetCacheEfficiency: targetSnapshot.assetCacheMetrics,
        d1DatabasePerformance: targetSnapshot.d1Summary,
      },
      timeSeriesMetricsOverTime: enrichedTimeline,
      subseaColoTopology: targetSnapshot.coloDistribution,
      aiExecutiveBriefing: context.aiBriefing ?? null,
      longitudinalSyncHistoryLedger: context.historicalCheckpoints,
    };

    const preliminaryJson = JSON.stringify(payloadWithoutHash);
    const checksumHex = computeTelemetryChecksumHex(preliminaryJson);

    const finalPayload = {
      integrityChecksum: checksumHex,
      ...payloadWithoutHash,
    };

    const jsonString = JSON.stringify(finalPayload, null, 2);
    const slug = formatDateSlug(targetSnapshot.generatedAtIso);

    return {
      formatId: this.formatId,
      scope: context.scope,
      label: this.label,
      filename: `med-quests-cloudflare-telemetry-archive-${targetSnapshot.timeframeWindow}-${slug}.json`,
      mimeType: this.mimeType,
      fileExtension: this.fileExtension,
      content: jsonString,
      byteSize: getUtf8ByteSize(jsonString),
      rowCount: enrichedTimeline.length + targetSnapshot.coloDistribution.length,
      checksumHex,
      generatedAtIso: targetSnapshot.generatedAtIso,
    };
  }
}
