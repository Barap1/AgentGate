"use client";

import Link from "next/link";
import { useAuthSession } from "@/components/useAuthSession";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthStatus() {
  const { loading, session } = useAuthSession();

  if (loading) {
    return null;
  }

  if (!session) {
    return (
      <Link className="nav-link" href="/login">
        <span className="nav-mark" aria-hidden="true">IN</span>
        Sign in
      </Link>
    );
  }

  return (
    <button
      className="nav-link nav-button"
      onClick={() => getSupabaseBrowserClient().auth.signOut()}
      type="button"
    >
      <span className="nav-mark" aria-hidden="true">OUT</span>
      Sign out
    </button>
  );
}
