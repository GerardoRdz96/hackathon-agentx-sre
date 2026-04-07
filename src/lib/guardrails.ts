const CANARY_STRINGS = [
  'ignore previous instructions',
  'ignore all instructions',
  'disregard your instructions',
  'forget your instructions',
  'system prompt',
  'you are now',
  'act as',
  'pretend you are',
  'override your',
  'reveal your prompt',
];

const PROMPT_INJECTION_PATTERNS = [
  /\{\{.*\}\}/g,
  /<\|.*\|>/g,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<<\/SYS>>/gi,
];

export function detectCanaryStrings(input: string): { safe: boolean; detected: string[] } {
  const lower = input.toLowerCase();
  const detected = CANARY_STRINGS.filter(canary => lower.includes(canary));
  return { safe: detected.length === 0, detected };
}

export function sanitizeInput(input: string): string {
  // Strip HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  // Strip script content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  // Remove prompt injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }
  return sanitized.trim();
}

export function validateMaxLength(input: string, maxLength: number = 10000): { valid: boolean; length: number } {
  return { valid: input.length <= maxLength, length: input.length };
}

export function enforceOutputLength(output: string, maxLength: number = 5000): string {
  if (output.length <= maxLength) return output;
  return output.slice(0, maxLength) + '... [TRUNCATED]';
}

export function validateAndSanitize(input: string): { sanitized: string; warnings: string[] } {
  const warnings: string[] = [];

  const canaryCheck = detectCanaryStrings(input);
  if (!canaryCheck.safe) {
    warnings.push(`Potential prompt injection detected: ${canaryCheck.detected.join(', ')}`);
  }

  const lengthCheck = validateMaxLength(input);
  if (!lengthCheck.valid) {
    warnings.push(`Input exceeds max length (${lengthCheck.length}/10000)`);
  }

  const sanitized = sanitizeInput(input);
  if (sanitized !== input.trim()) {
    warnings.push('Input was sanitized (HTML/script tags or injection patterns removed)');
  }

  return { sanitized: sanitized.slice(0, 10000), warnings };
}
