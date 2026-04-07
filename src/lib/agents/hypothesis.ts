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
    const result = await generateHypothesis({
      triage: {
        severity: input.triage.severity,
        component: input.triage.component,
        type: input.triage.type,
      },
      log_analysis: {
        patterns: input.logAnalysis.patterns_found,
        anomalies: input.logAnalysis.relevant_entries
          .filter(e => e.level === 'ERROR')
          .map(e => e.message)
          .slice(0, 10),
      },
      code_analysis: {
        analysis: input.codeAnalysis.analysis,
        suspicious_files: input.codeAnalysis.files_found,
      },
      incident_description: input.description,
    });

    // Ensure hypotheses are sorted by rank
    result.hypotheses.sort((a, b) => a.rank - b.rank);

    endTrace(traceKey, `Generated ${result.hypotheses.length} hypotheses, top confidence: ${result.hypotheses[0]?.confidence || 0}`);
    const dur = performance.now() - agentStart;
    logAgentEnd(input.incidentId, 'hypothesis', dur, `${result.hypotheses[0]?.description || 'no hypothesis'}`);
    recordAgentDuration('hypothesis', dur);
    return result;
  } catch (error) {
    endTrace(traceKey, `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    throw error;
  }
}
