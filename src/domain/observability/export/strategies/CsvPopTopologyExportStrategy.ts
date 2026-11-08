import type {
  ITelemetryExportStrategy,
  TelemetryExportArtifact,
  TelemetryExportContext,
  TelemetryExportFormatId,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';
import {
  buildCsvRow,
  computeTelemetryChecksumHex,
  formatDateSlug,
  getUtf8ByteSize,
  resolveTargetSnapshotForScope,
} from '../telemetryExportUtils.ts';

export class CsvPopTopologyExportStrategy implements ITelemetryExportStrategy {
  public readonly formatId: TelemetryExportFormatId = 'csv-pop-topology';
  public readonly label = 'Subsea PoP & Latency Matrix CSV (.csv)';
  public readonly description =
    'Geographic Anycast Point-of-Presence breakdown with subsea fiber corridors, traffic shares, and P50/P90/P99 latency quantiles.';
  public readonly mimeType = 'text/csv;charset=utf-8';
  public readonly fileExtension = 'csv' as const;

  public generateArtifact(context: TelemetryExportContext): TelemetryExportArtifact {
    const targetSnapshot = resolveTargetSnapshotForScope(context);
    const headers = [
      'rank',
      'colo_code',
      'city',
      'country',
      'country_code',
      'subsea_cable_corridor',
      'isp_routing_explanation',
      'worker_requests',
      'worker_errors',
      'worker_subrequests',
      'traffic_share_percent',
      'estimated_d1_rows_served',
      'cpu_time_p50_ms',
      'cpu_time_p90_ms',
      'cpu_time_p99_ms',
      'duration_p50_ms',
      'duration_p90_ms',
      'duration_p99_ms',
    ];

    const rows: string[] = [buildCsvRow(headers)];
    targetSnapshot.coloDistribution.forEach((colo, idx) => {
      const estRows = Math.round(
        (colo.trafficSharePercent / 100) * targetSnapshot.d1Summary.totalRowsRead
      );
      rows.push(
        buildCsvRow([
          idx + 1,
          colo.coloCode,
          colo.city,
          colo.country,
          colo.countryCode,
          colo.regionLabel,
          colo.routingExplanation,
          colo.requests,
          colo.errors,
          colo.subrequests,
          colo.trafficSharePercent,
          estRows,
          colo.cpuTimeP50Ms,
          colo.cpuTimeP90Ms,
          colo.cpuTimeP99Ms,
          colo.durationP50Ms,
          colo.durationP90Ms,
          colo.durationP99Ms,
        ])
      );
    });

    const csvBody = '\uFEFF' + rows.join('\r\n') + '\r\n';
    const checksumHex = computeTelemetryChecksumHex(csvBody);
    const slug = formatDateSlug(targetSnapshot.generatedAtIso);

    return {
      formatId: this.formatId,
      scope: context.scope,
      label: this.label,
      filename: `med-quests-cloudflare-pop-topology-${targetSnapshot.timeframeWindow}-${slug}.csv`,
      mimeType: this.mimeType,
      fileExtension: this.fileExtension,
      content: csvBody,
      byteSize: getUtf8ByteSize(csvBody),
      rowCount: targetSnapshot.coloDistribution.length,
      checksumHex,
      generatedAtIso: targetSnapshot.generatedAtIso,
    };
  }
}
