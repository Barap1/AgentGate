import type {
  SanitizeRequest,
  SanitizeResult,
  Verdict
} from "@/lib/guardrail/types";
import { fuzzyRemove } from "@/lib/guardrail/fuzzyRemove";
import { buildGuardrailSystemPrompt } from "@/lib/guardrail/prompts";
import { getGuardrailProvider } from "@/lib/guardrail/providers";
import {
  calculateRiskScore,
  riskLevelFromScore,
  verdictFromRisk
} from "@/lib/guardrail/risk";

function getMaxOutputTokens() {
  const rawValue = process.env.MAX_OUTPUT_TOKENS;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : 512;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 512;
}

const blockedSanitizationFailedMessage =
  "[BLOCKED: prompt injection detected and safe sanitization failed]";

const blockedSanitizationWarning =
  "Injection was detected, but the exact injected span could not be safely removed. Content was blocked instead of passed to the agent.";

const highRiskBlockCategories = new Set([
  "data_exfiltration",
  "credential_theft",
  "system_prompt_extraction",
  "tool_abuse"
]);

function shouldBlockFailedRemoval({
  containsInjection,
  removed,
  riskLevel,
  verdict,
  categories
}: {
  containsInjection: boolean;
  removed: boolean;
  riskLevel: string;
  verdict: Verdict;
  categories: string[];
}) {
  if (!containsInjection || removed) {
    return false;
  }

  if (riskLevel === "critical" || verdict === "BLOCK") {
    return true;
  }

  return (
    riskLevel === "high" &&
    categories.some((category) => highRiskBlockCategories.has(category))
  );
}

export async function sanitizeContent(
  request: SanitizeRequest
): Promise<SanitizeResult> {
  const promptStrategy = request.promptStrategy ?? "definition_enhanced";
  const provider = getGuardrailProvider();
  const {
    result: modelResult,
    modelUsed,
    provider: providerName
  } = await provider.check({
    systemPrompt: buildGuardrailSystemPrompt(promptStrategy),
    userTask: request.userTask,
    sourceType: request.sourceType,
    content: request.content,
    maxOutputTokens: getMaxOutputTokens()
  });
  const removal = fuzzyRemove(request.content, modelResult.injectedPrompt);
  const riskScore = calculateRiskScore(modelResult);
  const riskLevel = riskLevelFromScore(riskScore);
  const baseVerdict = verdictFromRisk({
    containsInjection: modelResult.containsInjection,
    riskScore,
    removed: removal.removed
  });
  const blockFailedRemoval = shouldBlockFailedRemoval({
    containsInjection: modelResult.containsInjection,
    removed: removal.removed,
    riskLevel,
    verdict: baseVerdict,
    categories: modelResult.categories
  });
  const verdict: Verdict = blockFailedRemoval ? "BLOCK" : baseVerdict;

  const warnings = [
    ...(removal.warning ? [removal.warning] : []),
    ...(blockFailedRemoval ? [blockedSanitizationWarning] : []),
    ...(!modelResult.containsInjection && modelResult.injectedPrompt
      ? ["Model returned an extracted prompt while containsInjection was false."]
      : []),
    ...(modelResult.containsInjection && !modelResult.injectedPrompt
      ? ["Model detected injection but did not return an extracted prompt."]
      : [])
  ];

  return {
    containsInjection: modelResult.containsInjection,
    verdict,
    riskLevel,
    riskScore,
    sourceType: request.sourceType,
    userTask: request.userTask,
    originalContent: request.content,
    extractedInjection: modelResult.injectedPrompt,
    sanitizedContent: blockFailedRemoval
      ? blockedSanitizationFailedMessage
      : removal.sanitized,
    removed: removal.removed,
    provider: providerName,
    modelUsed,
    promptStrategy,
    reason: modelResult.reason,
    categories: modelResult.categories,
    warnings
  };
}
