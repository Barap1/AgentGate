import "server-only";

import type {
  RiskLevel,
  SanitizeResult,
  SourceType,
  Verdict
} from "@/lib/guardrail/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type RunHistoryErrorCode =
  | "SUPABASE_NOT_CONFIGURED"
  | "RUN_HISTORY_SCHEMA_MISSING"
  | "RUN_HISTORY_UNAVAILABLE";

export class RunHistoryError extends Error {
  code: RunHistoryErrorCode;
  status: number;

  constructor(message: string, code: RunHistoryErrorCode, status = 503) {
    super(message);
    this.name = "RunHistoryError";
    this.code = code;
    this.status = status;
  }
}

export type GuardrailRunSummary = {
  id: string;
  createdAt: string;
  sourceType: SourceType;
  userTask: string;
  containsInjection: boolean;
  removed: boolean;
  verdict: Verdict;
  riskLevel: RiskLevel;
  riskScore: number;
  provider: string | null;
  modelUsed: string | null;
  promptStrategy: string;
  categories: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
};

export type GuardrailRunFinding = {
  id: string;
  category: string;
  severity: RiskLevel;
  evidence: string | null;
  explanation: string | null;
};

export type GuardrailRunDetail = GuardrailRunSummary & {
  originalContent: string;
  sanitizedContent: string;
  extractedInjection: string | null;
  reason: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  findings: GuardrailRunFinding[];
};

type GuardrailRunRow = {
  id: string;
  user_id: string;
  created_at: string;
  source_type: SourceType;
  user_task: string;
  original_content: string;
  sanitized_content: string;
  extracted_injection: string | null;
  contains_injection: boolean;
  removed: boolean;
  verdict: Verdict;
  risk_level: RiskLevel;
  risk_score: number;
  provider: string | null;
  model_used: string | null;
  prompt_strategy: string;
  reason: string | null;
  categories: string[] | null;
  warnings: string[] | null;
  request_id: string | null;
  metadata: Record<string, unknown> | null;
};

type GuardrailFindingRow = {
  id: string;
  category: string;
  severity: RiskLevel;
  evidence: string | null;
  explanation: string | null;
};

const schemaMissingMessage =
  "Run history is not initialized. Apply `supabase/schema.sql` to your Supabase project, then retry.";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "Run history is unavailable.";
    }
  }

  return String(error);
}

export function normalizeRunHistoryError(error: unknown): RunHistoryError {
  if (error instanceof RunHistoryError) {
    return error;
  }

  const message = toErrorMessage(error);
  const diagnosticText =
    error && typeof error === "object" ? `${message} ${toErrorMessage(error)}` : message;
  const lowerMessage = diagnosticText.toLowerCase();

  if (
    lowerMessage.includes("supabase persistence is not configured") ||
    lowerMessage.includes("next_public_supabase_url") ||
    lowerMessage.includes("supabase_service_role_key")
  ) {
    return new RunHistoryError(
      "Supabase persistence is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to `.env.local`.",
      "SUPABASE_NOT_CONFIGURED"
    );
  }

  if (
    (lowerMessage.includes("guardrail_runs") ||
      lowerMessage.includes("guardrail_findings")) &&
    (lowerMessage.includes("schema cache") ||
      lowerMessage.includes("does not exist") ||
      lowerMessage.includes("could not find the table"))
  ) {
    return new RunHistoryError(
      schemaMissingMessage,
      "RUN_HISTORY_SCHEMA_MISSING"
    );
  }

  return new RunHistoryError(
    message || "Run history is unavailable.",
    "RUN_HISTORY_UNAVAILABLE"
  );
}

function getRunHistoryClient() {
  try {
    return getSupabaseAdmin();
  } catch (error) {
    throw normalizeRunHistoryError(error);
  }
}

function toSummary(row: GuardrailRunRow): GuardrailRunSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    sourceType: row.source_type,
    userTask: row.user_task,
    containsInjection: row.contains_injection,
    removed: row.removed,
    verdict: row.verdict,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    provider: row.provider,
    modelUsed: row.model_used,
    promptStrategy: row.prompt_strategy,
    categories: row.categories ?? [],
    warnings: row.warnings ?? [],
    metadata: row.metadata ?? {}
  };
}

function compactMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  );
}

export async function saveGuardrailRun(
  result: SanitizeResult,
  metadata: Record<string, unknown> = {},
  userId?: string
): Promise<string> {
  const supabase = getRunHistoryClient();
  const { data, error } = await supabase
    .from("guardrail_runs")
    .insert({
      user_id: userId,
      source_type: result.sourceType,
      user_task: result.userTask,
      original_content: result.originalContent,
      sanitized_content: result.sanitizedContent,
      extracted_injection: result.extractedInjection,
      contains_injection: result.containsInjection,
      removed: result.removed,
      verdict: result.verdict,
      risk_level: result.riskLevel,
      risk_score: result.riskScore,
      provider: result.provider,
      model_used: result.modelUsed,
      prompt_strategy: result.promptStrategy,
      reason: result.reason,
      categories: result.categories,
      warnings: result.warnings,
      metadata: compactMetadata({
        phase: "phase_4",
        ingestion_method: "direct_api",
        persisted_by: "guardrail_pipeline",
        ...metadata
      })
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeRunHistoryError(error);
  }

  const runId = data.id as string;

  if (result.categories.length > 0) {
    const findings = result.categories.map((category) => ({
      run_id: runId,
      category,
      severity: result.riskLevel,
      evidence: result.extractedInjection,
      explanation: result.reason
    }));
    const { error: findingsError } = await supabase
      .from("guardrail_findings")
      .insert(findings);

    if (findingsError) {
      console.warn("Failed to save guardrail findings", findingsError);
    }
  }

  return runId;
}

export async function listGuardrailRuns(
  userId: string,
  limit = 25
): Promise<GuardrailRunSummary[]> {
  const normalizedLimit = Math.max(1, Math.min(limit, 100));
  const supabase = getRunHistoryClient();
  const { data, error } = await supabase
    .from("guardrail_runs")
    .select(
      "id, created_at, source_type, user_task, contains_injection, removed, verdict, risk_level, risk_score, provider, model_used, prompt_strategy, categories, warnings, metadata"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(normalizedLimit);

  if (error) {
    throw normalizeRunHistoryError(error);
  }

  return ((data ?? []) as GuardrailRunRow[]).map(toSummary);
}

export async function getGuardrailRun(
  id: string,
  userId: string
): Promise<GuardrailRunDetail | null> {
  const supabase = getRunHistoryClient();
  const { data, error } = await supabase
    .from("guardrail_runs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw normalizeRunHistoryError(error);
  }

  const { data: findingsData, error: findingsError } = await supabase
    .from("guardrail_findings")
    .select("id, category, severity, evidence, explanation")
    .eq("run_id", id)
    .order("created_at", { ascending: true });

  if (findingsError) {
    throw normalizeRunHistoryError(findingsError);
  }

  const row = data as GuardrailRunRow;

  return {
    ...toSummary(row),
    originalContent: row.original_content,
    sanitizedContent: row.sanitized_content,
    extractedInjection: row.extracted_injection,
    reason: row.reason,
    requestId: row.request_id,
    metadata: row.metadata ?? {},
    findings: ((findingsData ?? []) as GuardrailFindingRow[]).map((finding) => ({
      id: finding.id,
      category: finding.category,
      severity: finding.severity,
      evidence: finding.evidence,
      explanation: finding.explanation
    }))
  };
}
