import "server-only";

import { redactSensitive } from "@/lib/action-guard/detectors";
import type {
  ActionGuardRequest,
  ActionGuardResult
} from "@/lib/action-guard/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizeRunHistoryError } from "@/lib/db/runs";

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
