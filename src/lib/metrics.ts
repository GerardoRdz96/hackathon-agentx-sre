/**
 * In-Memory Metrics — Observability Layer
 * Tracks pipeline performance counters and averages.
 * In production: export to Prometheus/Datadog via /api/metrics endpoint.
 */

interface MetricsStore {
  incidents_total: number;
  incidents_by_severity: Record<string, number>;
  incidents_by_component: Record<string, number>;
  pipeline_duration_ms_total: number;
  pipeline_duration_ms_count: number;
  agent_duration_ms: Record<string, { total: number; count: number }>;
  errors_total: number;
  last_updated: string;
}

const store: MetricsStore = {
  incidents_total: 0,
  incidents_by_severity: {},
  incidents_by_component: {},
  pipeline_duration_ms_total: 0,
  pipeline_duration_ms_count: 0,
  agent_duration_ms: {},
  errors_total: 0,
  last_updated: new Date().toISOString(),
};

export function recordIncident(severity: string, component: string): void {
  store.incidents_total++;
  store.incidents_by_severity[severity] = (store.incidents_by_severity[severity] || 0) + 1;
  store.incidents_by_component[component] = (store.incidents_by_component[component] || 0) + 1;
  store.last_updated = new Date().toISOString();
}

export function recordPipelineDuration(durationMs: number): void {
  store.pipeline_duration_ms_total += durationMs;
  store.pipeline_duration_ms_count++;
  store.last_updated = new Date().toISOString();
}

export function recordAgentDuration(agentName: string, durationMs: number): void {
  if (!store.agent_duration_ms[agentName]) {
    store.agent_duration_ms[agentName] = { total: 0, count: 0 };
  }
  store.agent_duration_ms[agentName].total += durationMs;
  store.agent_duration_ms[agentName].count++;
}

export function recordError(): void {
  store.errors_total++;
  store.last_updated = new Date().toISOString();
}

export function getMetrics() {
  const avgPipeline = store.pipeline_duration_ms_count > 0
    ? Math.round(store.pipeline_duration_ms_total / store.pipeline_duration_ms_count)
    : 0;

  const agentAverages: Record<string, number> = {};
  for (const [agent, data] of Object.entries(store.agent_duration_ms)) {
    agentAverages[agent] = Math.round(data.total / data.count);
  }

  return {
    incidents_total: store.incidents_total,
    incidents_by_severity: store.incidents_by_severity,
    incidents_by_component: store.incidents_by_component,
    pipeline_avg_duration_ms: avgPipeline,
    agent_avg_duration_ms: agentAverages,
    errors_total: store.errors_total,
    uptime_since: store.last_updated,
  };
}
