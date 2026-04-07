import { db } from './db';
import { traces } from './schema';
import { eq } from 'drizzle-orm';

interface ActiveTrace {
  incidentId: number;
  agentName: string;
  inputSummary: string;
  startTime: number;
}

const activeTraces = new Map<string, ActiveTrace>();

export function startTrace(incidentId: number, agentName: string, inputSummary: string): string {
  const traceKey = `${incidentId}-${agentName}-${Date.now()}`;
  activeTraces.set(traceKey, {
    incidentId,
    agentName,
    inputSummary: inputSummary.slice(0, 500),
    startTime: performance.now(),
  });
  return traceKey;
}

export function endTrace(traceKey: string, outputSummary: string): number {
  const trace = activeTraces.get(traceKey);
  if (!trace) throw new Error(`Trace not found: ${traceKey}`);

  const durationMs = performance.now() - trace.startTime;

  db.insert(traces).values({
    incident_id: trace.incidentId,
    agent_name: trace.agentName,
    input_summary: trace.inputSummary,
    output_summary: outputSummary.slice(0, 1000),
    duration_ms: Math.round(durationMs * 100) / 100,
  }).run();

  activeTraces.delete(traceKey);
  return durationMs;
}

export function getTraceTimeline(incidentId: number) {
  return db.select().from(traces).where(eq(traces.incident_id, incidentId)).all();
}
