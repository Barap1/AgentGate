import "server-only";

import { normalizeRunHistoryError, saveGuardrailRun } from "@/lib/db/runs";
import { sanitizeContent } from "@/lib/guardrail/sanitize";
import type { SanitizeRequest, SanitizeResult } from "@/lib/guardrail/types";
import { validateSanitizeRequest } from "@/lib/utils/validation";

type PipelineOptions = {
  metadata?: Record<string, unknown>;
};

function persistenceWarning(error: unknown) {
  const runHistoryError = normalizeRunHistoryError(error);

  return `${runHistoryError.message} Result was not saved.`;
}

export async function runGuardrailPipeline(
  input: SanitizeRequest,
  options: PipelineOptions = {}
): Promise<SanitizeResult> {
  const sanitizeRequest = validateSanitizeRequest(input);
  const result = await sanitizeContent(sanitizeRequest);

  try {
    const runId = await saveGuardrailRun(result, options.metadata);

    return {
      ...result,
      runId,
      persisted: true
    };
  } catch (persistenceError) {
    console.warn("Failed to persist guardrail run", persistenceError);

    return {
      ...result,
      runId: null,
      persisted: false,
      warnings: [...result.warnings, persistenceWarning(persistenceError)]
    };
  }
}
