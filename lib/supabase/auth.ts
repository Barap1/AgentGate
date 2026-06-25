import "server-only";

import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export class AuthRequiredError extends Error {
  constructor() {
    super("Sign in to save and view guardrail runs.");
    this.name = "AuthRequiredError";
  }
}

export async function requireAuthUser(request: Request): Promise<User> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    throw new AuthRequiredError();
  }

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);

  if (error || !data.user) {
    throw new AuthRequiredError();
  }

  return data.user;
}

export async function optionalAuthUser(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization");

  if (!header) {
    return null;
  }

  return requireAuthUser(request);
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  return null;
}
