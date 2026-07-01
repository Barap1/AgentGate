import { randomUUID } from "node:crypto";
import type {
  ActionGuardRequest,
  ActionType,
  AgentAction
} from "@/lib/action-guard/types";
import type { RiskLevel, SourceType, Verdict } from "@/lib/guardrail/types";
import {
  getMaxInputChars,
  requiredString,
  sourceTypes,
  ValidationError
} from "@/lib/utils/validation";

const actionTypes = new Set<ActionType>([
  "send_email",
  "http_request",
  "file_read",
  "database_query",
  "shell_command"
]);

const verdicts = new Set<Verdict>(["ALLOW", "SANITIZE", "BLOCK", "ERROR"]);
const riskLevels = new Set<RiskLevel>(["low", "medium", "high", "critical"]);

function optionalEnum<T extends string>(
  value: unknown,
  allowed: Set<T>,
  field: string
): T | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" && allowed.has(value as T)) {
    return value as T;
  }

  throw new ValidationError(`${field} is invalid.`);
}

function optionalObject(value: unknown, field: string): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${field} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function optionalString(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be ${maxLength} characters or fewer.`);
  }

  return value;
}

function sourceTypeOrDefault(value: unknown): SourceType {
  if (value === null || value === undefined || value === "") {
    return "manual_test";
  }

  if (typeof value === "string" && sourceTypes.has(value as SourceType)) {
    return value as SourceType;
  }

  throw new ValidationError("sourceType is invalid.");
}

function validateAction(value: unknown): AgentAction {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("action must be a JSON object.");
  }

  const input = value as Record<string, unknown>;
  const type =
    typeof input.type === "string" && actionTypes.has(input.type as ActionType)
      ? (input.type as ActionType)
      : null;

  if (!type) {
    throw new ValidationError("action.type is invalid.");
  }

  return {
    type,
    toolName: requiredString(input.toolName, "action.toolName", 120),
    target: requiredString(input.target, "action.target", 2000),
    payload: optionalString(input.payload, "action.payload", getMaxInputChars()),
    metadata: optionalObject(input.metadata, "action.metadata")
  };
}

export function validateActionGuardRequest(body: unknown): ActionGuardRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const input = body as Record<string, unknown>;
  const rawSessionId = optionalString(input.sessionId, "sessionId", 120).trim();

  return {
    agentId: requiredString(input.agentId, "agentId", 120),
    sessionId: rawSessionId || `session-${randomUUID()}`,
    trustedTask: requiredString(input.trustedTask, "trustedTask", 2000),
    sourceType: sourceTypeOrDefault(input.sourceType),
    priorInputVerdict: optionalEnum(input.priorInputVerdict, verdicts, "priorInputVerdict"),
    priorInputRiskLevel: optionalEnum(
      input.priorInputRiskLevel,
      riskLevels,
      "priorInputRiskLevel"
    ),
    action: validateAction(input.action)
  };
}
