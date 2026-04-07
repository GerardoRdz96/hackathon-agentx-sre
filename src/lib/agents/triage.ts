import { classifyIncident, analyzeImage } from '../claude';
import { startTrace, endTrace } from '../traces';
import { logAgentStart, logAgentEnd } from '../logger';
import { recordAgentDuration } from '../metrics';

export interface TriageInput {
  incidentId: number;
  title: string;
  description: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface TriageResult {
  severity: string;
  component: string;
  type: string;
  confidence: number;
  reasoning: string;
  imageAnalysis?: {
    description: string;
    error_indicators: string[];
    relevant_components: string[];
  };
}

export async function runTriageAgent(input: TriageInput): Promise<TriageResult> {
  logAgentStart(input.incidentId, 'triage');
  const agentStart = performance.now();
  const traceKey = startTrace(input.incidentId, 'triage', `Title: ${input.title}`);

  try {
    let imageAnalysis: TriageResult['imageAnalysis'] | undefined;

    // If image is present, analyze it first for additional context
    if (input.imageBase64 && input.imageMimeType) {
      imageAnalysis = await analyzeImage(
        input.imageBase64,
        input.imageMimeType,
        `${input.title}: ${input.description}`
      );
    }

    // Enhance description with image analysis if available
    const enhancedDescription = imageAnalysis
      ? `${input.description}\n\n[Image Analysis]: ${imageAnalysis.description}. Error indicators: ${imageAnalysis.error_indicators.join(', ')}`
      : input.description;

    const classification = await classifyIncident({
      title: input.title,
      description: enhancedDescription,
    });

    const result: TriageResult = {
      severity: classification.severity,
      component: classification.component,
      type: classification.type,
      confidence: classification.confidence,
      reasoning: classification.reasoning || 'Classification based on incident description analysis.',
      ...(imageAnalysis && { imageAnalysis }),
    };

    const dur = performance.now() - agentStart;
    endTrace(traceKey, `Severity: ${result.severity}, Component: ${result.component}, Type: ${result.type}. Confidence: ${result.confidence}. ${result.reasoning}`);
    logAgentEnd(input.incidentId, 'triage', dur, `${result.severity}/${result.component}`);
    recordAgentDuration('triage', dur);
    return result;
  } catch (error) {
    endTrace(traceKey, `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    throw error;
  }
}
