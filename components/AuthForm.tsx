"use client";

import { FormEvent, useState } from "react";
import { useAuthSession } from "@/components/useAuthSession";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm() {
  const { error: authError, loading, session } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function authenticate(mode: "sign-in" | "sign-up") {
    setBusy(true);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const response =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    setMessage(
      mode === "sign-up"
        ? "Account created. Check your email if confirmation is enabled."
        : "Signed in."
    );
  }

  async function authenticateWithProvider(provider: "google" | "github") {
    setBusy(true);
    setMessage(null);

    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/login`
      }
    });

    if (error) {
      setBusy(false);
      setMessage(error.message);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void authenticate("sign-in");
  }

  async function signOut() {
    setBusy(true);
    await getSupabaseBrowserClient().auth.signOut();
    setBusy(false);
    setMessage("Signed out.");
  }

  if (loading) {
    return <p className="auth-message">Checking session...</p>;
  }

  if (authError) {
    return (
      <div className="panel auth-panel">
        <p className="panel-kicker">Account</p>
        <h2>Auth is not configured</h2>
        <p>{authError}</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="panel auth-panel">
        <p className="panel-kicker">Account</p>
        <h2>{session.user.email}</h2>
        <p>Your scans are saved to this account.</p>
        <button
          className="button secondary-button"
          disabled={busy}
          onClick={() => void signOut()}
        >
          Sign out
        </button>
        {message ? <p className="auth-message">{message}</p> : null}
      </div>
    );
  }

  return (
    <form className="panel auth-panel" onSubmit={submit}>
      <p className="panel-kicker">Account</p>
      <h2>Sign in to AgentGate</h2>
      <p>Saved runs are scoped to your Supabase user account.</p>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="form-actions">
        <button className="button primary-button" disabled={busy} type="submit">
          Sign in
        </button>
        <button
          className="button secondary-button"
          disabled={busy}
          onClick={() => void authenticate("sign-up")}
          type="button"
        >
          Create account
        </button>
      </div>
      <div className="auth-divider">
        <span>or continue with</span>
      </div>
      <div className="auth-provider-grid">
        <button
          className="button secondary-button"
          disabled={busy}
          onClick={() => void authenticateWithProvider("google")}
          type="button"
        >
          <span aria-hidden="true" className="provider-mark">
            G
          </span>
          Google
        </button>
        <button
          className="button secondary-button"
          disabled={busy}
          onClick={() => void authenticateWithProvider("github")}
          type="button"
        >
          <span aria-hidden="true" className="provider-mark github-mark">
            GH
          </span>
          GitHub
        </button>
      </div>
      {message ? <p className="auth-message">{message}</p> : null}
    </form>
  );
}
