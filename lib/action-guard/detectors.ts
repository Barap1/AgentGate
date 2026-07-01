import type { ActionGuardRequest, DetectedSignal } from "@/lib/action-guard/types";

const secretPatterns: Array<[string, string, RegExp]> = [
  ["openai_key", "OpenAI-style API key", /\bsk-(?:proj-)?[a-z0-9_-]{20,}\b/gi],
  ["aws_access_key", "AWS access key ID", /\bAKIA[0-9A-Z]{16}\b/g],
  ["key_value_secret", "API key or secret assignment", /\b(?:api[_-]?key|secret|token|password)\s*=\s*["']?[^"'\s]{12,}/gi],
  ["jwt_token", "JWT-like token", /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g],
  ["private_key", "Private key material", /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/gi],
  ["supabase_service_role", "Supabase service role key reference", /\bSUPABASE_SERVICE_ROLE_KEY\b|\bservice[_-]?role\b/gi]
];

const piiPatterns: Array<[string, string, RegExp]> = [
  ["email_address", "Email address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["phone_number", "Phone number", /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g],
  ["ssn", "SSN-like value", /\b\d{3}-\d{2}-\d{4}\b/g],
  ["credit_card", "Credit-card-like value", /\b(?:\d[ -]*?){13,19}\b/g]
];

const suspiciousTargets = [
  "attacker@example.com",
  "webhook.site",
  "requestbin",
  "pastebin.com",
  "ngrok",
  "loca.lt",
  "localtunnel",
  "trycloudflare.com"
];

const sensitiveFilePattern =
  /(?:^|[\\/])(?:\.env(?:\.[\w.-]+)?|private_key\.pem|id_rsa|secrets\.json)$|secret|credential|token|key|customer|users/i;

const privateIpPattern =
  /^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.|169\.254\.|::1$|fc00:|fd00:)/i;

function addSignal(
  signals: DetectedSignal[],
  id: string,
  label: string,
  severity: DetectedSignal["severity"],
  evidence?: string
) {
  if (signals.some((signal) => signal.id === id && signal.evidence === evidence)) {
    return;
  }

  signals.push({ id, label, severity, evidence });
}

export function redactSensitive(value: string, maxLength = 160) {
  let output = value
    .replace(/\bsk-(?:proj-)?[a-z0-9_-]{8,}\b/gi, "sk-...[redacted]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "AKIA...[redacted]")
    .replace(/\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g, "jwt...[redacted]")
    .replace(/(api[_-]?key|secret|token|password)\s*=\s*["']?[^"'\s]+/gi, "$1=[redacted]")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/gi, "[private key redacted]");

  if (output.length > maxLength) {
    output = `${output.slice(0, maxLength)}...`;
  }

  return output;
}

function scanPatterns(
  signals: DetectedSignal[],
  text: string,
  patterns: Array<[string, string, RegExp]>,
  severity: DetectedSignal["severity"]
) {
  for (const [id, label, pattern] of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);

    if (!match) {
      continue;
    }

    if (id === "credit_card") {
      const digits = match[0].replace(/\D/g, "");

      if (digits.length < 13 || digits.length > 19) {
        continue;
      }
    }

    addSignal(signals, id, label, severity, redactSensitive(match[0], 80));
  }
}

function hostnameFromTarget(target: string) {
  try {
    return new URL(target).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function detectsPrivateUrl(value: string) {
  const urlMatches = value.match(/https?:\/\/[^\s'"<>]+/gi) ?? [];

  for (const rawUrl of urlMatches) {
    const host = hostnameFromTarget(rawUrl);

    if (host && privateIpPattern.test(host)) {
      return rawUrl;
    }
  }

  const directHost = hostnameFromTarget(value);
  return directHost && privateIpPattern.test(directHost) ? value : "";
}

function detectTargetRisk(request: ActionGuardRequest, signals: DetectedSignal[]) {
  const { action } = request;
  const target = action.target.toLowerCase();
  const host = hostnameFromTarget(action.target);

  if (action.type === "send_email" && /@/.test(action.target)) {
    addSignal(signals, "external_email_target", "External email target", "medium", action.target);
  }

  if (action.type === "http_request" && /^https?:\/\//i.test(action.target)) {
    addSignal(signals, "external_url_target", "External URL target", "medium", host || action.target);
  }

  const privateUrl = detectsPrivateUrl(action.target) || detectsPrivateUrl(action.payload);

  if (privateUrl) {
    addSignal(signals, "private_network_target", "Localhost or private-network target", "critical", privateUrl);
  }

  if (suspiciousTargets.some((suspicious) => target.includes(suspicious))) {
    addSignal(signals, "suspicious_target", "Suspicious exfiltration target", "high", action.target);
  }
}

function detectFileRisk(request: ActionGuardRequest, signals: DetectedSignal[]) {
  if (request.action.type !== "file_read") {
    return;
  }

  if (sensitiveFilePattern.test(request.action.target)) {
    addSignal(signals, "sensitive_file_read", "Sensitive file read", "critical", request.action.target);
  }
}

function detectShellRisk(request: ActionGuardRequest, signals: DetectedSignal[]) {
  if (request.action.type !== "shell_command") {
    return;
  }

  const command = request.action.payload;

  if (/\brm\s+-[^\n]*r[^\n]*f|\brm\s+-[^\n]*f[^\n]*r/i.test(command)) {
    addSignal(signals, "destructive_shell", "Destructive shell command", "critical", "rm -rf");
  }

  if (/\bcat\s+.*(?:\.env|id_rsa|private_key|secrets\.json)/i.test(command)) {
    addSignal(signals, "shell_secret_read", "Shell reads sensitive file", "critical", redactSensitive(command));
  }

  if (/\b(?:curl|wget)\s+https?:\/\/[^\s]+/i.test(command)) {
    addSignal(signals, "shell_network_call", "Shell network call", "medium", redactSensitive(command));
  }

  if (detectsPrivateUrl(command)) {
    addSignal(signals, "private_network_target", "Localhost or private-network target", "critical", detectsPrivateUrl(command));
  }

  if (/\b(?:npm|pip)\s+install\s+[^\s]+/i.test(command)) {
    addSignal(signals, "package_install", "Package install command", "medium", redactSensitive(command));
  }

  if (/\bchmod\s+777\b/i.test(command)) {
    addSignal(signals, "chmod_777", "World-writable permission change", "high", "chmod 777");
  }

  if (/\bsudo\b/i.test(command)) {
    addSignal(signals, "sudo_command", "Privileged shell command", "high", "sudo");
  }
}

function detectDatabaseRisk(request: ActionGuardRequest, signals: DetectedSignal[]) {
  if (request.action.type !== "database_query") {
    return;
  }

  const sql = request.action.payload;

  if (/\bselect\s+\*\s+from\s+users\b/i.test(sql)) {
    addSignal(signals, "full_users_export", "Full users table export", "critical", "SELECT * FROM users");
  }

  if (/\b(password|token|ssn|credit_card|api_key)\b/i.test(sql)) {
    addSignal(signals, "credential_column_query", "Credential or regulated data column query", "critical", redactSensitive(sql));
  }

  if (/\b(export|copy\s*\(|download|limit\s+10000|limit\s+50000)\b/i.test(sql)) {
    addSignal(signals, "large_data_export", "Large export indicator", "high", redactSensitive(sql));
  }

  if (/\b(delete|drop|truncate)\b/i.test(sql) && !/\bwhere\b/i.test(sql)) {
    addSignal(signals, "unsafe_destructive_query", "Destructive query without narrowing context", "critical", redactSensitive(sql));
  }
}

export function detectActionSignals(request: ActionGuardRequest): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  const text = `${request.action.target}\n${request.action.payload}`;

  scanPatterns(signals, text, secretPatterns, "critical");
  scanPatterns(signals, text, piiPatterns, "medium");
  detectTargetRisk(request, signals);
  detectFileRisk(request, signals);
  detectShellRisk(request, signals);
  detectDatabaseRisk(request, signals);

  return signals;
}
