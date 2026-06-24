// Ingress / Egress Guardrails Validator for ARIA Architect Pipeline

export interface GuardrailResult {
  passed: boolean;
  reason?: string;
  sanitizedContent?: string;
}

// 1. Input Guardrails
export function validateInput(text: string): GuardrailResult {
  if (!text) {
    return { passed: false, reason: 'Problem statement is empty.' };
  }

  // Check input length (Very long input block)
  if (text.length > 8000) {
    return { passed: false, reason: 'Input exceeds maximum safety limit of 8,000 characters.' };
  }

  // Detect potential API keys, passwords, bearer tokens, private keys
  const secretsRegexes = [
    /AIzaSy[a-zA-Z0-9_\-]{33}/, // Google API Key
    /ghp_[a-zA-Z0-9]{36}/, // GitHub personal access token
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private key
    /ey[a-zA-Z0-9_\-]{10,}\.ey[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/, // JWT
    /(?:password|passwd|secret|private_key|token|bearer)\s*[:=]\s*['"a-zA-Z0-9_\-\.\/]{8,}/i, // Simple KV secrets
  ];

  for (const regex of secretsRegexes) {
    if (regex.test(text)) {
      return { passed: false, reason: 'Unsafe input: contains patterns resembling private keys, passwords, API keys, or security tokens.' };
    }
  }

  // Sensitive personal data patterns (SSN, credit card, emails, phone numbers)
  const personalDataRegexes = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN US
    /\b(?:\d[ -]*?){13,16}\b/, // Basic credit card
    // Note: Simple emails/phones can sometimes appear in realistic business problems, but let's guard against high density or block explicit personal data leakage
  ];

  for (const regex of personalDataRegexes) {
    if (regex.test(text)) {
      return { passed: false, reason: 'Unsafe input: contains sensitive personal identifiers (like SSNs or credit card patterns).' };
    }
  }

  // Prompt Injection Phrases
  const injectionPhrases = [
    /ignore previous instructions/i,
    /system prompt/i,
    /you are now a/i,
    /bypass guardrails/i,
    /disregard rules/i,
    /jailbreak/i,
  ];

  for (const phrase of injectionPhrases) {
    if (phrase.test(text)) {
      return { passed: false, reason: 'Security check failed: potential prompt injection phrase detected.' };
    }
  }

  // Unsupported or unsafe requests (Illegal activities, self-harm, unsupported medical advice, weapons, hate speech)
  const unsafeCategories = [
    /make a bomb/i,
    /hack into/i,
    /how to steal/i,
    /kill myself/i,
    /suicide/i,
    /diagnose my/i, // medical advice check
    /medical treatment for/i,
  ];

  for (const category of unsafeCategories) {
    if (category.test(text)) {
      return { passed: false, reason: 'Unsafe category: request involves topics that are restricted or require professional medical/legal consultation.' };
    }
  }

  return { passed: true };
}

// 2. Output & Tool Guardrails
export function validateOutput(text: string): GuardrailResult {
  if (!text) {
    return { passed: true };
  }

  // No sensitive data leakage in outputs
  const leakageRegexes = [
    /AIzaSy[a-zA-Z0-9_\-]{33}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /ghp_[a-zA-Z0-9]{36}/,
  ];

  for (const regex of leakageRegexes) {
    if (regex.test(text)) {
      return { passed: false, reason: 'Security alert: generated output contained potential sensitive developer secrets.' };
    }
  }

  // Check for medical advice or harmful patterns
  if (/diagnose/i.test(text) && /medical/i.test(text)) {
    return { passed: false, reason: 'Output check failed: unsupported medical advice detected.' };
  }

  // Remove any obvious internal prompt keywords or instructions if leaked
  let sanitized = text;
  const internalMarkings = [
    /\[System Instructions:.*\]/gi,
    /\[Hidden rules:.*\]/gi,
  ];

  for (const pattern of internalMarkings) {
    sanitized = sanitized.replace(pattern, '');
  }

  return { passed: true, sanitizedContent: sanitized };
}
