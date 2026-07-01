import { NextResponse } from "next/server";
import { listActionDecisions } from "@/lib/db/actionDecisions";
import { listGuardrailRuns, normalizeRunHistoryError } from "@/lib/db/runs";
import { authErrorResponse, requireAuthUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;

  try {
    const user = await requireAuthUser(request);
    const normalizedLimit = Number.isFinite(limit) ? limit : 25;
    const [runs, actionDecisions] = await Promise.all([
      listGuardrailRuns(user.id, normalizedLimit),
      listActionDecisions(user.id, normalizedLimit)
    ]);

    return NextResponse.json({
      runs,
      actionDecisions
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

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
