import { NextResponse } from "next/server";
import { runGuardrailPipeline } from "@/lib/guardrail/pipeline";
import { fetchPublicUrlText } from "@/lib/ingest/urlFetch";
import {
  optionalUserTask,
  requiredString,
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
        },
        userId: user?.id
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return errorResponse(error);
  }
}
