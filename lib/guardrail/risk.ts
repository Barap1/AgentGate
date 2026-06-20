import type {
  GuardrailModelResult,
  RiskLevel,
  Verdict
} from "@/lib/guardrail/types";

const categoryScores: Record<string, number> = {
  instruction_override: 20,
  system_prompt_extraction: 25,
  data_exfiltration: 30,
  credential_theft: 30,
  tool_abuse: 25,
  hidden_instruction: 15,
  role_impersonation: 20
};

export function calculateRiskScore(result: GuardrailModelResult) {
  let score = 0;

  if (result.containsInjection) {
    score += 40;
  }

  for (const category of result.categories) {
    score += categoryScores[category] ?? 0;
  }

  if (result.confidence > 0.9) {
    score += 10;
  }

  return Math.min(score, 100);
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 24) {
    return "low";
  }

  if (score <= 49) {
    return "medium";
  }

  if (score <= 79) {
    return "high";
  }

  return "critical";
}

export function verdictFromRisk({
  containsInjection,
  riskScore,
  removed
}: {
  containsInjection: boolean;
  riskScore: number;
  removed: boolean;
}): Verdict {
  if (!containsInjection && riskScore < 25) {
    return "ALLOW";
  }

  if (containsInjection && riskScore < 80) {
    return "SANITIZE";
  }

  if (riskScore >= 80) {
    return removed ? "SANITIZE" : "BLOCK";
  }

  return "SANITIZE";
}
