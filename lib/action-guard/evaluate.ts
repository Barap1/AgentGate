import { detectActionSignals } from "@/lib/action-guard/detectors";
import { riskLevelFromScore, scoreActionRisk } from "@/lib/action-guard/policies";
import type {
  ActionDecision,
  ActionGuardRequest,
  ActionGuardResult
} from "@/lib/action-guard/types";

function decisionFromScore(score: number, hardBlock: boolean): ActionDecision {
  if (hardBlock || score >= 80) {
    return "BLOCK";
  }

  if (score >= 25) {
    return "REVIEW";
  }

  return "ALLOW";
}

function safeAlternative(request: ActionGuardRequest, decision: ActionDecision) {
  if (decision === "ALLOW") {
    return "Proceed with the action.";
  }

  switch (request.action.type) {
    case "send_email":
      return "Draft the email for a human to review, without secrets or sensitive customer data.";
    case "http_request":
      return "Send only a minimal, redacted payload to an allowlisted HTTPS endpoint.";
    case "file_read":
      return "Read a non-sensitive project file or ask a human to approve access.";
    case "database_query":
      return "Query aggregated, non-sensitive fields with a narrow WHERE clause and LIMIT.";
    case "shell_command":
      return "Run a read-only command that does not access secrets, install packages, or call unknown networks.";
  }
}

function reasonForDecision(decision: ActionDecision, labels: string[]) {
  if (decision === "ALLOW") {
    return ["No risky action signals matched deterministic policy rules."];
  }

  if (labels.length > 0) {
    return labels;
  }

  return ["The action needs review because its target or payload increases risk."];
}

export function evaluateActionGuard(
  request: ActionGuardRequest
): ActionGuardResult {
  const signals = detectActionSignals(request);
  const { riskScore, policies } = scoreActionRisk(request, signals);
  const hardBlock = policies.some((policy) => policy.hardBlock);
  const decision = decisionFromScore(riskScore, hardBlock);
  const policyLabels = policies.map((policy) => policy.label);

  return {
    decision,
    riskLevel: riskLevelFromScore(riskScore),
    riskScore,
    agentId: request.agentId,
    sessionId: request.sessionId,
    actionType: request.action.type,
    toolName: request.action.toolName,
    target: request.action.target,
    reasons: reasonForDecision(decision, policyLabels),
    matchedPolicies: policyLabels,
    detectedSignals: signals.map((signal) =>
      signal.evidence
        ? `${signal.label} (${signal.severity}): ${signal.evidence}`
        : `${signal.label} (${signal.severity})`
    ),
    safeAlternative: safeAlternative(request, decision),
    requiresHumanApproval: decision === "REVIEW",
    warnings: [],
    actionDecisionId: null,
    persisted: false
  };
}
