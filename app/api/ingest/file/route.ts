import { NextResponse } from "next/server";
import { clientErrorMessage } from "@/lib/guardrail/errors";
import { runGuardrailPipeline } from "@/lib/guardrail/pipeline";
import { parseTextFileUpload } from "@/lib/ingest/file";
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
  let formData: FormData;

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
        }
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
