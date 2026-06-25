import { NextResponse } from "next/server";
import { clientErrorMessage } from "@/lib/guardrail/errors";
import { runGuardrailPipeline } from "@/lib/guardrail/pipeline";
import type { SanitizeRequest } from "@/lib/guardrail/types";
import { authErrorResponse, optionalAuthUser } from "@/lib/supabase/auth";
import { ValidationError } from "@/lib/utils/validation";

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
    const result = await runGuardrailPipeline(body as SanitizeRequest, {
      userId: user?.id
    });

    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          verdict: "ERROR",
          error: error.message
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        verdict: "ERROR",
        error: clientErrorMessage(error)
      },
      { status: 500 }
    );
  }
}
