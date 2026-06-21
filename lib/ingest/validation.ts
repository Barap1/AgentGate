import type { SourceType } from "@/lib/guardrail/types";
import {
  getMaxInputChars,
  requiredString,
  sourceTypes,
  ValidationError
} from "@/lib/utils/validation";

export const DEFAULT_INGEST_USER_TASK =
  "Process this untrusted content according to the agent's task.";

export { requiredString };

export function requireJsonObject(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return body as Record<string, unknown>;
}

export function optionalString(
  value: unknown,
  field: string,
  maxLength: number
) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be ${maxLength} characters or fewer.`);
  }

  return value;
}

export function optionalUserTask(value: unknown) {
  return (
    optionalString(value, "userTask", 2000)?.trim() || DEFAULT_INGEST_USER_TASK
  );
}

export function optionalSourceType(
  value: unknown,
  defaultSourceType: SourceType
) {
  if (value === undefined || value === null || value === "") {
    return defaultSourceType;
  }

  if (typeof value !== "string" || !sourceTypes.has(value as SourceType)) {
    throw new ValidationError("sourceType is invalid.");
  }

  return value as SourceType;
}

export function requiredContent(value: unknown) {
  return requiredString(value, "content", getMaxInputChars());
}
