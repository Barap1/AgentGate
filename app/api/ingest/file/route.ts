import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { runGuardrailPipeline } from "@/lib/guardrail/pipeline";
import { parseTextFileUpload } from "@/lib/ingest/file";
import { authErrorResponse, optionalAuthUser } from "@/lib/supabase/auth";
import { errorResponse } from "@/lib/utils/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let user: User | null;
  let formData: FormData;

  try {
    user = await optionalAuthUser(request);
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return errorResponse(error);
  }

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        verdict: "ERROR",
        error: "Request must be multipart form data."
      },
      { status: 400 }
    );
  }

  try {
    const fileUpload = await parseTextFileUpload(formData);
    const result = await runGuardrailPipeline(
      {
        userTask: fileUpload.userTask,
        sourceType: fileUpload.sourceType,
        content: fileUpload.content
      },
      {
        metadata: {
          ingestion_method: "file",
          filename: fileUpload.filename,
          file_size: fileUpload.fileSize,
          content_type: fileUpload.contentType
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
