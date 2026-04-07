import { analyzeLogs } from '../claude';
import { searchLogs, getAnomalousLogs } from '../simulated-logs';
import { startTrace, endTrace } from '../traces';

export interface LogAnalysisInput {
  incidentId: number;
  description: string;
  component?: string;
  type?: string;
}

export interface LogAnalysisResult {
  patterns_found: string[];
  relevant_entries: Array<{
    timestamp: string;
    level: string;
    service: string;
    message: string;
  }>;
  correlation_score: number;
  anomaly_summary: string;
}

export async function runLogAnalystAgent(input: LogAnalysisInput): Promise<LogAnalysisResult> {
  const traceKey = startTrace(input.incidentId, 'log-analyst', `Component: ${input.component || 'all'}, Type: ${input.type || 'all'}`);

  try {
    // Search logs related to the incident
    const relatedLogs = searchLogs(input.description, {
      service: input.component,
      limit: 50,
    });

    // Also get anomalous logs for broader context
    const anomalousLogs = getAnomalousLogs().slice(0, 30);

    // Combine and deduplicate
    const allLogs = [...relatedLogs];
    for (const log of anomalousLogs) {
      if (!allLogs.some(l => l.timestamp === log.timestamp && l.message === log.message)) {
        allLogs.push(log);
      }
    }

    // Format logs for Claude analysis
    const logStrings = allLogs.slice(0, 80).map(l =>
      `[${l.timestamp}] ${l.level} [${l.service}] ${l.message}${l.metadata ? ' ' + JSON.stringify(l.metadata) : ''}`
    );

    // Call Claude to analyze the logs
    const analysis = await analyzeLogs({
      incident_description: input.description,
      log_entries: logStrings,
    });

    // Calculate correlation score based on how many related entries we found
    const errorCount = allLogs.filter(l => l.level === 'ERROR').length;
    const warnCount = allLogs.filter(l => l.level === 'WARN').length;
    const correlationScore = Math.min(1, (errorCount * 0.15 + warnCount * 0.05));

    const result: LogAnalysisResult = {
      patterns_found: analysis.patterns,
      relevant_entries: allLogs.slice(0, 20).map(l => ({
        timestamp: l.timestamp,
        level: l.level,
        service: l.service,
        message: l.message,
      })),
      correlation_score: Math.round(correlationScore * 100) / 100,
      anomaly_summary: analysis.correlation,
    };

    endTrace(traceKey, `Found ${result.patterns_found.length} patterns, ${result.relevant_entries.length} entries, correlation: ${result.correlation_score}`);
    return result;
  } catch (error) {
    endTrace(traceKey, `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    throw error;
  }
}
