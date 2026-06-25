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
import { authErrorResponse, optionalAuthUser } from "@/lib/supabase/auth";
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
    const user = await optionalAuthUser(request);
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
      },
      userId: user?.id
    });

    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return errorResponse(error);
  }
}
