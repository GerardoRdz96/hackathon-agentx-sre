import { generateHypothesis } from '../claude';
import { startTrace, endTrace } from '../traces';
import { logAgentStart, logAgentEnd } from '../logger';
import { recordAgentDuration } from '../metrics';
import type { TriageResult } from './triage';
import type { LogAnalysisResult } from './log-analyst';
import type { CodeAnalysisResult } from './code-analyst';

export interface HypothesisInput {
  incidentId: number;
  description: string;
  triage: TriageResult;
  logAnalysis: LogAnalysisResult;
  codeAnalysis: CodeAnalysisResult;
}

export interface Hypothesis {
  rank: number;
  description: string;
  evidence: string[];
  confidence: number;
  blast_radius: string;
  suggested_fix: string;
}

export interface HypothesisResult {
  hypotheses: Hypothesis[];
}

export async function runHypothesisAgent(input: HypothesisInput): Promise<HypothesisResult> {
  logAgentStart(input.incidentId, 'hypothesis');
  const agentStart = performance.now();
  const traceKey = startTrace(input.incidentId, 'hypothesis', `Triage: ${input.triage.severity}/${input.triage.component}`);

  try {
    // Defensive: ensure log/code analysis properties exist
    const patterns = input.logAnalysis?.patterns_found || [];
    const errorEntries = (input.logAnalysis?.relevant_entries || [])
      .filter(e => e.level === 'ERROR')
      .map(e => e.message)
      .slice(0, 10);

    const result = await generateHypothesis({
      triage: {
        severity: input.triage.severity,
        component: input.triage.component,
        type: input.triage.type,
      },
      log_analysis: {
        patterns,
        anomalies: errorEntries,
      },
      code_analysis: {
        analysis: input.codeAnalysis?.analysis || 'No code analysis available',
        suspicious_files: input.codeAnalysis?.files_found || [],
      },
      incident_description: input.description,
    });

    // Defensive: ensure hypotheses array exists and sort safely
    const hypotheses = Array.isArray(result?.hypotheses) ? result.hypotheses : [];
    if (hypotheses.length === 0) {
      hypotheses.push({
        rank: 1,
        description: `${input.triage.component} ${input.triage.type} incident requires investigation`,
        evidence: [`Severity: ${input.triage.severity}`, `Component: ${input.triage.component}`],
        confidence: 0.5,
        blast_radius: 'Unknown — requires manual investigation',
        suggested_fix: 'Investigate recent changes and logs for the affected component',
      });
    }
    hypotheses.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    const safeResult: HypothesisResult = { hypotheses };
    endTrace(traceKey, `Generated ${hypotheses.length} hypotheses, top confidence: ${hypotheses[0]?.confidence || 0}`);
    const dur = performance.now() - agentStart;
    logAgentEnd(input.incidentId, 'hypothesis', dur, `${hypotheses[0]?.description || 'no hypothesis'}`);
    recordAgentDuration('hypothesis', dur);
    return safeResult;
  } catch (error) {
    endTrace(traceKey, `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    throw error;
  }
}
