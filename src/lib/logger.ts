/**
 * Structured Logger — Observability Layer
 * Outputs JSON-formatted logs for each pipeline stage.
 * In production: pipe to Datadog/ELK/CloudWatch via Docker stdout.
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  stage: string;
  incident_id: number;
  agent?: string;
  message: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

export function log(level: LogLevel, stage: string, incidentId: number, message: string, extra?: {
  agent?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}): void {
  const entry: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    stage,
    incident_id: incidentId,
    agent: extra?.agent,
    message,
    duration_ms: extra?.duration_ms,
    metadata: extra?.metadata,
  };

  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '📋';
  console.log(`${prefix} [${entry.stage}] ${JSON.stringify(entry)}`);
}

export function logPipelineStart(incidentId: number, title: string): void {
  log('INFO', 'ingest', incidentId, `Pipeline started: "${title}"`);
}

export function logAgentStart(incidentId: number, agentName: string): void {
  log('INFO', 'agent_start', incidentId, `Agent ${agentName} started`, { agent: agentName });
}

export function logAgentEnd(incidentId: number, agentName: string, durationMs: number, summary: string): void {
  log('INFO', 'agent_end', incidentId, `Agent ${agentName} completed: ${summary}`, {
    agent: agentName,
    duration_ms: Math.round(durationMs),
  });
}

export function logTriage(incidentId: number, severity: string, component: string): void {
  log('INFO', 'triage', incidentId, `Classified: ${severity}/${component}`, {
    metadata: { severity, component },
  });
}

export function logTicketCreated(incidentId: number, ticketId: number, team: string, assignee: string): void {
  log('INFO', 'ticket', incidentId, `Ticket #SRE-${ticketId} → ${team} (${assignee})`, {
    metadata: { ticket_id: ticketId, team, assignee },
  });
}

export function logNotification(incidentId: number, type: string, recipient: string): void {
  log('INFO', 'notify', incidentId, `Notification sent: ${type} → ${recipient}`, {
    metadata: { type, recipient },
  });
}

export function logResolved(incidentId: number): void {
  log('INFO', 'resolved', incidentId, 'Incident resolved, reporter notified');
}

export function logPipelineEnd(incidentId: number, totalMs: number): void {
  log('INFO', 'pipeline_complete', incidentId, `Pipeline finished in ${Math.round(totalMs)}ms`, {
    duration_ms: Math.round(totalMs),
  });
}

export function logError(incidentId: number, stage: string, error: string): void {
  log('ERROR', stage, incidentId, error);
}
