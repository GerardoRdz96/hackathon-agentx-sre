import Anthropic from '@anthropic-ai/sdk';
import { validateAndSanitize, enforceOutputLength } from './guardrails';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

function parseJsonResponse(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const fixed = raw
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\t/g, ' ');
    try {
      return JSON.parse(fixed);
    } catch {
      console.error('Failed to parse JSON from Claude:', raw.slice(0, 200));
      return { error: 'JSON parse failed', raw: raw.slice(0, 500) };
    }
  }
}

// ─── Agent 1: Triage ─────────────────────────────────────────────────────────

const TRIAGE_SYSTEM = `You are Incidex Triage Agent — an expert SRE for Medusa.js e-commerce platforms.

Your role: classify incidents by severity, component, and type with calibrated confidence.
You analyze thousands of incidents daily. You are precise, fast, and never speculate without evidence.

Severity definitions:
- critical: revenue-impacting, data loss, full service outage, security breach
- high: partial outage, significant degradation, affects many users
- medium: degraded experience, workaround exists, limited user impact
- low: cosmetic, minor inconvenience, no functional impact

Confidence calibration:
- 0.9+ = near-certain with strong signals (explicit error codes, clear component mention)
- 0.7 = probable with moderate signals (symptoms match known patterns)
- 0.5 = uncertain (vague description, could be multiple causes)
- <0.3 = insufficient data to classify reliably

If the description mentions multiple components, pick the PRIMARY affected one and note others in reasoning.`;

export async function classifyIncident(input: {
  title: string;
  description: string;
}): Promise<{ severity: string; component: string; type: string; confidence: number; reasoning: string }> {
  const { sanitized } = validateAndSanitize(`${input.title} ${input.description}`);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: TRIAGE_SYSTEM,
    messages: [{
      role: 'user',
      content: `Classify this incident. Respond with ONLY valid JSON.

Title: ${input.title}
Description: ${sanitized}

{
  "severity": "critical|high|medium|low",
  "component": "payments|inventory|auth|webhooks|api|database|frontend|infrastructure",
  "type": "error|performance|security|data_integrity|availability",
  "confidence": 0.0-1.0,
  "reasoning": "1-2 sentence explanation of WHY this classification"
}`
    }],
  });

  const text = enforceOutputLength(
    response.content[0].type === 'text' ? response.content[0].text : ''
  );
  return parseJsonResponse(text) as { severity: string; component: string; type: string; confidence: number; reasoning: string };
}

// ─── Agent 2: Code Analyst ───────────────────────────────────────────────────

const CODE_ANALYST_SYSTEM = `You are Incidex Code Analyst — an expert at reading Medusa.js TypeScript source code.

You identify root causes by correlating incidents with:
- Recent code changes (check git log timestamps against incident start time)
- Unsafe patterns: empty catch blocks, 'as any' casts, missing null checks, hardcoded values, process.exit calls, silent error swallowing
- Architectural vulnerabilities: race conditions, missing idempotency, connection pool misconfiguration, missing validation
- Medusa.js specific: workflow execution without error handling, subscriber event routing, payment webhook processing

Always provide specific file paths and line references when possible.
If no suspicious code is found, say so explicitly — do not fabricate concerns.`;

export async function analyzeCode(input: {
  incident_description: string;
  code_snippets: string[];
  git_log: string;
}): Promise<{ analysis: string; suspicious_files: string[]; root_cause_likelihood: string }> {
  const { sanitized } = validateAndSanitize(input.incident_description);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: CODE_ANALYST_SYSTEM,
    messages: [{
      role: 'user',
      content: `Analyze this code for root cause. Respond with ONLY valid JSON.

Incident: ${sanitized}

Relevant Code Snippets:
${input.code_snippets.join('\n---\n')}

Recent Git Log:
${input.git_log}

{
  "analysis": "detailed analysis of code issues found",
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

// ─── Agent 3: Log Analyst ────────────────────────────────────────────────────

const LOG_ANALYST_SYSTEM = `You are Incidex Log Analyst — an expert at reading Medusa.js e-commerce service logs.

You specialize in detecting these e-commerce operational patterns:
- Stripe/payment webhook timeouts and signature validation failures
- Database connection pool exhaustion and query timeouts
- Inventory sync failures and stock discrepancies
- Auth token expiration and JWT validation errors
- API rate limiting triggers and 429 responses
- Cart abandonment spikes and checkout flow interruptions
- Order processing delays and fulfillment queue backlogs
- Cache invalidation failures and stale data serving

When analyzing logs, prioritize:
1. Temporal correlation: errors that started at or near the incident time
2. Error rate spikes: sudden increase in ERROR/WARN entries
3. Service dependency failures: cascading errors across services
4. Resource exhaustion: connection pools, memory, disk, queue depth`;

export async function analyzeLogs(input: {
  incident_description: string;
  log_entries: string[];
}): Promise<{ patterns: string[]; anomalies: string[]; correlation: string }> {
  const { sanitized } = validateAndSanitize(input.incident_description);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: LOG_ANALYST_SYSTEM,
    messages: [{
      role: 'user',
      content: `Analyze these logs for anomalies related to the incident. Respond with ONLY valid JSON.

Incident: ${sanitized}

Log Entries:
${input.log_entries.slice(0, 100).join('\n')}

{
  "patterns": ["pattern1 with frequency and time range", "pattern2"],
  "anomalies": ["anomaly1 with severity assessment", "anomaly2"],
  "correlation": "how these log patterns relate to the reported incident"
}`
    }],
  });

  const text = enforceOutputLength(
    response.content[0].type === 'text' ? response.content[0].text : ''
  );
  return parseJsonResponse(text) as { patterns: string[]; anomalies: string[]; correlation: string };
}

// ─── Agent 4: Hypothesis Engine ──────────────────────────────────────────────

const HYPOTHESIS_SYSTEM = `You are Incidex Hypothesis Engine — a senior SRE who synthesizes evidence from multiple sources into actionable root cause hypotheses.

You receive triage classification, log analysis, and code analysis as input. Your job:
1. Weigh evidence quality: high-correlation log patterns + recent code changes = high confidence
2. Cross-reference: do logs and code point to the same root cause?
3. Assess blast radius: who/what is affected and how severely?
4. Suggest specific fixes: not vague advice, but concrete actions (rollback commit X, add timeout to Y, fix null check in Z)

Confidence calibration:
- 0.9+ = multiple corroborating sources agree on root cause
- 0.7 = strong single source with consistent evidence
- 0.5 = plausible but unverified — needs human investigation
- <0.3 = speculative, insufficient evidence

If evidence is insufficient, say so clearly rather than speculating. Never fabricate evidence.
Generate exactly 2-3 hypotheses, ranked by confidence.`;

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
    max_tokens: 4096,
    system: HYPOTHESIS_SYSTEM,
    messages: [{
      role: 'user',
      content: `Synthesize these findings into ranked root cause hypotheses. Respond with ONLY the JSON object, no markdown, no code blocks.

Incident: ${sanitized}

Triage: severity=${input.triage.severity}, component=${input.triage.component}, type=${input.triage.type}

Log Analysis:
- Patterns: ${input.log_analysis.patterns.join('; ')}
- Anomalies: ${input.log_analysis.anomalies.join('; ')}

Code Analysis:
- ${input.code_analysis.analysis}
- Suspicious files: ${input.code_analysis.suspicious_files.join(', ')}

{"hypotheses":[{"rank":1,"description":"concise hypothesis","evidence":["evidence1","evidence2"],"confidence":0.85,"blast_radius":"scope of impact","suggested_fix":"specific remediation action"}]}`
    }],
  });

  const text = enforceOutputLength(
    response.content[0].type === 'text' ? response.content[0].text : '',
    8000
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

// ─── Vision: Image Analysis ──────────────────────────────────────────────────

const IMAGE_ANALYST_SYSTEM = `You are Incidex Image Analyst — an SRE who reads screenshots, monitoring dashboards, and error pages.

You extract: error codes, stack traces, UI rendering issues, metric anomalies (spikes, drops, plateaus), dashboard alerts, and any text visible in the image that relates to the incident.
Be specific about what you see — mention exact error messages, status codes, graph patterns.`;

export async function analyzeImage(imageBase64: string, mimeType: string, context: string): Promise<{
  description: string;
  error_indicators: string[];
  relevant_components: string[];
}> {
  const { sanitized } = validateAndSanitize(context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: IMAGE_ANALYST_SYSTEM,
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
          text: `Context: ${sanitized}

Analyze this image for error indicators. Respond with ONLY valid JSON:
{
  "description": "what the image shows",
  "error_indicators": ["specific indicator 1", "specific indicator 2"],
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
