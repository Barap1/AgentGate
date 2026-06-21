import { NextResponse } from "next/server";
import { clientErrorMessage } from "@/lib/guardrail/errors";
import { ValidationError } from "@/lib/utils/validation";

export function errorResponse(error: unknown) {
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
