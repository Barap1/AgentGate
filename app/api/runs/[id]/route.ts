import { NextResponse } from "next/server";
import { getGuardrailRun } from "@/lib/db/runs";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
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
    const run = await getGuardrailRun(id);

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
