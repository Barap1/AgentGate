"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
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
        <LogIn aria-hidden="true" size={15} strokeWidth={2.1} />
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
      <LogOut aria-hidden="true" size={15} strokeWidth={2.1} />
      Sign out
    </button>
  );
}
