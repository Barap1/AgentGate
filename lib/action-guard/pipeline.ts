import "server-only";

import { evaluateActionGuard } from "@/lib/action-guard/evaluate";
import type {
  ActionGuardRequest,
  ActionGuardResult
} from "@/lib/action-guard/types";
import { validateActionGuardRequest } from "@/lib/action-guard/validation";
import { saveActionDecision } from "@/lib/db/actionDecisions";
import { normalizeRunHistoryError } from "@/lib/db/runs";

type PipelineOptions = {
  userId?: string;
};

function persistenceWarning(error: unknown) {
  const runHistoryError = normalizeRunHistoryError(error);

  return `${runHistoryError.message} Action decision was not saved.`;
}

export async function runActionGuardPipeline(
  input: ActionGuardRequest,
  options: PipelineOptions = {}
): Promise<ActionGuardResult> {
  const request = validateActionGuardRequest(input);
  const result = evaluateActionGuard(request);

  if (!options.userId) {
    return result;
  }

  try {
    const actionDecisionId = await saveActionDecision(
      request,
      result,
      options.userId
    );

    return {
      ...result,
      actionDecisionId,
      persisted: true
    };
  } catch (persistenceError) {
    console.warn("Failed to persist action decision", persistenceError);

    return {
      ...result,
      warnings: [...result.warnings, persistenceWarning(persistenceError)]
    };
  }
}
