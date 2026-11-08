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

export class CsvTimeSeriesExportStrategy implements ITelemetryExportStrategy {
  public readonly formatId: TelemetryExportFormatId = 'csv-timeseries';
  public readonly label = 'Time-Series CSV (Excel / Numbers / Pandas)';
  public readonly description =
    'RFC-4180 UTF-8 BOM spreadsheet with hourly metrics over time, cumulative growth curves, silicon latency quantiles, and study phase tags.';
  public readonly mimeType = 'text/csv;charset=utf-8';
  public readonly fileExtension = 'csv' as const;

  public generateArtifact(context: TelemetryExportContext): TelemetryExportArtifact {
    const targetSnapshot = resolveTargetSnapshotForScope(context);
    const points = targetSnapshot.hourlyTimeline;
    const totalRequests = Math.max(1, targetSnapshot.totalWorkerRequests);

    const headers = [
      'sequence_index',
      'timeframe_window',
      'iso_hour_utc',
      'date_utc',
      'cairo_local_time',
      'utc_time',
      'circadian_study_phase',
      'worker_requests',
      'worker_errors',
      'worker_subrequests',
      'hourly_traffic_share_pct',
      'd1_read_queries',
      'd1_write_queries',
      'd1_rows_read',
      'd1_rows_written',
      'd1_response_bytes',
      'cpu_time_p50_ms',
      'cpu_time_p90_ms',
      'cpu_time_p99_ms',
      'duration_p50_ms',
      'estimated_concurrent_scholars',
      'cumulative_worker_requests',
      'cumulative_d1_read_queries',
      'cumulative_d1_rows_read',
    ];

    const rows: string[] = [buildCsvRow(headers)];

    let cumRequests = 0;
    let cumD1Queries = 0;
    let cumD1Rows = 0;

    points.forEach((pt, idx) => {
      cumRequests += pt.workerRequests;
      cumD1Queries += pt.d1ReadQueries;
      cumD1Rows += pt.d1RowsRead;
      const sharePct = Number(((pt.workerRequests / totalRequests) * 100).toFixed(2));

      rows.push(
        buildCsvRow([
          idx + 1,
          targetSnapshot.timeframeWindow,
          pt.isoHourUtc,
          pt.dateUtc,
          pt.displayHourCairo,
          pt.displayHourUtc,
          pt.studyPhase,
          pt.workerRequests,
          pt.workerErrors,
          pt.workerSubrequests,
          sharePct,
          pt.d1ReadQueries,
          pt.d1WriteQueries,
          pt.d1RowsRead,
          pt.d1RowsWritten,
          pt.d1ResponseBytes,
          Number((pt.cpuTimeP50Us / 1000).toFixed(3)),
          Number((pt.cpuTimeP90Us / 1000).toFixed(3)),
          Number((pt.cpuTimeP99Us / 1000).toFixed(3)),
          pt.durationP50Ms,
          pt.estimatedConcurrentScholars,
          cumRequests,
          cumD1Queries,
          cumD1Rows,
        ])
      );
    });

    // Summary Footer Row for instant spreadsheet verification
    rows.push(
      buildCsvRow([
        'SUMMARY_TOTAL',
        targetSnapshot.timeframeWindow,
        targetSnapshot.generatedAtIso,
        'ALL_DATES',
        `Peak: ${targetSnapshot.cohortEstimate.peakHourDisplayCairo}`,
        'ALL_HOURS',
        `Active Cohort: ${targetSnapshot.cohortEstimate.estimatedUniqueScholarsActive}/${targetSnapshot.cohortEstimate.targetBatchSize} (${targetSnapshot.cohortEstimate.batchPenetrationPercent}%)`,
        targetSnapshot.totalWorkerRequests,
        targetSnapshot.totalWorkerErrors,
        targetSnapshot.totalWorkerSubrequests,
        100.0,
        targetSnapshot.d1Summary.totalReadQueries,
        targetSnapshot.d1Summary.totalWriteQueries,
        targetSnapshot.d1Summary.totalRowsRead,
        targetSnapshot.d1Summary.totalRowsWritten,
        targetSnapshot.d1Summary.totalBatchResponseBytes,
        targetSnapshot.globalCpuTimeP50Ms,
        targetSnapshot.globalCpuTimeP90Ms,
        targetSnapshot.globalCpuTimeP99Ms,
        targetSnapshot.globalDurationP50Ms,
        targetSnapshot.cohortEstimate.peakHourConcurrency,
        cumRequests,
        cumD1Queries,
        cumD1Rows,
      ])
    );

    // Prepend UTF-8 BOM (\uFEFF) so Excel & Apple Numbers open UTF-8 cleanly
    const csvBody = '\uFEFF' + rows.join('\r\n') + '\r\n';
    const checksumHex = computeTelemetryChecksumHex(csvBody);
    const slug = formatDateSlug(targetSnapshot.generatedAtIso);

    return {
      formatId: this.formatId,
      scope: context.scope,
      label: this.label,
      filename: `med-quests-cloudflare-timeseries-${targetSnapshot.timeframeWindow}-${slug}.csv`,
      mimeType: this.mimeType,
      fileExtension: this.fileExtension,
      content: csvBody,
      byteSize: getUtf8ByteSize(csvBody),
      rowCount: points.length,
      checksumHex,
      generatedAtIso: targetSnapshot.generatedAtIso,
    };
  }
}
