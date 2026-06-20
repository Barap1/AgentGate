import { NextResponse } from "next/server";
import { listGuardrailRuns } from "@/lib/db/runs";

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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Run history is unavailable."
      },
      { status: 500 }
    );
  }
}
