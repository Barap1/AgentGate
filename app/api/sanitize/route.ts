import { NextResponse } from "next/server";
import { sanitizeContent } from "@/lib/guardrail/sanitize";
import {
  validateSanitizeRequest,
  ValidationError
} from "@/lib/utils/validation";

export const runtime = "nodejs";

function clientErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected sanitization failure.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("api key") ||
    lowerMessage.includes("no usable guardrail provider")
  ) {
    return "No LLM provider API key configured. Add one to `.env.local`.";
  }

  if (
    lowerMessage.includes("quota") ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("rate")
  ) {
    return "Provider rate limit exceeded. Wait and retry, reduce input size, or switch providers.";
  }

  if (
    lowerMessage.includes("unavailable") ||
    lowerMessage.includes("overloaded") ||
    lowerMessage.includes("capacity")
  ) {
    return "Provider is temporarily unavailable. Wait and retry, reduce input size, or switch providers.";
  }

  return message;
}

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
        error: clientErrorMessage(error)
      },
      { status: 500 }
    );
  }
}
