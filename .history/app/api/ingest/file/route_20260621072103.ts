import { NextResponse } from "next/server";
import { runGuardrailPipeline } from "@/lib/guardrail/pipeline";
import { parseTextFileUpload } from "@/lib/ingest/file";
import { errorResponse } from "@/lib/utils/api";

export const runtime = "nodejs";

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
