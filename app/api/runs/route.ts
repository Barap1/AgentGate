import { NextResponse } from "next/server";
import { listGuardrailRuns, normalizeRunHistoryError } from "@/lib/db/runs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;

  try {
    const runs = await listGuardrailRuns(Number.isFinite(limit) ? limit : 25);

    return NextResponse.json({
      runs
    });
  } catch (error) {
    const runHistoryError = normalizeRunHistoryError(error);

    return NextResponse.json(
      {
        error: runHistoryError.message,
        code: runHistoryError.code
      },
      { status: runHistoryError.status }
    );
  }
}
