import type {
  PromptStrategy,
  SanitizeRequest,
  SourceType
} from "@/lib/guardrail/types";

export class ValidationError extends Error {
  status = 400;
}

const sourceTypes = new Set<SourceType>([
  "support_ticket",
  "email",
  "slack_message",
  "webpage",
  "document",
  "tool_output",
  "manual_test"
]);

const promptStrategies = new Set<PromptStrategy>([
  "basic",
  "definition_enhanced",
  "strict_extraction"
]);

function getMaxInputChars() {
  const rawValue = process.env.MAX_INPUT_CHARS;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : 20000;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20000;
}

function requireString(
  value: unknown,
  field: string,
  maxLength: number
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required.`);
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be ${maxLength} characters or fewer.`);
  }

  return value;
}

export function validateSanitizeRequest(body: unknown): SanitizeRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const input = body as Record<string, unknown>;
  const userTask = requireString(input.userTask, "userTask", 2000);
  const content = requireString(input.content, "content", getMaxInputChars());
  const sourceType =
    typeof input.sourceType === "string" && sourceTypes.has(input.sourceType as SourceType)
      ? (input.sourceType as SourceType)
      : "manual_test";
  const promptStrategy =
    typeof input.promptStrategy === "string" &&
    promptStrategies.has(input.promptStrategy as PromptStrategy)
      ? (input.promptStrategy as PromptStrategy)
      : "definition_enhanced";

  return {
    userTask,
    sourceType,
    content,
    promptStrategy
  };
}
