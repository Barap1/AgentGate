import { NextResponse } from "next/server";
import { runActionGuardPipeline } from "@/lib/action-guard/pipeline";
import type { ActionGuardRequest } from "@/lib/action-guard/types";
import { clientErrorMessage } from "@/lib/guardrail/errors";
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
        decision: "ERROR",
        error: "Malformed JSON request body."
      },
      { status: 400 }
    );
  }

  try {
    const user = await optionalAuthUser(request);
    const result = await runActionGuardPipeline(body as ActionGuardRequest, {
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
          decision: "ERROR",
          error: error.message
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        decision: "ERROR",
        error: clientErrorMessage(error)
      },
      { status: 500 }
    );
  }
}
