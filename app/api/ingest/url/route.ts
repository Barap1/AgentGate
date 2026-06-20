import { NextResponse } from "next/server";
import { clientErrorMessage } from "@/lib/guardrail/errors";
import { runGuardrailPipeline } from "@/lib/guardrail/pipeline";
import { fetchPublicUrlText } from "@/lib/ingest/urlFetch";
import {
  optionalUserTask,
  requiredString,
  requireJsonObject
} from "@/lib/ingest/validation";
import { ValidationError } from "@/lib/utils/validation";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
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
    const rawUrl = requiredString(input.url, "url", 2048).trim();
    const fetched = await fetchPublicUrlText(rawUrl);
    const result = await runGuardrailPipeline(
      {
        userTask: optionalUserTask(input.userTask),
        sourceType: "webpage",
        content: fetched.content
      },
      {
        metadata: {
          ingestion_method: "url",
          url: rawUrl,
          final_url: fetched.finalUrl,
          title: fetched.title,
          content_type: fetched.contentType,
          bytes_read: fetched.bytesRead
        }
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
