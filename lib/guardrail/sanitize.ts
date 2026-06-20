import type { SanitizeRequest, SanitizeResult } from "@/lib/guardrail/types";
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
  const verdict = verdictFromRisk({
    containsInjection: modelResult.containsInjection,
    riskScore,
    removed: removal.removed
  });

  const warnings = [
    ...(removal.warning ? [removal.warning] : []),
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
    sanitizedContent: removal.sanitized,
    removed: removal.removed,
    provider: providerName,
    modelUsed,
    promptStrategy,
    reason: modelResult.reason,
    categories: modelResult.categories,
    warnings
  };
}
