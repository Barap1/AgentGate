import "server-only";

import { redactSensitive } from "@/lib/action-guard/detectors";
import type {
  ActionDecision,
  ActionGuardRequest,
  ActionGuardResult,
  ActionType
} from "@/lib/action-guard/types";
import type { RiskLevel } from "@/lib/guardrail/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizeRunHistoryError } from "@/lib/db/runs";

export type ActionDecisionSummary = {
  id: string;
  createdAt: string;
  agentId: string;
  actionType: ActionType;
  toolName: string;
  target: string;
  decision: ActionDecision;
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: string[];
  matchedPolicies: string[];
  requiresHumanApproval: boolean;
};

type ActionDecisionRow = {
  id: string;
  created_at: string;
  agent_id: string;
  action_type: ActionType;
  tool_name: string;
  target: string;
  decision: ActionDecision;
  risk_level: RiskLevel;
  risk_score: number;
  reasons: string[] | null;
  matched_policies: string[] | null;
  requires_human_approval: boolean;
};

function getActionDecisionClient() {
  try {
    return getSupabaseAdmin();
  } catch (error) {
    throw normalizeRunHistoryError(error);
  }
}

function compactMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  );
}

export function actionPayloadPreview(payload: string) {
  return redactSensitive(payload, 500);
}

export function actionTargetPreview(target: string) {
  return redactSensitive(target, 500);
}

function toSummary(row: ActionDecisionRow): ActionDecisionSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    agentId: row.agent_id,
    actionType: row.action_type,
    toolName: row.tool_name,
    target: row.target,
    decision: row.decision,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    reasons: row.reasons ?? [],
    matchedPolicies: row.matched_policies ?? [],
    requiresHumanApproval: row.requires_human_approval
  };
}

export async function saveActionDecision(
  request: ActionGuardRequest,
  result: ActionGuardResult,
  userId?: string
): Promise<string> {
  const supabase = getActionDecisionClient();
  const { data, error } = await supabase
    .from("action_decisions")
    .insert({
      user_id: userId,
      agent_id: result.agentId,
      session_id: result.sessionId,
      trusted_task: request.trustedTask,
      source_type: request.sourceType,
      prior_input_verdict: request.priorInputVerdict,
      prior_input_risk_level: request.priorInputRiskLevel,
      action_type: result.actionType,
      tool_name: result.toolName,
      target: actionTargetPreview(result.target),
      payload_preview: actionPayloadPreview(request.action.payload),
      decision: result.decision,
      risk_level: result.riskLevel,
      risk_score: result.riskScore,
      reasons: result.reasons,
      matched_policies: result.matchedPolicies,
      detected_signals: result.detectedSignals,
      safe_alternative: result.safeAlternative,
      requires_human_approval: result.requiresHumanApproval,
      warnings: result.warnings,
      metadata: compactMetadata(request.action.metadata)
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeRunHistoryError(error);
  }

  return data.id as string;
}

export async function listActionDecisions(
  userId: string,
  limit = 25
): Promise<ActionDecisionSummary[]> {
  const normalizedLimit = Math.max(1, Math.min(limit, 100));
  const supabase = getActionDecisionClient();
  const { data, error } = await supabase
    .from("action_decisions")
    .select(
      "id, created_at, agent_id, action_type, tool_name, target, decision, risk_level, risk_score, reasons, matched_policies, requires_human_approval"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(normalizedLimit);

  if (error) {
    throw normalizeRunHistoryError(error);
  }

  return ((data ?? []) as ActionDecisionRow[]).map(toSummary);
}
