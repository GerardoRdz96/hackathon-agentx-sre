/**
 * Metrics — Observability Layer (SQLite-backed + in-memory session counters)
 * Reads historical data from SQLite for accurate totals.
 * In-memory counters track current session for fast recording.
 * In production: export to Prometheus/Datadog via /api/metrics endpoint.
 */
import { db, sqlite } from './db';

const BOOT_TIME = new Date().toISOString();

// ─── In-Memory Session Counters (fast writes) ────────────────────────────────
let sessionErrors = 0;

export function recordIncident(_severity: string, _component: string): void {
  // Data already persisted in SQLite by pipeline — no-op for in-memory
}

export function recordPipelineDuration(_durationMs: number): void {
  // Duration recorded in traces table by pipeline — no-op for in-memory
}

export function recordAgentDuration(_agentName: string, _durationMs: number): void {
  // Duration recorded in traces table by pipeline — no-op for in-memory
}

export function recordError(): void {
  sessionErrors++;
}

// ─── Get Metrics (reads from SQLite for accuracy) ────────────────────────────
export function getMetrics() {
  try {
    // Total incidents
    const totalRow = sqlite.prepare('SELECT COUNT(*) as cnt FROM incidents').get() as { cnt: number } | undefined;
    const incidents_total = totalRow?.cnt ?? 0;

    // Incidents by severity
    const sevRows = sqlite.prepare('SELECT severity, COUNT(*) as cnt FROM incidents WHERE severity IS NOT NULL GROUP BY severity').all() as { severity: string; cnt: number }[];
    const incidents_by_severity: Record<string, number> = {};
    for (const row of sevRows) {
      incidents_by_severity[row.severity] = row.cnt;
    }

    // Incidents by component
    const compRows = sqlite.prepare('SELECT component, COUNT(*) as cnt FROM incidents WHERE component IS NOT NULL GROUP BY component').all() as { component: string; cnt: number }[];
    const incidents_by_component: Record<string, number> = {};
    for (const row of compRows) {
      incidents_by_component[row.component] = row.cnt;
    }

    // Agent average durations from traces
    const agentRows = sqlite.prepare('SELECT agent_name, AVG(duration_ms) as avg_ms FROM traces WHERE duration_ms IS NOT NULL GROUP BY agent_name').all() as { agent_name: string; avg_ms: number }[];
    const agent_avg_duration_ms: Record<string, number> = {};
    for (const row of agentRows) {
      agent_avg_duration_ms[row.agent_name] = Math.round(row.avg_ms);
    }

    // Pipeline avg duration (sum of agent durations per incident, then average)
    const pipeRow = sqlite.prepare(`
      SELECT AVG(total_ms) as avg_pipeline FROM (
        SELECT incident_id, SUM(duration_ms) as total_ms
        FROM traces
        WHERE duration_ms IS NOT NULL
        GROUP BY incident_id
      )
    `).get() as { avg_pipeline: number } | undefined;
    const pipeline_avg_duration_ms = Math.round(pipeRow?.avg_pipeline ?? 0);

    return {
      incidents_total,
      incidents_by_severity,
      incidents_by_component,
      pipeline_avg_duration_ms,
      agent_avg_duration_ms,
      errors_total: sessionErrors,
      uptime_since: BOOT_TIME,
    };
  } catch {
    // Fallback if tables don't exist yet
    return {
      incidents_total: 0,
      incidents_by_severity: {},
      incidents_by_component: {},
      pipeline_avg_duration_ms: 0,
      agent_avg_duration_ms: {},
      errors_total: sessionErrors,
      uptime_since: BOOT_TIME,
    };
  }
}
