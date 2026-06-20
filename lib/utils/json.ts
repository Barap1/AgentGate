import type { GuardrailModelResult } from "@/lib/guardrail/types";

const allowedCategories = new Set([
  "instruction_override",
  "system_prompt_extraction",
  "data_exfiltration",
  "tool_abuse",
  "credential_theft",
  "hidden_instruction",
  "role_impersonation",
  "benign_reference",
  "other"
]);

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Guardrail response was not a JSON object.");
  }

  return value as Record<string, unknown>;
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error("Guardrail response confidence must be a number.");
  }

  return Math.max(0, Math.min(1, value));
}

export function parseGuardrailJson(rawText: string): GuardrailModelResult {
  const trimmed = rawText.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Guardrail model did not return strict JSON.");
  }

  const object = asObject(parsed);

  if (typeof object.containsInjection !== "boolean") {
    throw new Error("Guardrail response containsInjection must be boolean.");
  }

  if (
    object.injectedPrompt !== null &&
    typeof object.injectedPrompt !== "string"
  ) {
    throw new Error("Guardrail response injectedPrompt must be string or null.");
  }

  if (typeof object.reason !== "string") {
    throw new Error("Guardrail response reason must be a string.");
  }

  if (!Array.isArray(object.categories)) {
    throw new Error("Guardrail response categories must be an array.");
  }

  const categories = object.categories
    .filter((category): category is string => typeof category === "string")
    .map((category) =>
      allowedCategories.has(category) ? category : "other"
    );

  return {
    containsInjection: object.containsInjection,
    injectedPrompt:
      typeof object.injectedPrompt === "string" &&
      object.injectedPrompt.trim().length > 0
        ? object.injectedPrompt
        : null,
    confidence: clampConfidence(object.confidence),
    reason: object.reason,
    categories: [...new Set(categories)]
  };
}
