import type {
  ActionGuardRequest,
  ActionPolicyMatch,
  DetectedSignal
} from "@/lib/action-guard/types";

const severityScore = {
  low: 8,
  medium: 22,
  high: 42,
  critical: 75
};

export function riskLevelFromScore(score: number) {
  if (score >= 80) {
    return "critical";
  }

  if (score >= 50) {
    return "high";
  }

  if (score >= 25) {
    return "medium";
  }

  return "low";
}

function hasSignal(signals: DetectedSignal[], ids: string[]) {
  return signals.some((signal) => ids.includes(signal.id));
}

function reachesExternalTarget(signals: DetectedSignal[]) {
  return hasSignal(signals, [
    "external_email_target",
    "external_url_target",
    "suspicious_target",
    "shell_network_call"
  ]);
}

function hasSensitivePayload(signals: DetectedSignal[]) {
  return signals.some((signal) =>
    [
      "openai_key",
      "aws_access_key",
      "key_value_secret",
      "jwt_token",
      "private_key",
      "supabase_service_role",
      "email_address",
      "phone_number",
      "ssn",
      "credit_card"
    ].includes(signal.id)
  );
}

export function scoreActionRisk(
  request: ActionGuardRequest,
  signals: DetectedSignal[]
) {
  let score = signals.reduce(
    (sum, signal) => sum + severityScore[signal.severity],
    0
  );
  const policies: ActionPolicyMatch[] = [];
  const external = reachesExternalTarget(signals);
  const sensitive = hasSensitivePayload(signals);

  if (request.priorInputRiskLevel === "high") {
    score += 15;
    policies.push({ id: "prior_high_risk", label: "Prior input was high risk" });
  }

  if (request.priorInputRiskLevel === "critical") {
    score += 25;
    policies.push({ id: "prior_critical_risk", label: "Prior input was critical risk" });
  }

  if (request.priorInputVerdict === "BLOCK") {
    score += 45;
    policies.push({ id: "prior_input_blocked", label: "Prior input was blocked" });
  }

  if (
    external &&
    hasSignal(signals, [
      "openai_key",
      "aws_access_key",
      "key_value_secret",
      "jwt_token",
      "private_key",
      "supabase_service_role"
    ])
  ) {
    policies.push({
      id: "secret_exfiltration",
      label: "Secret-like data sent to an external target",
      hardBlock: true
    });
  }

  if (hasSignal(signals, ["private_network_target"])) {
    policies.push({
      id: "private_network_request",
      label: "Action reaches localhost or a private network",
      hardBlock: true
    });
  }

  if (hasSignal(signals, ["sensitive_file_read", "shell_secret_read"])) {
    policies.push({
      id: "sensitive_file_access",
      label: "Action reads environment, key, secret, or customer files",
      hardBlock: true
    });
  }

  if (hasSignal(signals, ["destructive_shell"])) {
    policies.push({
      id: "destructive_shell_command",
      label: "Shell command can delete files recursively",
      hardBlock: true
    });
  }

  if (hasSignal(signals, ["full_users_export", "credential_column_query"])) {
    policies.push({
      id: "database_credential_export",
      label: "Database query can export users or credential fields",
      hardBlock: true
    });
  }

  if (hasSignal(signals, ["unsafe_destructive_query"])) {
    policies.push({
      id: "unsafe_destructive_database_query",
      label: "Database query can destructively modify data without narrowing context",
      hardBlock: true
    });
  }

  if (request.priorInputVerdict === "BLOCK" && external) {
    policies.push({
      id: "blocked_input_external_action",
      label: "Blocked input attempted to trigger an external action",
      hardBlock: true
    });
  }

  if (external && sensitive) {
    policies.push({
      id: "sensitive_external_action",
      label: "Sensitive data is being sent outside the system",
      hardBlock: hasSignal(signals, ["suspicious_target"])
    });
  }

  if (external && !sensitive) {
    score += 18;
    policies.push({
      id: "unknown_external_target",
      label: "External target needs review unless explicitly trusted"
    });
  }

  const hardBlock = policies.some((policy) => policy.hardBlock);

  return {
    riskScore: Math.min(100, hardBlock ? Math.max(score, 80) : score),
    policies
  };
}
