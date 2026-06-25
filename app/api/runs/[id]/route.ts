import { NextResponse } from "next/server";
import { getGuardrailRun, normalizeRunHistoryError } from "@/lib/db/runs";
import { authErrorResponse, requireAuthUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      {
        error: "Invalid run id."
      },
      { status: 400 }
    );
  }

  try {
    const user = await requireAuthUser(request);
    const run = await getGuardrailRun(id, user.id);

    if (!run) {
      return NextResponse.json(
        {
          error: "Run not found."
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      run
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
