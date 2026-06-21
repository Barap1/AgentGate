import { NextResponse } from "next/server";
import { runGuardrailPipeline } from "@/lib/guardrail/pipeline";
import type { SanitizeRequest } from "@/lib/guardrail/types";
import {
  optionalSourceType,
  optionalString,
  optionalUserTask,
  requiredContent,
  requireJsonObject
} from "@/lib/ingest/validation";
import { errorResponse } from "@/lib/utils/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        verdict: "ERROR",
        error: "Malformed JSON request body."
      },
      { status: 400 }
    );
  }

  try {
    const input = requireJsonObject(body);
    const sourceName = optionalString(input.sourceName, "sourceName", 200);
    const externalId = optionalString(input.externalId, "externalId", 200);
    const sanitizeRequest: SanitizeRequest = {
      userTask: optionalUserTask(input.userTask),
      sourceType: optionalSourceType(input.sourceType, "tool_output"),
      content: requiredContent(input.content)
    };
    const result = await runGuardrailPipeline(sanitizeRequest, {
      metadata: {
        ingestion_method: "webhook",
        source_name: sourceName,
        external_id: externalId
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
