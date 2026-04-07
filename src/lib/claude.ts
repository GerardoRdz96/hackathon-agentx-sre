import Anthropic from '@anthropic-ai/sdk';
import { validateAndSanitize, enforceOutputLength } from './guardrails';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

function parseJsonResponse(text: string): Record<string, unknown> {
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    // Try fixing common LLM JSON issues: trailing commas, unescaped newlines
    const fixed = raw
      .replace(/,\s*([}\]])/g, '$1')  // trailing commas
      .replace(/[\r\n]+/g, ' ')        // newlines in strings
      .replace(/\t/g, ' ');            // tabs
    try {
      return JSON.parse(fixed);
    } catch {
      console.error('Failed to parse JSON from Claude:', raw.slice(0, 200));
      return { error: 'JSON parse failed', raw: raw.slice(0, 500) };
    }
  }
}

export async function classifyIncident(input: {
  title: string;
  description: string;
}): Promise<{ severity: string; component: string; type: string; confidence: number }> {
  const { sanitized } = validateAndSanitize(`${input.title} ${input.description}`);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `You are an SRE triage agent for a Medusa.js e-commerce platform. Classify this incident.

Title: ${input.title}
Description: ${sanitized}

Respond with ONLY valid JSON:
{
  "severity": "critical|high|medium|low",
  "component": "payments|inventory|auth|webhooks|api|database|frontend|infrastructure",
  "type": "error|performance|security|data_integrity|availability",
  "confidence": 0.0-1.0
}`
    }],
  });

  const text = enforceOutputLength(
    response.content[0].type === 'text' ? response.content[0].text : ''
  );
  return parseJsonResponse(text) as { severity: string; component: string; type: string; confidence: number };
}

export async function analyzeCode(input: {
  incident_description: string;
  code_snippets: string[];
  git_log: string;
}): Promise<{ analysis: string; suspicious_files: string[]; root_cause_likelihood: string }> {
  const { sanitized } = validateAndSanitize(input.incident_description);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are an SRE code analyst for a Medusa.js e-commerce platform. Analyze the code for root cause.

Incident: ${sanitized}

Relevant Code Snippets:
${input.code_snippets.join('\n---\n')}

Recent Git Log:
${input.git_log}

Respond with ONLY valid JSON:
{
  "analysis": "detailed analysis of code issues",
  "suspicious_files": ["file1.ts", "file2.ts"],
  "root_cause_likelihood": "high|medium|low"
}`
    }],
  });

  const text = enforceOutputLength(
    response.content[0].type === 'text' ? response.content[0].text : ''
  );
  return parseJsonResponse(text) as { analysis: string; suspicious_files: string[]; root_cause_likelihood: string };
}

export async function analyzeLogs(input: {
  incident_description: string;
  log_entries: string[];
}): Promise<{ patterns: string[]; anomalies: string[]; correlation: string }> {
  const { sanitized } = validateAndSanitize(input.incident_description);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are an SRE log analyst for a Medusa.js e-commerce platform. Analyze these logs for anomalies related to the incident.

Incident: ${sanitized}

Log Entries:
${input.log_entries.slice(0, 100).join('\n')}

Respond with ONLY valid JSON:
{
  "patterns": ["pattern1", "pattern2"],
  "anomalies": ["anomaly1", "anomaly2"],
  "correlation": "description of how logs relate to incident"
}`
    }],
  });

  const text = enforceOutputLength(
    response.content[0].type === 'text' ? response.content[0].text : ''
  );
  return parseJsonResponse(text) as { patterns: string[]; anomalies: string[]; correlation: string };
}

export async function generateHypothesis(input: {
  triage: { severity: string; component: string; type: string };
  log_analysis: { patterns: string[]; anomalies: string[] };
  code_analysis: { analysis: string; suspicious_files: string[] };
  incident_description: string;
}): Promise<{
  hypotheses: Array<{
    rank: number;
    description: string;
    evidence: string[];
    confidence: number;
    blast_radius: string;
    suggested_fix: string;
  }>;
}> {
  const { sanitized } = validateAndSanitize(input.incident_description);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are a senior SRE synthesizing findings for a Medusa.js e-commerce platform incident.

Incident: ${sanitized}

Triage Classification:
- Severity: ${input.triage.severity}
- Component: ${input.triage.component}
- Type: ${input.triage.type}

Log Analysis:
- Patterns: ${input.log_analysis.patterns.join(', ')}
- Anomalies: ${input.log_analysis.anomalies.join(', ')}

Code Analysis:
- ${input.code_analysis.analysis}
- Suspicious files: ${input.code_analysis.suspicious_files.join(', ')}

Generate ranked hypotheses for the root cause. Respond with ONLY valid JSON:
{
  "hypotheses": [
    {
      "rank": 1,
      "description": "hypothesis description",
      "evidence": ["evidence1", "evidence2"],
      "confidence": 0.0-1.0,
      "blast_radius": "scope of impact",
      "suggested_fix": "recommended fix"
    }
  ]
}`
    }],
  });

  const text = enforceOutputLength(
    response.content[0].type === 'text' ? response.content[0].text : '',
    3000
  );
  return parseJsonResponse(text) as {
    hypotheses: Array<{
      rank: number;
      description: string;
      evidence: string[];
      confidence: number;
      blast_radius: string;
      suggested_fix: string;
    }>;
  };
}

export async function analyzeImage(imageBase64: string, mimeType: string, context: string): Promise<{
  description: string;
  error_indicators: string[];
  relevant_components: string[];
}> {
  const { sanitized } = validateAndSanitize(context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: `You are an SRE analyzing a screenshot/image related to an incident on a Medusa.js e-commerce platform.

Context: ${sanitized}

Analyze the image for error indicators, stack traces, UI issues, monitoring dashboard anomalies, etc.

Respond with ONLY valid JSON:
{
  "description": "what the image shows",
  "error_indicators": ["indicator1", "indicator2"],
  "relevant_components": ["component1", "component2"]
}`,
        },
      ],
    }],
  });

  const text = enforceOutputLength(
    response.content[0].type === 'text' ? response.content[0].text : ''
  );
  return parseJsonResponse(text) as {
    description: string;
    error_indicators: string[];
    relevant_components: string[];
  };
}
