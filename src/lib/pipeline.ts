import { db } from './db';
import { incidents } from './schema';
import { eq } from 'drizzle-orm';
import { runTriageAgent, type TriageResult } from './agents/triage';
import { runLogAnalystAgent, type LogAnalysisResult } from './agents/log-analyst';
import { runCodeAnalystAgent, type CodeAnalysisResult } from './agents/code-analyst';
import { runHypothesisAgent, type HypothesisResult } from './agents/hypothesis';
import { runRouterAgent, type RouterResult } from './agents/router';
import { getTraceTimeline } from './traces';

export interface PipelineInput {
  incidentId: number;
  title: string;
  description: string;
  reporterEmail?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface PipelineResult {
  incidentId: number;
  triage: TriageResult;
  logAnalysis: LogAnalysisResult;
  codeAnalysis: CodeAnalysisResult;
  hypotheses: HypothesisResult;
  routing: RouterResult;
  traces: ReturnType<typeof getTraceTimeline>;
  totalDurationMs: number;
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const startTime = performance.now();

  // Agent 1: Triage
  db.update(incidents).set({ status: 'triaged' }).where(eq(incidents.id, input.incidentId)).run();

  const triage = await runTriageAgent({
    incidentId: input.incidentId,
    title: input.title,
    description: input.description,
    imageBase64: input.imageBase64,
    imageMimeType: input.imageMimeType,
  });

  // Update incident with triage results
  db.update(incidents).set({
    severity: triage.severity as 'critical' | 'high' | 'medium' | 'low',
    component: triage.component,
    type: triage.type,
    status: 'investigating',
  }).where(eq(incidents.id, input.incidentId)).run();

  // Agents 2 + 3: Log Analyst and Code Analyst (in parallel)
  const [logAnalysis, codeAnalysis] = await Promise.all([
    runLogAnalystAgent({
      incidentId: input.incidentId,
      description: input.description,
      component: triage.component,
      type: triage.type,
    }),
    runCodeAnalystAgent({
      incidentId: input.incidentId,
      description: input.description,
      component: triage.component,
      type: triage.type,
    }),
  ]);

  // Agent 4: Hypothesis Generator
  const hypotheses = await runHypothesisAgent({
    incidentId: input.incidentId,
    description: input.description,
    triage,
    logAnalysis,
    codeAnalysis,
  });

  // Agent 5: Router
  const routing = await runRouterAgent({
    incidentId: input.incidentId,
    triage,
    hypothesisResult: hypotheses,
    reporterEmail: input.reporterEmail,
  });

  const totalDurationMs = performance.now() - startTime;
  const traces = getTraceTimeline(input.incidentId);

  return {
    incidentId: input.incidentId,
    triage,
    logAnalysis,
    codeAnalysis,
    hypotheses,
    routing,
    traces,
    totalDurationMs: Math.round(totalDurationMs),
  };
}
