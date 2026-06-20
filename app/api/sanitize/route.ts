import { NextResponse } from "next/server";
import { sanitizeContent } from "@/lib/guardrail/sanitize";
import {
  validateSanitizeRequest,
  ValidationError
} from "@/lib/utils/validation";

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
    const sanitizeRequest = validateSanitizeRequest(body);
    const result = await sanitizeContent(sanitizeRequest);

    return NextResponse.json(result);
  } catch (error) {
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
        error:
          error instanceof Error
            ? error.message
            : "Unexpected sanitization failure."
      },
      { status: 500 }
    );
  }
}
